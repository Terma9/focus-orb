// Windows the orb never looks at, in either mode: no screenshot, no title sent, never counted as a drift.
// Pure, unit-tested.

const PRIVATE_APPS = /^(1password|bitwarden|keepass|keepassxc|lastpass|dashlane|keeper|enpass|protonpass|proton pass|nordpass|roboform)$/i;
const PRIVATE_BROWSING = /\b(inprivate|incognito|private browsing)\b/i;
const BANKING = /\b(online[- ]?banking|banking|bank|paypal|sparkasse|volksbank|commerzbank|deutsche bank|n26|revolut|ing-diba|tax return|steuererklärung|elster)\b/i;

// -> null, or a short reason ("password manager", "private window", "banking")
function sensitiveReason(win) {
  if (!win) return null;
  if (PRIVATE_APPS.test(win.app || '')) return 'password manager';
  const title = win.title || '';
  if (PRIVATE_BROWSING.test(title)) return 'private window';
  if (BANKING.test(title)) return 'banking';
  if (/password manager|passwort-manager|\bvault\b/i.test(title)) return 'password manager';
  return null;
}

module.exports = { sensitiveReason };
