/* audio.js — a tiny original chiptune engine (Web Audio, no files). Looping
 * square-wave melodies + triangle bass for the overworld and battle, plus SFX
 * (hit, crit, encounter jingle, catch fanfare, level-up, faint). ON by default;
 * toggle under START → OPTIONS (persisted). Browsers need a user gesture to
 * start audio, so the first key/tap resumes the context.
 *
 * All tunes are original (not anyone's copyrighted music).
 */
window.EH_AUDIO = (function () {
  "use strict";
  var ctx = null, master = null, enabled = false, started = false, timer = null, track = "overworld";

  function ensure() {
    if (ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.15; master.connect(ctx.destination);
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

  var N = { 0: 0, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0 };

  // [note, beats] — original loops. overworld = cheery; battle = driving/tense.
  var TRACKS = {
    overworld: { bpm: 138, mel: [
      ["E5", 1], ["G5", 1], ["A5", 1], ["G5", 1], ["E5", 1], ["D5", 1], ["C5", 2],
      ["D5", 1], ["E5", 1], ["G5", 1], ["E5", 1], ["D5", 2], [0, 2],
      ["C5", 1], ["E5", 1], ["G5", 1], ["A5", 1], ["G5", 1], ["F5", 1], ["E5", 2],
      ["D5", 1], ["C5", 1], ["D5", 1], ["E5", 1], ["C5", 2], [0, 2]
    ], bass: [["A3", 1], ["A3", 1], ["F3", 1], ["F3", 1], ["C4", 1], ["C4", 1], ["G3", 1], ["G3", 1],
      ["A3", 1], ["A3", 1], ["E3", 1], ["E3", 1], ["F3", 1], ["F3", 1], ["G3", 1], ["G3", 1]] },
    battle: { bpm: 168, mel: [
      ["A4", 0.5], ["A4", 0.5], ["C5", 0.5], ["A4", 0.5], ["E5", 1], ["D5", 1],
      ["A4", 0.5], ["A4", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 1], ["F5", 1],
      ["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["B4", 0.5], ["A4", 1], ["E5", 1],
      ["F5", 0.5], ["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["B4", 1], ["A4", 1]
    ], bass: [["A3", 0.5], ["A3", 0.5], ["A3", 0.5], ["E3", 0.5], ["F3", 0.5], ["F3", 0.5], ["C4", 0.5], ["C4", 0.5],
      ["A3", 0.5], ["A3", 0.5], ["A3", 0.5], ["E3", 0.5], ["E3", 0.5], ["E3", 0.5], ["A3", 0.5], ["A3", 0.5]] }
  };
  var mi = 0, bi = 0, nextM = 0, nextB = 0;

  function schedule() {
    if (!ctx || !enabled) return;
    var T = TRACKS[track] || TRACKS.overworld, beat = 60 / T.bpm, horizon = ctx.currentTime + 0.25;
    while (nextM < horizon) { var m = T.mel[mi % T.mel.length]; tone(N[m[0]], nextM, beat * m[1] * 0.92, "square", 0.13); nextM += beat * m[1]; mi++; }
    while (nextB < horizon) { var b = T.bass[bi % T.bass.length]; tone(N[b[0]], nextB, beat * b[1] * 0.9, "triangle", 0.17); nextB += beat * b[1]; bi++; }
  }
  function startMusic() {
    if (!ctx) return;
    nextM = nextB = ctx.currentTime + 0.06; mi = bi = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(schedule, 60);
  }
  function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }
  function setTrack(name) { if (name === track) return; track = name; if (enabled) startMusic(); }

  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem("eh_sound", on ? "1" : "0"); } catch (e) {}
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (enabled) startMusic(); else stopMusic();
  }
  function toggle() { setEnabled(!enabled); return enabled; }

  function seq(notes, t0, gap, dur, type, vol) { notes.forEach(function (f, i) { tone(f, t0 + i * gap, dur, type, vol); }); }
  function sfx(kind) {
    if (!ctx || !enabled) return;
    var t = ctx.currentTime;
    if (kind === "select") tone(700, t, 0.05, "square", 0.16);
    else if (kind === "hit") { tone(200, t, 0.07, "sawtooth", 0.2); tone(130, t + 0.02, 0.08, "square", 0.16); }
    else if (kind === "crit") { tone(320, t, 0.05, "square", 0.22); tone(480, t + 0.04, 0.08, "square", 0.2); }
    else if (kind === "encounter") seq([392, 523, 659, 392, 523, 784], t, 0.07, 0.09, "square", 0.18); // a wild appeared!
    else if (kind === "catch") { seq([523, 659, 784, 1046], t, 0.09, 0.11, "square", 0.2); seq([392, 523, 659], t + 0.42, 0.1, 0.18, "triangle", 0.16); } // fanfare
    else if (kind === "faint") { seq([440, 415, 392, 349], t, 0.17, 0.21, "triangle", 0.16); tone(330, t + 0.68, 0.24, "triangle", 0.15); tone(262, t + 0.92, 0.7, "triangle", 0.14); } // a sad little defeat tune
    else if (kind === "level") seq([659, 784, 988, 1318], t, 0.07, 0.13, "square", 0.18);
  }

  // resume audio on the first user gesture; ON by default (unless turned off)
  function kick() {
    if (started) return; started = true;
    var saved; try { saved = localStorage.getItem("eh_sound"); } catch (e) {}
    setEnabled(saved !== "0");   // default ON
  }
  window.addEventListener("keydown", kick);
  window.addEventListener("pointerdown", kick);

  return { setEnabled: setEnabled, toggle: toggle, sfx: sfx, setTrack: setTrack, isEnabled: function () { return enabled; }, kick: kick };
})();
