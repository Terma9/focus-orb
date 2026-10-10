// The rules for *when* the orb pops out. Pure logic (no Electron, no timers), so it's unit-tested.
//
//  - A check counts as distracted when p(distracted) >= threshold.
//  - The alert starts only after `confirmChecks` distracted checks in a row
//    AND more than `graceMs` since the first of them.
//  - Any non-distracted check resets the streak, but never ends a running alert:
//    only the user (dismiss) does that.
//  - After a dismiss there's a short snooze to actually switch back.
//  - While the alert is up, the line is refreshed every `renagMs`.

class DriftTracker {
  constructor({ threshold, confirmChecks, graceMs, renagMs, snoozeMs }) {
    Object.assign(this, { threshold, confirmChecks, graceMs, renagMs, snoozeMs });
    this.reset();
  }

  reset() {
    this.drifting = false;
    this.offSince = null;
    this.offCount = 0;
    this.lastNagAt = 0;
    this.snoozeUntil = 0;
  }

  // Feed one verdict. Returns what the app should do: { distracted, alert, renag }.
  verdict(pDistracted, capturedAt, now) {
    const distracted = pDistracted >= this.threshold;
    if (!distracted) {
      this.offSince = null;
      this.offCount = 0;
      return { distracted, alert: false, renag: false };
    }
    this.offCount++;
    if (this.offSince === null) this.offSince = capturedAt;
    if (now < this.snoozeUntil) return { distracted, alert: false, renag: false };

    if (!this.drifting && now - this.offSince > this.graceMs && this.offCount >= this.confirmChecks) {
      this.drifting = true;
      this.lastNagAt = now;
      return { distracted, alert: true, renag: false };
    }
    if (this.drifting && now - this.lastNagAt > this.renagMs) {
      this.lastNagAt = now;
      return { distracted, alert: false, renag: true };
    }
    return { distracted, alert: false, renag: false };
  }

  dismiss(now) {
    this.reset();
    this.snoozeUntil = now + this.snoozeMs;
  }

  // Normally check every checkMs; once a streak starts, re-check exactly when the grace window ends.
  nextDelay(checkMs, startedAt, now) {
    let next = checkMs - (now - startedAt);
    if (this.offSince !== null && !this.drifting) next = Math.min(next, this.offSince + this.graceMs + 150 - now);
    return Math.max(0, next);
  }
}

module.exports = { DriftTracker };
