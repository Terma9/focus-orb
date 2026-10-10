// Which window is the user looking at? Returns { title, app, pid } (app = exe name without ".exe"), or null.
// Windows only; elsewhere this returns null and the orb relies on screenshots alone.

let api = null;

function load() {
  if (api !== null) return api;
  api = false;
  if (process.platform !== 'win32') return api;
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    api = {
      GetForegroundWindow: user32.func('void* __stdcall GetForegroundWindow()'),
      GetWindowTextW: user32.func('int __stdcall GetWindowTextW(void* hWnd, _Out_ uint16_t* buf, int max)'),
      GetWindowThreadProcessId: user32.func('uint32_t __stdcall GetWindowThreadProcessId(void* hWnd, _Out_ uint32_t* pid)'),
      OpenProcess: kernel32.func('void* __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'),
      QueryFullProcessImageNameW: kernel32.func('bool __stdcall QueryFullProcessImageNameW(void* h, uint32_t flags, _Out_ uint16_t* buf, _Inout_ uint32_t* size)'),
      CloseHandle: kernel32.func('bool __stdcall CloseHandle(void* h)'),
    };
  } catch (e) {
    console.warn('Active-window detection unavailable:', e.message);
  }
  return api;
}

function getForegroundWindow() {
  const w = load();
  if (!w) return null;
  try {
    const hwnd = w.GetForegroundWindow();
    if (!hwnd) return null;

    const titleBuf = Buffer.alloc(1024);
    const len = w.GetWindowTextW(hwnd, titleBuf, 512);
    const title = titleBuf.toString('utf16le', 0, len * 2);

    const pid = [0];
    w.GetWindowThreadProcessId(hwnd, pid);
    let app = '';
    const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    const h = w.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid[0]);
    if (h) {
      const pathBuf = Buffer.alloc(2048);
      const size = [1024];
      if (w.QueryFullProcessImageNameW(h, 0, pathBuf, size)) {
        app = pathBuf.toString('utf16le', 0, size[0] * 2).split('\\').pop().replace(/\.exe$/i, '');
      }
      w.CloseHandle(h);
    }
    return { title, app, pid: pid[0] };
  } catch (e) {
    return null;
  }
}

module.exports = { getForegroundWindow };
