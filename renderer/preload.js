const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orb', {
  start: (task) => ipcRenderer.send('start', task),
  dismiss: () => ipcRenderer.send('dismiss'),
  markWork: () => ipcRenderer.send('work'),
  closeSummary: () => ipcRenderer.send('summary-close'),
  setKey: (key) => ipcRenderer.send('set-key', key),
  runDemo: () => ipcRenderer.send('run-demo'),
  setMode: (mode) => ipcRenderer.send('set-mode', mode),
  showNotice: () => ipcRenderer.send('show-notice'),
  noticeHeight: (h) => ipcRenderer.send('notice-height', h),
  menu: () => ipcRenderer.send('menu'),
  alertReady: () => ipcRenderer.send('alert-ready'),
  alertExited: () => ipcRenderer.send('alert-exited'),
  captureMouse: (on) => ipcRenderer.send('capture-mouse', on),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  onCursor: (cb) => ipcRenderer.on('cursor', (_e, p) => cb(p)),
});
