/**
 * Web Notification & Audio Alert Engine
 * Handles browser push permissions, synthesized audio chimes, and native OS notifications.
 */

export async function requestWebNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      playChime("success");
      showWebPushNotification({
        title: "Crazy Printing Center",
        body: "Web Notifications are now ACTIVE! You will receive live alerts for your print jobs & orders.",
      });
    }
    return permission;
  } catch (err) {
    console.warn("Notification permission error:", err);
    return "denied";
  }
}

export function playChime(type = "info") {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Pleasant cheerful 3-tone arpeggio (C5 -> E5 -> G5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "alert") {
      // Attention bell chime (A5 -> D6)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880.0, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Soft modern blip
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // AudioContext blocked before first user gesture
  }
}

export function showWebPushNotification({ title, body, url, icon = "/icon.png" }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title || "Crazy Printing Center", {
      body: body || "You have a new live print update.",
      icon: icon,
      badge: icon,
      tag: "crazy-printing-" + Date.now(),
    });

    notification.onclick = function (e) {
      e.preventDefault();
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notification.close();
    };
  } catch (err) {
    console.warn("Push notification display error:", err);
  }
}
