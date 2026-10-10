/* =====================================================================
 posgraph-core.js  \u2014  Position Graphs & Motion Diagrams tutorial
 Shared engine for posgraph-st1.js \u2026 posgraph-st5.js. Load this file first.

 Page contract (same pattern as the Kirchhoff / motion-diagram tutorials):
   <div id="ctRoot$thisq"></div>, <div id="ct2Root$thisq" style="display:none"></div> \u2026
   <script>window.ctThisq = '$thisq';</script>
 Each stage fires document 'ctStageComplete' {detail:{stage, thisq}} and calls
 window['ctOnStageComplete_' + thisq](stage) if that hook exists.

 Optional configuration (set BEFORE the scripts load):
   window['pgConfig_' + thisq] = {
     momSubmit: true,                        // write results into MOM answer boxes
     lockBoxes: true,                        // make those boxes read-only for students
     answerMap: { score:'001', percent:'002' } // result field -> 3-digit box number
   };
   Result fields: score (first-try correct), total, percent, attempts, stages

 Stage config modes:
   mode 'explore': scenarios [{label, desc, phases:[{x,v,a}]}] + questions
   mode 'match'  : targets [{label, times:[t0,\u2026], phases:[{x,v,a},\u2026]}],
                   showTargetDiagram (bool), targetFull (bool)
 ===================================================================== */
(function(){
'use strict';
if (window.PosGraph && window.PosGraph.mount) return;

var TOTAL = 5;
var STAGE_NAMES = ['Constant velocity', 'Changing velocity', 'Match the motion', 'Match the graph', 'Three-phase graph'];
var FONT_SIZES = ['15px', '17px', '20px'];
var EPS = 1e-6, SQ = '\u00B2', MINUS = '\u2212';
var T_END = 10, XMIN = -40, XMAX = 60, GHOST_DT = 1;
var SL = {
  x: { min: -40, max: 60, step: 1, unit: 'm', label: 'x<sub>i</sub>', name: 'starting position', dec: 0 },
  v: { min: -25, max: 25, step: 1, unit: 'm/s', label: 'v<sub>i</sub>', name: 'starting velocity', dec: 0 },
  a: { min: -5, max: 5, step: 0.5, unit: 'm/s' + SQ, label: 'a', name: 'acceleration', dec: 1 }
};

/* ---------- helpers ---------- */
function fmt(n, d) {
  if (d == null) d = 2;
  var s = Number(n).toFixed(d);
  if (parseFloat(s) === 0) s = (0).toFixed(d);
  return s.replace('-', MINUS);
}
function strip(h) { return String(h).replace(/<[^>]*>/g, ''); }
function choiceText(c) { return typeof c === 'string' ? c : c.t; }
function pad3(c) { c = String(c); while (c.length < 3) c = '0' + c; return c; }
function shared(thisq) {
  var k = 'pgShared_' + thisq;
  if (!window[k]) window[k] = { a11y: { lm:false, nr:true, hc:false, fs:0 }, stages: {}, items: {}, done: {}, finished: false };
  return window[k];
}
function refreshAll(sh) { for (var k in sh.stages) if (sh.stages.hasOwnProperty(k)) sh.stages[k](); }
function getConfig(thisq) { return window['pgConfig_' + thisq] || window.pgConfig || {}; }

/* ---------- kinematics: piecewise constant-acceleration phases ---------- */
function mkPhases(times, params) {
  return params.map(function(p, i){
    return { t0: times[i], t1: i + 1 < times.length ? times[i + 1] : T_END, x: p.x, v: p.v, a: p.a };
  });
}
function state(ph, t) {
  var k = 0;
  for (var i = 0; i < ph.length; i++) if (t >= ph[i].t0 - 1e-9) k = i;
  var p = ph[k], d = t - p.t0;
  return { x: p.x + p.v*d + 0.5*p.a*d*d, v: p.v + p.a*d, a: p.a, k: k };
}
function phaseEnd(p) { var d = p.t1 - p.t0; return { x: p.x + p.v*d + 0.5*p.a*d*d, v: p.v + p.a*d }; }
function trend(v, a) {
  if (Math.abs(v) < 1e-4) return { txt: 'momentarily at rest', cls: 'pgbrest' };
  var dir = v > 0 ? 'moving right' : 'moving left';
  if (Math.abs(a) < EPS) return { txt: dir + ', constant speed', cls: 'pgbconst' };
  return v*a > 0 ? { txt: dir + ', speeding up', cls: 'pgbup' } : { txt: dir + ', slowing down', cls: 'pgbdown' };
}
function shapeText(ph) {
  return ph.map(function(p, i){
    var pre = ph.length > 1 ? 'Phase ' + (i + 1) + ' (t = ' + p.t0 + ' to ' + p.t1 + ' s): ' : '';
    if (Math.abs(p.a) < EPS) {
      return pre + (Math.abs(p.v) < EPS ? 'flat horizontal line' : 'straight line ' + (p.v > 0 ? 'rising' : 'falling'));
    }
    var s = pre + 'curve bending ' + (p.a > 0 ? 'upward' : 'downward'), tv = p.t0 - p.v/p.a;
    if (tv > p.t0 + 1e-6 && tv < p.t1 - 1e-6) s += ', with a turning point at t = ' + fmt(tv, 1) + ' s';
    else s += ', ' + ((p.v + p.a*(p.t1 - p.t0)/2)*p.a > 0 ? 'getting steeper' : 'getting less steep');
    return s;
  }).join('; ') + '.';
}

/* =====================================================================
 MOUNT A STAGE
 ===================================================================== */
function mount(cfg) {
  var thisq = String(window.ctThisq);
  var rootId = (cfg.stage === 1 ? 'ctRoot' : 'ct' + cfg.stage + 'Root') + thisq;
  function start() { var host = document.getElementById(rootId); if (host) build(cfg, thisq, host); }
  if (document.getElementById(rootId)) start(); else document.addEventListener('DOMContentLoaded', start);
}

function build(cfg, thisq, host) {
  var sh = shared(thisq), A = sh.a11y, C = getConfig(thisq);
  var P = 'pg' + cfg.stage;
  function id(n) { return P + n + thisq; }
  function $(n) { return document.getElementById(id(n)); }
  var match = cfg.mode === 'match';
  var nPh = match ? cfg.targets[0].phases.length : 1;
  var S = { t: 0, playing: false, opt: 0, tgt: 0, tan: false, table: false, raf: 0, last: null, sig: '', vals: [] };
  var stepDt = cfg.stepDt || 0.5, rate = cfg.rate || 1;

  /* ----- items (questions + targets) for scoring ----- */
  function itemKey(s) { return cfg.stage + '.' + s; }
  function regItem(k) { if (!sh.items[k]) sh.items[k] = { stage: cfg.stage, first: null, attempts: 0, solved: false }; }
  if (match) {
    cfg.targets.forEach(function(tg, i){
      regItem(itemKey('T' + (i + 1)));
      S.vals.push(tg.phases.map(function(){ return { x: 0, v: 0, a: 0 }; }));
    });
  }
  (cfg.questions || []).forEach(function(q){ regItem(itemKey(q.id)); });

  /* ----- current objects ----- */
  function objPh() { return mkPhases([0], cfg.scenarios[S.opt].phases); }
  function tgtPh() { var tg = cfg.targets[S.tgt]; return mkPhases(tg.times, tg.phases); }
  function yourPh() { return mkPhases(cfg.targets[S.tgt].times, S.vals[S.tgt]); }
  function solved(i) { return sh.items[itemKey('T' + (i + 1))].solved; }

  /* ----- graph geometry ----- */
  var GW = 880, GH = 372, L = 92, R = 782, T = 16, B = 326;
  function gx(t) { return L + t*(R - L)/T_END; }
  function gy(x) { return B - (x - XMIN)*(B - T)/(XMAX - XMIN); }
  function graphStatic() {
    var s = '<defs><clipPath id="' + id('Clip') + '"><rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '"/></clipPath></defs>';
    s += '<rect class="pgplot" x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '"/>';
    for (var t = 0; t <= T_END; t++) {
      s += '<line class="pggrid" x1="' + gx(t) + '" y1="' + T + '" x2="' + gx(t) + '" y2="' + B + '"/>';
      s += '<text class="pgticklab" x="' + gx(t) + '" y="' + (B + 22) + '">' + t + '</text>';
    }
    for (var x = XMIN; x <= XMAX; x += 10) {
      s += '<line class="' + (x === 0 ? 'pgzero' : 'pggrid') + '" x1="' + L + '" y1="' + gy(x) + '" x2="' + R + '" y2="' + gy(x) + '"/>';
      s += '<text class="pgticklab" x="' + (L - 10) + '" y="' + (gy(x) + 5) + '" text-anchor="end">' + fmt(x, 0) + '</text>';
    }
    s += '<line class="pgaxis" x1="' + L + '" y1="' + B + '" x2="' + (R + 22) + '" y2="' + B + '"/>'
       + '<polygon class="pgaxishead" points="' + (R + 34) + ',' + B + ' ' + (R + 22) + ',' + (B - 6) + ' ' + (R + 22) + ',' + (B + 6) + '"/>'
       + '<line class="pgaxis" x1="' + L + '" y1="' + B + '" x2="' + L + '" y2="' + (T - 4) + '"/>'
       + '<text class="pgaxlab" x="' + (R + 40) + '" y="' + (B + 6) + '" text-anchor="start">t (s)</text>'
       + '<text class="pgaxlab" text-anchor="middle" x="26" y="' + ((T + B)/2) + '" transform="rotate(-90 26 ' + ((T + B)/2) + ')">x (m)</text>';
    return s;
  }
  function curve(ph, tDraw, cls) {
    var s = '';
    ph.forEach(function(p){
      var te = Math.min(p.t1, tDraw);
      if (te <= p.t0 + 1e-9) return;
      var pts = [];
      for (var t = p.t0; t < te; t += 0.05) pts.push(gx(t).toFixed(1) + ',' + gy(state([p], t).x).toFixed(1));
      var e = phaseEnd({ t0: p.t0, t1: te, x: p.x, v: p.v, a: p.a });
      pts.push(gx(te).toFixed(1) + ',' + gy(e.x).toFixed(1));
      s += '<polyline class="' + cls + '" points="' + pts.join(' ') + '"/>';
    });
    return s;
  }
  function gdots(ph, tDraw, cls) {
    var s = '';
    for (var k = 0; k*GHOST_DT <= tDraw + 1e-6; k++) {
      var st = state(ph, k*GHOST_DT);
      s += '<circle class="' + cls + '" cx="' + gx(k*GHOST_DT).toFixed(1) + '" cy="' + gy(st.x).toFixed(1) + '" r="3.5"/>';
    }
    return s;
  }
  function nowDot(ph, t, cls) {
    var st = state(ph, t);
    return '<circle class="' + cls + '" cx="' + gx(t).toFixed(1) + '" cy="' + gy(st.x).toFixed(1) + '" r="6.5"/>';
  }
  function tangent(ph, t) {
    var st = state(ph, t), h = 1.6;
    var s = '<line class="pgtan" x1="' + gx(t - h).toFixed(1) + '" y1="' + gy(st.x - st.v*h).toFixed(1)
      + '" x2="' + gx(t + h).toFixed(1) + '" y2="' + gy(st.x + st.v*h).toFixed(1) + '"/>';
    return s;
  }
  function tangentLabel(ph, t) {
    var st = state(ph, t);
    var lx = Math.min(R - 150, Math.max(L + 6, gx(t) + 10)), ly = Math.min(B - 8, Math.max(T + 18, gy(st.x) - 16));
    return '<text class="pgtanlab" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">slope = v = ' + fmt(st.v, 1) + ' m/s</text>';
  }
  function graphDyn() {
    var s = '', c = '';
    if (match && nPh > 1) {
      var tg = cfg.targets[S.tgt];
      tg.times.forEach(function(t0, i){
        var t1 = i + 1 < tg.times.length ? tg.times[i + 1] : T_END;
        if (i > 0) s += '<line class="pgphase" x1="' + gx(t0) + '" y1="' + T + '" x2="' + gx(t0) + '" y2="' + B + '"/>';
        s += '<text class="pgphaselab" x="' + gx((t0 + t1)/2) + '" y="' + (T + 16) + '">phase ' + (i + 1) + '</text>';
      });
    }
    s += '<line class="pgcursor" x1="' + gx(S.t).toFixed(1) + '" y1="' + T + '" x2="' + gx(S.t).toFixed(1) + '" y2="' + B + '"/>';
    if (!match) {
      var ph = objPh();
      c += curve(ph, S.t, 'pgline pglyours') + gdots(ph, S.t, 'pgdot pgdyours') + nowDot(ph, S.t, 'pgnow pgdyours');
      if (S.tan) c += tangent(ph, S.t);
      s += '<g clip-path="url(#' + id('Clip') + ')">' + c + '</g>';
      if (S.tan) s += tangentLabel(ph, S.t);
    } else {
      var tp = tgtPh(), yp = yourPh(), tD = cfg.targetFull ? T_END : S.t;
      c += curve(tp, tD, 'pgline pgltarget') + gdots(tp, tD, 'pgdot pgdtarget');
      if (!cfg.targetFull) c += nowDot(tp, S.t, 'pgnow pgdtarget');
      c += curve(yp, S.t, 'pgline pglyoursdash') + gdots(yp, S.t, 'pgdot pgdyours') + nowDot(yp, S.t, 'pgnow pgdyours');
      if (S.tan) c += tangent(yp, S.t);
      s += '<g clip-path="url(#' + id('Clip') + ')">' + c + '</g>';
      if (S.tan) s += tangentLabel(yp, S.t);
    }
    return s;
  }
  function graphLabel() {
    var h = 'Position versus time graph, t from 0 to 10 s, x from ' + MINUS + '40 to 60 m. ';
    if (!match) {
      var st = state(objPh(), S.t);
      return h + 'Object: ' + shapeText(objPh()) + ' Drawn up to t = ' + fmt(S.t) + ' s, where x = ' + fmt(st.x) + ' m.';
    }
    var ys = state(yourPh(), S.t);
    return h + 'Target: ' + shapeText(tgtPh()) + ' Exact target positions are in the data table. '
      + 'Yours: ' + shapeText(yourPh()) + ' Drawn up to t = ' + fmt(S.t) + ' s, where your x = ' + fmt(ys.x) + ' m.';
  }

  /* ----- motion diagram rows ----- */
  var DW = 880, DH = 72, DLY = 28;
  function dpx(x) { return 110 + (x - XMIN)*660/(XMAX - XMIN); }
  function rowStatic() {
    var s = '', xa = dpx(XMIN), xb = dpx(XMAX) + 26;
    s += '<line class="pgtrack" x1="' + xa + '" y1="' + DLY + '" x2="' + xb + '" y2="' + DLY + '"/>'
      + '<polygon class="pgtrackhead" points="' + (xb + 12) + ',' + DLY + ' ' + xb + ',' + (DLY - 6) + ' ' + xb + ',' + (DLY + 6) + '"/>'
      + '<text class="pgaxlab" x="' + (xb + 18) + '" y="' + (DLY + 5) + '" text-anchor="start">x (m)</text>';
    for (var v = XMIN; v <= XMAX; v += 10) {
      s += '<line class="pgtick" x1="' + dpx(v) + '" y1="' + (DLY - 6) + '" x2="' + dpx(v) + '" y2="' + (DLY + 6) + '"/>'
        + '<text class="pgticklab" x="' + dpx(v) + '" y="' + (DLY + 27) + '">' + fmt(v, 0) + '</text>';
    }
    return s;
  }
  function rowDyn(ph, tDraw) {
    var s = '';
    for (var k = 0; k*GHOST_DT <= tDraw + 1e-6; k++) {
      var x = dpx(state(ph, k*GHOST_DT).x).toFixed(1);
      s += '<circle class="pgghost" cx="' + x + '" cy="' + DLY + '" r="10"/><circle class="pggdot" cx="' + x + '" cy="' + DLY + '" r="1.6"/>';
    }
    return s + '<circle class="pglive" cx="' + dpx(state(ph, tDraw).x).toFixed(1) + '" cy="' + DLY + '" r="11"/>';
  }
  var rows = !match ? [{ key: 'O', name: 'Object', cls: 'pgkyours' }]
    : (cfg.showTargetDiagram ? [{ key: 'T', name: 'Target', cls: 'pgktarget' }] : []).concat([{ key: 'Y', name: 'Yours', cls: 'pgkyours' }]);
  function rowPh(r) { return r.key === 'O' ? objPh() : r.key === 'T' ? tgtPh() : yourPh(); }
  function rowRead(r) {
    if (r.key === 'T') return '<span class="pgrn">Target</span> <span class="pgmuted">find its starting position, starting velocity and acceleration</span>';
    var st = state(rowPh(r), S.t), tr = trend(st.v, st.a);
    return '<span class="pgrn">' + r.name + '</span> <span>x = ' + fmt(st.x) + ' m</span> <span>v = ' + fmt(st.v)
      + ' m/s</span> <span>a = ' + fmt(st.a) + ' m/s' + SQ + '</span> <span class="pgbadge ' + tr.cls + '">' + tr.txt + '</span>';
  }
  function rowLabel(r) {
    var n = Math.floor(S.t/GHOST_DT + 1e-6) + 1, st = state(rowPh(r), S.t);
    return r.name + ' motion diagram, ' + n + ' images, one every second.' + (r.key === 'T' ? '' : ' Now at x = ' + fmt(st.x) + ' m, ' + trend(st.v, st.a).txt + '.');
  }

  /* ----- data table ----- */
  function tableHTML() {
    var h = '<div class="pgtblwrap" tabindex="0" role="group" aria-label="Data table"><table class="pgtbl"><caption>'
      + (match ? 'Positions every second. Your columns fill in as the motion plays.' : 'Values every second, up to the current time.') + '</caption><thead><tr><th scope="col">t (s)</th>';
    h += match ? '<th scope="col">target x (m)</th><th scope="col">your x (m)</th><th scope="col">your v (m/s)</th>'
               : '<th scope="col">x (m)</th><th scope="col">v (m/s)</th><th scope="col">a (m/s' + SQ + ')</th>';
    h += '</tr></thead><tbody>';
    for (var t = 0; t <= T_END; t++) {
      var on = t <= S.t + 1e-6;
      if (!match) {
        if (!on) break;
        var st = state(objPh(), t);
        h += '<tr><td>' + t + '</td><td>' + fmt(st.x) + '</td><td>' + fmt(st.v) + '</td><td>' + fmt(st.a) + '</td></tr>';
      } else {
        var tx = (cfg.targetFull || on) ? fmt(state(tgtPh(), t).x) : '\u2014';
        var ys = state(yourPh(), t);
        h += '<tr><td>' + t + '</td><td>' + tx + '</td><td>' + (on ? fmt(ys.x) : '\u2014') + '</td><td>' + (on ? fmt(ys.v) : '\u2014') + '</td></tr>';
      }
    }
    return h + '</tbody></table></div>';
  }

  /* ----- render ----- */
  function render(forceTable) {
    $('GDyn').innerHTML = graphDyn();
    $('Graph').setAttribute('aria-label', graphLabel());
    rows.forEach(function(r){
      $('R' + r.key + 'Dyn').innerHTML = rowDyn(rowPh(r), S.t);
      $('R' + r.key + 'Svg').setAttribute('aria-label', rowLabel(r));
      $('R' + r.key + 'Read').innerHTML = rowRead(r);
    });
    $('Clock').textContent = 't = ' + fmt(S.t) + ' s';
    $('Play').textContent = S.playing ? 'Pause' : (S.t >= T_END - EPS ? 'Replay' : 'Play');
    var sig = S.opt + ':' + S.tgt + ':' + Math.floor(S.t + 1e-6) + ':' + JSON.stringify(S.vals[S.tgt] || '');
    if (S.table && (forceTable || sig !== S.sig)) { $('Table').innerHTML = tableHTML(); S.sig = sig; }
  }

  /* ----- animation ----- */
  function describeNow() {
    if (!match) { var st = state(objPh(), S.t); return 't = ' + fmt(S.t) + ' s. x = ' + fmt(st.x) + ' m, v = ' + fmt(st.v) + ' m/s, ' + trend(st.v, st.a).txt + '.'; }
    var y = state(yourPh(), S.t);
    var s = 't = ' + fmt(S.t) + ' s. Your x = ' + fmt(y.x) + ' m, v = ' + fmt(y.v) + ' m/s.';
    if (cfg.targetFull || S.t > 0) s += ' Target x = ' + fmt(state(tgtPh(), S.t).x) + ' m.';
    return s;
  }
  function frame(ts) {
    if (!S.playing) return;
    if (S.last === null) S.last = ts;
    var dt = Math.min(0.1, (ts - S.last)/1000);
    S.last = ts; S.t += dt*rate;
    if (S.t >= T_END) { S.t = T_END; S.playing = false; render(); announce('Finished. ' + describeNow()); return; }
    render(); S.raf = requestAnimationFrame(frame);
  }
  function play() {
    if (S.playing) { pause(); announce('Paused. ' + describeNow()); return; }
    if (S.t >= T_END - EPS) S.t = 0;
    S.playing = true; S.last = null; announce('Playing.'); render();
    S.raf = requestAnimationFrame(frame);
  }
  function pause() { S.playing = false; if (S.raf) cancelAnimationFrame(S.raf); render(); }
  function step(dir) {
    pause();
    var k = dir > 0 ? Math.floor(S.t/stepDt + 1e-6) + 1 : Math.ceil(S.t/stepDt - 1e-6) - 1;
    S.t = Math.max(0, Math.min(T_END, k*stepDt)); render(); announce(describeNow());
  }
  function reset(quiet) { pause(); S.t = 0; render(true); if (!quiet) announce('Reset to t = 0.'); }

  function announce(msg) {
    var live = $('Live'), nar = $('Nar');
    if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
    if (nar && A.nr) nar.textContent = msg;
  }

  /* ----- accessibility toolbar ----- */
  function setBtn(n, on, label, suffix) {
    var bt = $(n); if (!bt) return;
    bt.classList.toggle('pga11yon', on); bt.setAttribute('aria-pressed', on ? 'true' : 'false');
    bt.textContent = suffix ? label + ': ' + (on ? 'on' : 'off') : label;
  }
  function applyA11y() {
    var r = host.querySelector('.pgroot'); if (!r) return;
    r.classList.toggle('pglm', A.lm); r.classList.toggle('pghc', A.hc);
    r.style.setProperty('--pgfs', FONT_SIZES[A.fs]);
    setBtn('BtnLM', A.lm, 'Light mode'); setBtn('BtnNR', A.nr, 'Narration', true);
    setBtn('BtnHC', A.hc, 'High contrast'); setBtn('BtnFS', A.fs > 0, 'Font size: ' + ['normal', 'large', 'extra large'][A.fs]);
    $('Nar').classList.toggle('pgnarshow', A.nr);
  }
  function toggleA11y(key) { if (key === 'fs') A.fs = (A.fs + 1) % 3; else A[key] = !A[key]; refreshAll(sh); }
  function refreshPills() {
    for (var i = 1; i <= TOTAL; i++) {
      var li = $('Pill' + i); if (!li) continue;
      li.classList.toggle('pgpilldone', !!sh.done[i]);
      li.querySelector('.pgsr').textContent = sh.done[i] ? ' (completed)' : (i === cfg.stage ? ' (current)' : '');
    }
  }

  /* ----- sliders + matching ----- */
  function phaseLegend(i) {
    var tg = cfg.targets[S.tgt];
    if (nPh === 1) return 'Your motion';
    var t1 = i + 1 < tg.times.length ? tg.times[i + 1] : T_END;
    return 'Phase ' + (i + 1) + ': t = ' + tg.times[i] + ' s to ' + t1 + ' s (values at t = ' + tg.times[i] + ' s)';
  }
  function slidersHTML() {
    var h = '<div class="pgsliders' + (nPh > 1 ? ' pgsl3' : '') + '">';
    for (var i = 0; i < nPh; i++) {
      h += '<fieldset class="pgph"><legend id="' + id('PhL' + i) + '">' + phaseLegend(i) + '</legend>';
      ['x', 'v', 'a'].forEach(function(k){
        var d = SL[k], sid = id('S' + k + i);
        h += '<div class="pgsl"><label for="' + sid + '">' + d.label + ' = <output id="' + id('O' + k + i) + '" for="' + sid + '">0</output> ' + d.unit + '</label>'
          + '<div class="pgslrow"><span class="pgslmin" aria-hidden="true">' + fmt(d.min, 0) + '</span>'
          + '<input type="range" id="' + sid + '" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="0">'
          + '<span class="pgslmax" aria-hidden="true">' + fmt(d.max, 0) + '</span></div></div>';
      });
      h += '</fieldset>';
    }
    return h + '</div>';
  }
  function syncSliders() {
    var vals = S.vals[S.tgt], done = solved(S.tgt);
    for (var i = 0; i < nPh; i++) {
      $('PhL' + i).textContent = phaseLegend(i);
      ['x', 'v', 'a'].forEach(function(k){
        var el = $('S' + k + i), d = SL[k];
        el.value = vals[i][k]; el.disabled = done;
        $('O' + k + i).textContent = fmt(vals[i][k], d.dec);
        el.setAttribute('aria-valuetext', (nPh > 1 ? 'phase ' + (i + 1) + ' ' : '') + d.name + ' ' + fmt(vals[i][k], d.dec) + ' ' + d.unit.replace(SQ, ' squared'));
      });
    }
    $('Chk').disabled = done;
    var tb = document.querySelectorAll('#' + id('Tgts') + ' button');
    for (var j = 0; j < tb.length; j++) {
      tb[j].setAttribute('aria-pressed', j === S.tgt ? 'true' : 'false');
      tb[j].classList.toggle('pgtgtnow', j === S.tgt);
      tb[j].textContent = (solved(j) ? '\u2713 ' : '') + cfg.targets[j].label;
    }
  }
  function onSlide(k, i, el) {
    S.vals[S.tgt][i][k] = parseFloat(el.value);
    if (S.playing || S.t > 0) { pause(); S.t = 0; }
    syncSliders(); render();
  }
  function cmpMsg(k, u, t, pre) {
    var Y = pre ? 'your' : 'Your';
    if (k === 'x') return pre + Y + ' graph starts ' + (u > t ? 'above' : 'below') + ' the target (check x<sub>i</sub>).';
    if (k === 'v') return pre + Y + ' graph starts with a ' + (u > t ? 'larger' : 'smaller') + ' slope than the target: it ' + (u > t ? 'rises more steeply or falls less steeply' : 'rises less steeply or falls more steeply') + ' (check v<sub>i</sub>).';
    return pre + Y + ' graph bends ' + (u > t ? 'upward more (or downward less)' : 'downward more (or upward less)') + ' than the target (check a).';
  }
  function checkMatch() {
    var rec = sh.items[itemKey('T' + (S.tgt + 1))], tg = cfg.targets[S.tgt], vals = S.vals[S.tgt];
    if (rec.solved) return;
    rec.attempts++;
    var msgs = [], ok = true, yp = yourPh();
    for (var i = 0; i < nPh; i++) {
      var pre = nPh > 1 ? 'Phase ' + (i + 1) + ': ' : '';
      if (i > 0) {
        var e = phaseEnd(yp[i - 1]);
        if (Math.abs(e.x - vals[i].x) > 1e-6) msgs.push(pre + 'your graph jumps at t = ' + tg.times[i] + ' s. A real object cannot jump from one position to another, so this phase must start where the previous one ends.');
        else if (Math.abs(e.v - vals[i].v) > 1e-6) msgs.push(pre + 'your graph has a sharp corner at t = ' + tg.times[i] + ' s, meaning the velocity changes instantly. The target\u2019s velocity changes smoothly.');
      }
      ['x', 'v', 'a'].forEach(function(k){
        if (Math.abs(vals[i][k] - tg.phases[i][k]) > 1e-6) { ok = false; msgs.push(cmpMsg(k, vals[i][k], tg.phases[i][k], pre)); }
      });
    }
    if (rec.first === null) rec.first = ok;
    var fb = $('MFb');
    if (ok) {
      rec.solved = true;
      var vals2 = tg.phases.map(function(p, i){ return (nPh > 1 ? 'phase ' + (i + 1) + ': ' : '') + 'x<sub>i</sub> = ' + fmt(p.x, 0) + ' m, v<sub>i</sub> = ' + fmt(p.v, 0) + ' m/s, a = ' + fmt(p.a, 1) + ' m/s' + SQ; }).join('; ');
      var next = -1; for (var j = 0; j < cfg.targets.length; j++) if (!solved(j)) { next = j; break; }
      fb.className = 'pgmfb pgfbgood';
      fb.innerHTML = '\u2713 Match! ' + vals2 + '.' + (next >= 0 ? ' <button type="button" class="pgbtn" id="' + id('GoNext') + '">Go to ' + cfg.targets[next].label + '</button>' : '');
      if (next >= 0) $('GoNext').addEventListener('click', function(){ selectTarget(next); });
      announce('Match. ' + strip(vals2) + '.' + (next >= 0 ? ' Next: ' + cfg.targets[next].label + '.' : ''));
      syncSliders(); checkStage();
    } else {
      fb.className = 'pgmfb pgfbbad';
      fb.innerHTML = 'Not a match yet.<ul>' + msgs.map(function(m){ return '<li>' + m + '</li>'; }).join('') + '</ul>';
      announce('Not a match yet. ' + strip(msgs.join(' ')));
    }
  }
  function selectTarget(i) {
    S.tgt = i; pause(); S.t = 0;
    var fb = $('MFb');
    fb.className = 'pgmfb' + (solved(i) ? ' pgfbgood' : ''); fb.textContent = solved(i) ? '\u2713 Already matched.' : '';
    syncSliders(); render(true);
    announce(cfg.targets[i].label + ' selected.' + (solved(i) ? ' Already matched.' : ' Press Play, then set the sliders.'));
  }

  /* ----- quiz ----- */
  function quizHTML() {
    return (cfg.questions || []).map(function(q, j){
      var h = '<fieldset class="pgq" id="' + id('Q' + j) + '"><legend>' + (j + 1) + '. ' + q.prompt + '</legend><div class="pgchoices">';
      q.choices.forEach(function(c, ci){
        h += '<label class="pgchoice"><input type="radio" name="' + id('Q' + j) + '" value="' + ci + '"> <span>' + choiceText(c) + '</span></label>';
      });
      return h + '</div><button type="button" class="pgbtn" id="' + id('QB' + j) + '">Check answer</button><div class="pgqfb" id="' + id('QF' + j) + '" aria-live="polite"></div></fieldset>';
    }).join('');
  }
  function lockQuestion(j) {
    var q = cfg.questions[j], ins = document.getElementsByName(id('Q' + j));
    for (var i = 0; i < ins.length; i++) ins[i].disabled = true;
    $('QB' + j).disabled = true; $('Q' + j).classList.add('pgqdone');
    var fb = $('QF' + j); fb.className = 'pgqfb pgfbgood'; fb.innerHTML = '\u2713 Correct. ' + q.explain;
  }
  function check(j) {
    var q = cfg.questions[j], rec = sh.items[itemKey(q.id)], fb = $('QF' + j);
    if (rec.solved) return;
    var sel = document.querySelector('input[name="' + id('Q' + j) + '"]:checked');
    if (!sel) { fb.className = 'pgqfb pgfbinfo'; fb.textContent = 'Choose an answer, then check it.'; return; }
    var c = +sel.value; rec.attempts++;
    if (rec.first === null) rec.first = (c === q.correct);
    if (c === q.correct) { rec.solved = true; lockQuestion(j); announce('Correct. ' + strip(q.explain)); checkStage(); }
    else {
      var ch = q.choices[c], msg = (typeof ch === 'object' && ch.fb) ? ch.fb : (q.hint || 'Look at the graph and the motion diagram again, then try another answer.');
      fb.className = 'pgqfb pgfbbad'; fb.innerHTML = 'Not quite. ' + msg; announce('Not quite. ' + strip(msg));
    }
  }

  /* ----- completion / results ----- */
  function stageSolved() {
    for (var k in sh.items) if (sh.items.hasOwnProperty(k) && sh.items[k].stage === cfg.stage && !sh.items[k].solved) return false;
    return true;
  }
  function checkStage() { if (!stageSolved()) return; sh.done[cfg.stage] = true; refreshAll(sh); showComplete(); }
  function fire(detail) {
    var ev;
    try { ev = new CustomEvent('ctStageComplete', { detail: detail }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('ctStageComplete', false, false, detail); }
    document.dispatchEvent(ev);
    var hook = window['ctOnStageComplete_' + thisq];
    if (typeof hook === 'function') hook(cfg.stage);
  }
  function showComplete() {
    var box = $('Comp');
    if (box.classList.contains('pgshow')) return;
    box.classList.add('pgshow');
    if (cfg.stage < TOTAL) {
      box.innerHTML = '<p class="pgcompmsg">\u2713 Stage ' + cfg.stage + ' complete.</p><button type="button" class="pgbtn pgbtnnext" id="' + id('Next') + '">Continue to stage ' + (cfg.stage + 1) + ': ' + STAGE_NAMES[cfg.stage] + '</button>';
      $('Next').addEventListener('click', function(){
        this.disabled = true; this.textContent = 'Stage ' + (cfg.stage + 1) + ' is open below';
        fire({ stage: cfg.stage, thisq: thisq }); announce('Stage ' + (cfg.stage + 1) + ' is now open below.');
      });
      announce('Stage ' + cfg.stage + ' complete. Use the Continue button to open the next stage.');
    } else {
      box.innerHTML = '<p class="pgcompmsg">\u2713 All targets matched.</p><button type="button" class="pgbtn pgbtnnext" id="' + id('Fin') + '">Finish tutorial and show results</button><div id="' + id('Res') + '"></div>';
      $('Fin').addEventListener('click', finish);
      announce('All stages complete. Use the Finish button to see your results.');
    }
  }
  function results() {
    var r = { score: 0, total: 0, attempts: 0, stages: 0 };
    for (var k in sh.items) if (sh.items.hasOwnProperty(k)) { var it = sh.items[k]; r.total++; r.attempts += it.attempts; if (it.first === true) r.score++; }
    for (var s = 1; s <= TOTAL; s++) if (sh.done[s]) r.stages++;
    r.percent = r.total ? Math.round(100*r.score/r.total) : 0;
    return r;
  }
  function writeBoxes(r) {
    var map = C.answerMap || {}, ok = [], miss = [];
    for (var f in map) if (map.hasOwnProperty(f)) {
      var code = pad3(map[f]), el = document.getElementById('qn' + thisq + code);
      if (!el) { miss.push(code); continue; }
      el.readOnly = false; el.value = String(r[f]);
      try { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      if (C.lockBoxes) el.readOnly = true;
      ok.push(code);
    }
    return { ok: ok, miss: miss };
  }
  function lockBoxesEarly(tries) {
    if (!C.momSubmit || !C.lockBoxes) return;
    var map = C.answerMap || {}, pending = 0;
    for (var f in map) if (map.hasOwnProperty(f)) {
      var el = document.getElementById('qn' + thisq + pad3(map[f]));
      if (el) { if (!sh.finished) { el.readOnly = true; el.title = 'Filled in automatically when you finish the tutorial'; } } else pending++;
    }
    if (pending && tries < 10) setTimeout(function(){ lockBoxesEarly(tries + 1); }, 500);
  }
  function finish() {
    sh.finished = true;
    var r = results(), w = C.momSubmit ? writeBoxes(r) : null;
    var h = '<div class="pgresult" role="group" aria-labelledby="' + id('ResH') + '"><h4 id="' + id('ResH') + '">Your results</h4><dl class="pgresdl">'
      + '<dt>Correct on first try</dt><dd>' + r.score + ' of ' + r.total + ' (' + r.percent + '%)</dd>'
      + '<dt>Checks used</dt><dd>' + r.attempts + '</dd>'
      + '<dt>Stages completed</dt><dd>' + r.stages + ' of ' + TOTAL + '</dd>'
      + '<dt>Finished</dt><dd>' + new Date().toLocaleString() + '</dd></dl>'
      + '<h4>Key ideas</h4><ul class="pgkeys">'
      + '<li>The slope of a position graph is the velocity: steeper means faster, a downward slope means moving toward \u2212x, and a horizontal line means at rest.</li>'
      + '<li>A straight position graph means constant velocity; a curved one means the velocity is changing.</li>'
      + '<li>A graph that bends upward means positive acceleration; one that bends downward means negative acceleration.</li>'
      + '<li>A turning point (flat top or bottom) is where the object momentarily stops and reverses.</li>'
      + '<li>The graph value at t = 0 is the starting position, and a real position graph never jumps.</li></ul>';
    if (w) {
      if (w.ok.length) h += '<p class="pgsubmitted">Results entered in answer box' + (w.ok.length > 1 ? 'es ' : ' ') + w.ok.join(', ') + '.</p>';
      if (w.miss.length) h += '<p class="pgsubmitwarn">Could not find answer box' + (w.miss.length > 1 ? 'es ' : ' ') + w.miss.join(', ') + ' on this page.</p>';
    }
    $('Res').innerHTML = h + '</div>';
    $('Fin').textContent = 'Update results';
    announce('Tutorial complete. ' + r.score + ' of ' + r.total + ' correct on the first try.' + (w && w.ok.length ? ' Results entered in the answer boxes.' : ''));
    fire({ stage: cfg.stage, thisq: thisq, results: r, answerWritten: !!(w && w.ok.length) });
  }

  /* ----- DOM ----- */
  function buildDOM() {
    var h = '<div class="pgroot" role="region" aria-label="Stage ' + cfg.stage + ' of ' + TOTAL + ': ' + cfg.title + '">'
      + '<div class="pga11y" role="toolbar" aria-label="Display options">'
      + '<button type="button" class="pga11ybtn" id="' + id('BtnLM') + '">Light mode</button>'
      + '<button type="button" class="pga11ybtn" id="' + id('BtnNR') + '">Narration: on</button>'
      + '<button type="button" class="pga11ybtn" id="' + id('BtnHC') + '">High contrast</button>'
      + '<button type="button" class="pga11ybtn" id="' + id('BtnFS') + '">Font size: normal</button></div>'
      + '<div id="' + id('Nar') + '" class="pgnarbar" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '<h3 class="pgtitle">Stage ' + cfg.stage + ': ' + cfg.title + '</h3><ol class="pgpills" aria-label="Tutorial stages">';
    for (var i = 1; i <= TOTAL; i++) {
      h += '<li id="' + id('Pill' + i) + '" class="pgpill' + (i === cfg.stage ? ' pgpillnow' : '') + '"' + (i === cfg.stage ? ' aria-current="step"' : '') + '>'
        + i + '. ' + STAGE_NAMES[i - 1] + '<span class="pgsr"></span></li>';
    }
    h += '</ol>' + (cfg.intro ? '<div class="pgintro">' + cfg.intro + '</div>' : '');
    if (match) {
      h += '<div class="pgtgts" id="' + id('Tgts') + '" role="group" aria-label="Choose a target">';
      cfg.targets.forEach(function(tg, j){ h += '<button type="button" class="pgbtn pgtgt" data-i="' + j + '" aria-pressed="false">' + tg.label + '</button>'; });
      h += '</div>';
    }
    h += '<div class="pgsim"><div class="pglegend"><span>'
      + (match ? '<span class="pgkey pgktarget"><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="pgline pgltarget"/></svg> Target (solid)</span>'
               + '<span class="pgkey pgkyours"><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="pgline pglyoursdash"/></svg> Yours (dashed)</span>'
               : '<span class="pgkey pgkyours"><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="pgline pglyours"/></svg> Object</span>')
      + '</span><span class="pgclock" id="' + id('Clock') + '" aria-hidden="true">t = 0.00 s</span></div>'
      + '<svg class="pggraph" id="' + id('Graph') + '" viewBox="0 0 ' + GW + ' ' + GH + '" role="img" aria-label="">' + graphStatic() + '<g id="' + id('GDyn') + '"></g></svg>';
    rows.forEach(function(r){
      h += '<figure class="pgrow ' + r.cls + '"><svg class="pgdiag" id="' + id('R' + r.key + 'Svg') + '" viewBox="0 0 ' + DW + ' ' + DH + '" role="img" aria-label="">'
        + rowStatic() + '<g id="' + id('R' + r.key + 'Dyn') + '"></g></svg><figcaption class="pgread" id="' + id('R' + r.key + 'Read') + '"></figcaption></figure>';
    });
    h += '</div><div class="pgctl">';
    if (!match && cfg.scenarios.length > 1) {
      h += '<fieldset class="pgopts"><legend>Motion</legend>';
      cfg.scenarios.forEach(function(sc, j){ h += '<label class="pgopt"><input type="radio" name="' + id('Opt') + '" value="' + j + '"' + (j === 0 ? ' checked' : '') + '> ' + sc.label + '</label>'; });
      h += '</fieldset>';
    }
    h += '<div class="pgbtns"><button type="button" class="pgbtn pgbtnplay" id="' + id('Play') + '">Play</button>'
      + '<button type="button" class="pgbtn" id="' + id('Back') + '" aria-label="Step back ' + stepDt + ' seconds">\u25C0 Step</button>'
      + '<button type="button" class="pgbtn" id="' + id('Fwd') + '" aria-label="Step forward ' + stepDt + ' seconds">Step \u25B6</button>'
      + '<button type="button" class="pgbtn" id="' + id('Rst') + '">Reset</button>'
      + '<button type="button" class="pgbtn pgtoggle" id="' + id('Tan') + '" aria-pressed="false">Slope tool</button>'
      + '<button type="button" class="pgbtn pgtoggle" id="' + id('Tbl') + '" aria-pressed="false" aria-controls="' + id('Table') + '">Data table</button></div></div>';
    if (match) {
      h += '<div class="pgmatch">' + slidersHTML()
        + '<div class="pgchkrow"><button type="button" class="pgbtn pgbtncheck" id="' + id('Chk') + '">Check match</button></div>'
        + '<div class="pgmfb" id="' + id('MFb') + '" aria-live="polite"></div></div>';
    }
    h += '<div class="pgtable" id="' + id('Table') + '" hidden></div>'
      + '<section class="pgtext">' + cfg.text + '</section>';
    if (cfg.questions && cfg.questions.length) {
      h += '<section class="pgquiz" aria-labelledby="' + id('QH') + '"><h4 id="' + id('QH') + '">Check your understanding</h4>' + quizHTML() + '</section>';
    }
    h += '<div class="pgcomplete" id="' + id('Comp') + '" role="status"></div>'
      + '<span class="pgsr" id="' + id('Live') + '" aria-live="polite" aria-atomic="true"></span></div>';
    host.innerHTML = h;

    $('Play').addEventListener('click', play);
    $('Back').addEventListener('click', function(){ step(-1); });
    $('Fwd').addEventListener('click', function(){ step(1); });
    $('Rst').addEventListener('click', function(){ reset(false); });
    $('Tan').addEventListener('click', function(){
      S.tan = !S.tan; this.setAttribute('aria-pressed', S.tan ? 'true' : 'false'); this.classList.toggle('pga11yon', S.tan); render();
      announce(S.tan ? 'Slope tool on. A tangent line shows the slope of ' + (match ? 'your' : 'the') + ' graph at the current time; the slope equals the velocity.' : 'Slope tool off.');
    });
    $('Tbl').addEventListener('click', function(){
      S.table = !S.table; this.setAttribute('aria-pressed', S.table ? 'true' : 'false'); this.classList.toggle('pga11yon', S.table);
      $('Table').hidden = !S.table; render(true); announce(S.table ? 'Data table shown.' : 'Data table hidden.');
    });
    var radios = document.getElementsByName(id('Opt'));
    for (var r = 0; r < radios.length; r++) radios[r].addEventListener('change', function(){
      S.opt = +this.value; reset(true); announce(cfg.scenarios[S.opt].label + ' selected. Press Play.');
    });
    if (match) {
      var tb = document.querySelectorAll('#' + id('Tgts') + ' button');
      for (var j = 0; j < tb.length; j++) tb[j].addEventListener('click', function(){ selectTarget(+this.getAttribute('data-i')); });
      for (var p = 0; p < nPh; p++) ['x', 'v', 'a'].forEach(function(k){
        var ph = p, el = $('S' + k + ph);
        el.addEventListener('input', function(){ onSlide(k, ph, el); });
      });
      $('Chk').addEventListener('click', checkMatch);
      syncSliders();
    }
    (cfg.questions || []).forEach(function(q, j){
      $('QB' + j).addEventListener('click', function(){ check(j); });
      if (sh.items[itemKey(q.id)].solved) { var ins = document.getElementsByName(id('Q' + j)); if (ins[q.correct]) ins[q.correct].checked = true; lockQuestion(j); }
    });
    $('BtnLM').addEventListener('click', function(){ toggleA11y('lm'); });
    $('BtnNR').addEventListener('click', function(){ toggleA11y('nr'); });
    $('BtnHC').addEventListener('click', function(){ toggleA11y('hc'); });
    $('BtnFS').addEventListener('click', function(){ toggleA11y('fs'); });
  }

  buildDOM();
  sh.stages[cfg.stage] = function(){ applyA11y(); refreshPills(); render(); };
  applyA11y(); refreshPills(); render(true);
  if (stageSolved()) showComplete();
  if (cfg.stage === TOTAL) {
    lockBoxesEarly(0);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ lockBoxesEarly(10); });
  }
  $('Nar').textContent = cfg.ready || ('Stage ' + cfg.stage + ' ready. Press Play.');
}

window.PosGraph = { mount: mount, version: '1.0', state: state };
})();
