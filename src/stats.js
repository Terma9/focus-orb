// Per-Pomodoro statistics for the summary card. Pure logic, unit-tested.
//
// A drift lasts from the first distracted check of the streak until "Back to work".
// Drifts the user marks as "This is work" don't count. Focus score = 1 - drifted time / focus time.

class SessionStats {
  constructor() {
    this.start(0);
  }

  start(now) {
    this.startedAt = now;
    this.drifts = [];
    this.open = null;
  }

  // The orb popped out. `since` = when the distraction started (first distracted check).
  alertStarted(since, label) {
    this.open = { since, label };
  }

  // The user clicked "Back to work" (asWork = false) or "This is work" (asWork = true).
  alertEnded(now, asWork = false) {
    if (!this.open) return;
    if (!asWork) this.drifts.push({ label: this.open.label, ms: Math.max(0, now - this.open.since) });
    this.open = null;
  }

  summary(now) {
    if (this.open) this.alertEnded(now); // Pomodoro ended mid-alert: count it
    const focusMs = Math.max(1, now - this.startedAt);
    const driftMs = Math.min(focusMs, this.drifts.reduce((a, d) => a + d.ms, 0));
    // Merge drifts to the same place, longest first.
    const byLabel = new Map();
    for (const d of this.drifts) byLabel.set(d.label, (byLabel.get(d.label) || 0) + d.ms);
    const top = [...byLabel].map(([label, ms]) => ({ label, ms })).sort((a, b) => b.ms - a.ms);
    return {
      focusMinutes: Math.round(focusMs / 60_000),
      score: Math.round(100 * (1 - driftMs / focusMs)),
      driftCount: this.drifts.length,
      driftMs,
      top: top.slice(0, 3),
    };
  }
}

// "YouTube", "Reddit", "Code" — a short, friendly name for a window, for the summary card.
function shortLabel(win) {
  if (!win) return 'something else';
  const parts = win.title.split(/\s+[-–—|]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2]; // "Video - YouTube - Google Chrome" -> "YouTube"
  if (parts.length === 2) return parts[0];
  return parts[0] || win.app || 'something else';
}

module.exports = { SessionStats, shortLabel };
