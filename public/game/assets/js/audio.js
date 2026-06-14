/* audio.js — a tiny original chiptune engine (Web Audio, no files). A looping
 * square-wave melody + triangle bass, plus a few SFX. Off by default; toggle it
 * in the START menu under OPTIONS (persisted). Browsers require a user gesture
 * to start audio, so the first key/tap resumes the context.
 *
 * The tune is original (not anyone's copyrighted music) — a cheery 8-bit loop.
 */
window.EH_AUDIO = (function () {
  "use strict";
  var ctx = null, master = null, enabled = false, started = false, timer = null;

  function ensure() {
    if (ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function tone(freq, t, dur, type, vol) {
    if (!ctx || !freq) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }

  // note table + an original, loopable melody/bass (freq, beats)
  var N = { 0: 0, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0 };
  var MELODY = [
    ["E5", 1], ["G5", 1], ["A5", 1], ["G5", 1], ["E5", 1], ["D5", 1], ["C5", 2],
    ["D5", 1], ["E5", 1], ["G5", 1], ["E5", 1], ["D5", 2], [0, 2],
    ["C5", 1], ["E5", 1], ["G5", 1], ["A5", 1], ["G5", 1], ["F5", 1], ["E5", 2],
    ["D5", 1], ["C5", 1], ["D5", 1], ["E5", 1], ["C5", 2], [0, 2]
  ];
  var BASS = [
    ["A3", 1], ["A3", 1], ["F3", 1], ["F3", 1], ["C3", 1], ["C3", 1], ["G3", 1], ["G3", 1],
    ["A3", 1], ["A3", 1], ["E3", 1], ["E3", 1], ["F3", 1], ["F3", 1], ["G3", 1], ["G3", 1]
  ];
  var beat = 60 / 138, mi = 0, bi = 0, nextM = 0, nextB = 0;

  function schedule() {
    if (!ctx || !enabled) return;
    var horizon = ctx.currentTime + 0.25;
    while (nextM < horizon) {
      var m = MELODY[mi % MELODY.length];
      tone(N[m[0]], nextM, beat * m[1] * 0.92, "square", 0.14);
      nextM += beat * m[1]; mi++;
    }
    while (nextB < horizon) {
      var b = BASS[bi % BASS.length];
      tone(N[b[0]], nextB, beat * 0.9, "triangle", 0.18);
      nextB += beat; bi++;
    }
  }
  function startMusic() {
    if (!ctx) return;
    nextM = nextB = ctx.currentTime + 0.06; mi = bi = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(schedule, 60);
  }
  function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }

  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem("eh_sound", on ? "1" : "0"); } catch (e) {}
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (enabled) startMusic(); else stopMusic();
  }
  function toggle() { setEnabled(!enabled); return enabled; }

  function sfx(kind) {
    if (!ctx || !enabled) return;
    var t = ctx.currentTime;
    if (kind === "select") tone(700, t, 0.05, "square", 0.18);
    else if (kind === "hit") { tone(200, t, 0.07, "sawtooth", 0.22); tone(130, t + 0.02, 0.08, "square", 0.18); }
    else if (kind === "crit") { tone(300, t, 0.05, "square", 0.22); tone(450, t + 0.04, 0.07, "square", 0.2); }
    else if (kind === "catch") { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, t + i * 0.08, 0.1, "square", 0.18); }); }
    else if (kind === "faint") { tone(330, t, 0.25, "triangle", 0.2); tone(196, t + 0.12, 0.35, "triangle", 0.16); }
    else if (kind === "level") { [659, 784, 988].forEach(function (f, i) { tone(f, t + i * 0.06, 0.12, "square", 0.18); }); }
  }

  // resume audio on the first user gesture; honour the saved preference
  function kick() {
    if (started) return; started = true;
    var saved; try { saved = localStorage.getItem("eh_sound"); } catch (e) {}
    setEnabled(saved === "1");
  }
  window.addEventListener("keydown", kick);
  window.addEventListener("pointerdown", kick);

  return { setEnabled: setEnabled, toggle: toggle, sfx: sfx, isEnabled: function () { return enabled; }, kick: kick };
})();
