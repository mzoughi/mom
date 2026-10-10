/* =====================================================================
 velgraph-core.js  \u2014  Velocity Graphs & Motion Diagrams tutorial
 Shared engine for velgraph-st1.js \u2026 velgraph-st5.js. Load this file first.

 Page contract (same pattern as the other tutorials):
   <div id="ctRoot$thisq"></div>, <div id="ct2Root$thisq" style="display:none"></div> \u2026
   <script>window.ctThisq = '$thisq';</script>
 Each stage fires document 'ctStageComplete' {detail:{stage, thisq}} and calls
 window['ctOnStageComplete_' + thisq](stage) if that hook exists.

 Optional configuration (set BEFORE the scripts load):
   window['vgConfig_' + thisq] = {
     momSubmit: true, lockBoxes: true,
     answerMap: { score:'001', percent:'002' }   // fields: score, total, percent, attempts, stages
   };

 Stage config modes:
   'explore': scenarios [{label, x0, phases:[{v,a}]}] + questions
   'match'  : targets [{label, x0, times:[t0,\u2026], phases:[{v,a},\u2026], given:'start'|'end'}],
              xSlider (bool), showTargetDiagram (bool), targetFull (bool)
   Position is always continuous: each phase starts where the previous one ends.
 ===================================================================== */
(function(){
'use strict';
if (window.VelGraph && window.VelGraph.mount) return;

var TOTAL = 5;
var STAGE_NAMES = ['Constant velocity', 'Changing velocity', 'Match the motion', 'Match the graph', 'Three-phase graph'];
var FONT_SIZES = ['15px', '17px', '20px'];
var EPS = 1e-6, SQ = '\u00B2', MINUS = '\u2212';
var T_END = 10, XMIN = -40, XMAX = 60, VMIN = -25, VMAX = 25, GHOST_DT = 1;
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
  var k = 'vgShared_' + thisq;
  if (!window[k]) window[k] = { a11y: { lm:false, nr:true, hc:false, fs:0 }, stages: {}, items: {}, done: {}, finished: false };
  return window[k];
}
function refreshAll(sh) { for (var k in sh.stages) if (sh.stages.hasOwnProperty(k)) sh.stages[k](); }
function getConfig(thisq) { return window['vgConfig_' + thisq] || window.vgConfig || {}; }

/* ---------- kinematics: piecewise constant-acceleration phases ---------- */
function mkPhases(times, x0, params) {
  var out = [], x = x0;
  params.forEach(function(p, i){
    var ph = { t0: times[i], t1: i + 1 < times.length ? times[i + 1] : T_END, x: x, v: p.v, a: p.a };
    out.push(ph); x = phaseEnd(ph).x;
  });
  return out;
}
function state(ph, t) {
  var k = 0;
  for (var i = 0; i < ph.length; i++) if (t >= ph[i].t0 - 1e-9) k = i;
  var p = ph[k], d = t - p.t0;
  return { x: p.x + p.v*d + 0.5*p.a*d*d, v: p.v + p.a*d, a: p.a, k: k };
}
function phaseEnd(p) { var d = p.t1 - p.t0; return { x: p.x + p.v*d + 0.5*p.a*d*d, v: p.v + p.a*d }; }
function trend(v, a) {
  if (Math.abs(v) < 1e-4) return { txt: 'momentarily at rest', cls: 'vgbrest' };
  var dir = v > 0 ? 'moving right' : 'moving left';
  if (Math.abs(a) < EPS) return { txt: dir + ', constant speed', cls: 'vgbconst' };
  return v*a > 0 ? { txt: dir + ', speeding up', cls: 'vgbup' } : { txt: dir + ', slowing down', cls: 'vgbdown' };
}
function shapeText(ph) {
  return ph.map(function(p, i){
    var pre = ph.length > 1 ? 'Phase ' + (i + 1) + ' (t = ' + p.t0 + ' to ' + p.t1 + ' s): ' : '';
    if (Math.abs(p.a) < EPS) {
      return pre + (Math.abs(p.v) < EPS ? 'horizontal line on the t axis' : 'horizontal line ' + (p.v > 0 ? 'above' : 'below') + ' the t axis');
    }
    var s = pre + 'straight line ' + (p.a > 0 ? 'rising' : 'falling'), tc = p.t0 - p.v/p.a;
    if (tc > p.t0 + 1e-6 && tc < p.t1 - 1e-6) s += ', crossing the t axis at t = ' + fmt(tc, 1) + ' s';
    else s += (p.v + p.a*(p.t1 - p.t0)/2 > 0 ? ', above the t axis' : ', below the t axis');
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
  var P = 'vg' + cfg.stage;
  function id(n) { return P + n + thisq; }
  function $(n) { return document.getElementById(id(n)); }
  var match = cfg.mode === 'match';
  var nPh = match ? cfg.targets[0].phases.length : 1;
  var S = { t: 0, playing: false, opt: 0, tgt: 0, tan: false, table: false, raf: 0, last: null, sig: '', vals: [], x0: [], area: false };
  var stepDt = cfg.stepDt || 0.5, rate = cfg.rate || 1;

  /* ----- items (questions + targets) for scoring ----- */
  function itemKey(s) { return cfg.stage + '.' + s; }
  function regItem(k) { if (!sh.items[k]) sh.items[k] = { stage: cfg.stage, first: null, attempts: 0, solved: false }; }
  if (match) {
    cfg.targets.forEach(function(tg, i){
      regItem(itemKey('T' + (i + 1)));
      S.vals.push(tg.phases.map(function(){ return { v: 0, a: 0 }; }));
      S.x0.push(0);
    });
  }
  (cfg.questions || []).forEach(function(q){ regItem(itemKey(q.id)); });

  /* ----- current objects ----- */
  function objPh() { var sc = cfg.scenarios[S.opt]; return mkPhases([0], sc.x0, sc.phases); }
  function tgtPh() { var tg = cfg.targets[S.tgt]; return mkPhases(tg.times, tg.x0, tg.phases); }
  function yourX0() { return cfg.xSlider ? S.x0[S.tgt] : cfg.targets[S.tgt].x0; }
  function yourPh() { return mkPhases(cfg.targets[S.tgt].times, yourX0(), S.vals[S.tgt]); }
  function solved(i) { return sh.items[itemKey('T' + (i + 1))].solved; }

  /* ----- graph geometry ----- */
  var GW = 880, GH = 372, L = 92, R = 782, T = 16, B = 326;
  function gx(t) { return L + t*(R - L)/T_END; }
  function gy(v) { return B - (v - VMIN)*(B - T)/(VMAX - VMIN); }
  function graphStatic() {
    var s = '<defs><clipPath id="' + id('Clip') + '"><rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '"/></clipPath>'
      + '<clipPath id="' + id('ClipP') + '"><rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (gy(0) - T) + '"/></clipPath>'
      + '<clipPath id="' + id('ClipN') + '"><rect x="' + L + '" y="' + gy(0) + '" width="' + (R - L) + '" height="' + (B - gy(0)) + '"/></clipPath></defs>';
    s += '<rect class="vgplot" x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '"/>';
    for (var t = 0; t <= T_END; t++) {
      s += '<line class="vggrid" x1="' + gx(t) + '" y1="' + T + '" x2="' + gx(t) + '" y2="' + B + '"/>';
      s += '<text class="vgticklab" x="' + gx(t) + '" y="' + (B + 22) + '">' + t + '</text>';
    }
    for (var x = VMIN; x <= VMAX; x += 5) {
      s += '<line class="' + (x === 0 ? 'vgzero' : 'vggrid') + '" x1="' + L + '" y1="' + gy(x) + '" x2="' + R + '" y2="' + gy(x) + '"/>';
      s += '<text class="vgticklab" x="' + (L - 10) + '" y="' + (gy(x) + 5) + '" text-anchor="end">' + fmt(x, 0) + '</text>';
    }
    s += '<line class="vgaxis" x1="' + L + '" y1="' + B + '" x2="' + (R + 22) + '" y2="' + B + '"/>'
       + '<polygon class="vgaxishead" points="' + (R + 34) + ',' + B + ' ' + (R + 22) + ',' + (B - 6) + ' ' + (R + 22) + ',' + (B + 6) + '"/>'
       + '<line class="vgaxis" x1="' + L + '" y1="' + B + '" x2="' + L + '" y2="' + (T - 4) + '"/>'
       + '<text class="vgaxlab" x="' + (R + 40) + '" y="' + (B + 6) + '" text-anchor="start">t (s)</text>'
       + '<text class="vgaxlab" text-anchor="middle" x="26" y="' + ((T + B)/2) + '" transform="rotate(-90 26 ' + ((T + B)/2) + ')">v (m/s)</text>';
    return s;
  }
  function curve(ph, tDraw, cls) {
    var s = '';
    ph.forEach(function(p){
      var te = Math.min(p.t1, tDraw);
      if (te <= p.t0 + 1e-9) return;
      var pts = [];
      pts.push(gx(p.t0).toFixed(1) + ',' + gy(p.v).toFixed(1));
      pts.push(gx(te).toFixed(1) + ',' + gy(p.v + p.a*(te - p.t0)).toFixed(1));
      s += '<polyline class="' + cls + '" points="' + pts.join(' ') + '"/>';
    });
    return s;
  }
  function gdots(ph, tDraw, cls) {
    var s = '';
    for (var k = 0; k*GHOST_DT <= tDraw + 1e-6; k++) {
      var st = state(ph, k*GHOST_DT);
      s += '<circle class="' + cls + '" cx="' + gx(k*GHOST_DT).toFixed(1) + '" cy="' + gy(st.v).toFixed(1) + '" r="3.5"/>';
    }
    return s;
  }
  function nowDot(ph, t, cls) {
    var st = state(ph, t);
    return '<circle class="' + cls + '" cx="' + gx(t).toFixed(1) + '" cy="' + gy(st.v).toFixed(1) + '" r="6.5"/>';
  }
  function tangent(ph, t) {
    var st = state(ph, t), h = 1.6;
    return '<line class="vgtan" x1="' + gx(t - h).toFixed(1) + '" y1="' + gy(st.v - st.a*h).toFixed(1)
      + '" x2="' + gx(t + h).toFixed(1) + '" y2="' + gy(st.v + st.a*h).toFixed(1) + '"/>';
  }
  function tangentLabel(ph, t) {
    var st = state(ph, t);
    var lx = Math.min(R - 170, Math.max(L + 6, gx(t) + 10)), ly = Math.min(B - 30, Math.max(T + 34, gy(st.v) - 16));
    return '<text class="vgtanlab" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">slope = a = ' + fmt(st.a, 1) + ' m/s' + SQ + '</text>';
  }
  // Area between the graph and the t axis, from 0 to t: shaded above / below the axis separately.
  function areaShape(ph, t) {
    if (t <= EPS) return '';
    var pts = [gx(0).toFixed(1) + ',' + gy(0).toFixed(1)];
    ph.forEach(function(p){
      var te = Math.min(p.t1, t);
      if (te <= p.t0 + 1e-9) return;
      pts.push(gx(p.t0).toFixed(1) + ',' + gy(p.v).toFixed(1));
      pts.push(gx(te).toFixed(1) + ',' + gy(p.v + p.a*(te - p.t0)).toFixed(1));
    });
    pts.push(gx(t).toFixed(1) + ',' + gy(0).toFixed(1));
    var poly = pts.join(' ');
    return '<polygon class="vgareapos" clip-path="url(#' + id('ClipP') + ')" points="' + poly + '"/>'
         + '<polygon class="vgareaneg" clip-path="url(#' + id('ClipN') + ')" points="' + poly + '"/>';
  }
  function areaLabel(ph, t) {
    var dx = state(ph, t).x - ph[0].x;
    return '<text class="vgarealab" x="' + (L + 10) + '" y="' + (B - 12) + '">area = \u0394x = ' + (dx > 0.005 ? '+' : '') + fmt(dx, 1) + ' m</text>';
  }
  function graphDyn() {
    var s = '', c = '';
    if (match && nPh > 1) {
      var tg = cfg.targets[S.tgt];
      tg.times.forEach(function(t0, i){
        var t1 = i + 1 < tg.times.length ? tg.times[i + 1] : T_END;
        if (i > 0) s += '<line class="vgphase" x1="' + gx(t0) + '" y1="' + T + '" x2="' + gx(t0) + '" y2="' + B + '"/>';
        s += '<text class="vgphaselab" x="' + gx((t0 + t1)/2) + '" y="' + (T + 16) + '">phase ' + (i + 1) + '</text>';
      });
    }
    s += '<line class="vgcursor" x1="' + gx(S.t).toFixed(1) + '" y1="' + T + '" x2="' + gx(S.t).toFixed(1) + '" y2="' + B + '"/>';
    if (!match) {
      var ph = objPh();
      if (S.area) s += areaShape(ph, S.t);
      c += curve(ph, S.t, 'vgline vglyours') + gdots(ph, S.t, 'vgdot vgdyours') + nowDot(ph, S.t, 'vgnow vgdyours');
      if (S.tan) c += tangent(ph, S.t);
      s += '<g clip-path="url(#' + id('Clip') + ')">' + c + '</g>';
      if (S.tan) s += tangentLabel(ph, S.t);
      if (S.area) s += areaLabel(ph, S.t);
    } else {
      var tp = tgtPh(), yp = yourPh(), tD = cfg.targetFull ? T_END : S.t;
      if (S.area) s += areaShape(yp, S.t);
      c += curve(tp, tD, 'vgline vgltarget') + gdots(tp, tD, 'vgdot vgdtarget');
      if (!cfg.targetFull) c += nowDot(tp, S.t, 'vgnow vgdtarget');
      c += curve(yp, S.t, 'vgline vglyoursdash') + gdots(yp, S.t, 'vgdot vgdyours') + nowDot(yp, S.t, 'vgnow vgdyours');
      if (S.tan) c += tangent(yp, S.t);
      s += '<g clip-path="url(#' + id('Clip') + ')">' + c + '</g>';
      if (S.tan) s += tangentLabel(yp, S.t);
      if (S.area) s += areaLabel(yp, S.t);
    }
    return s;
  }
  function graphLabel() {
    var h = 'Velocity versus time graph, t from 0 to 10 s, v from ' + MINUS + '25 to 25 m/s. ';
    if (!match) {
      var ph = objPh(), st = state(ph, S.t);
      return h + 'Object: ' + shapeText(ph) + ' Drawn up to t = ' + fmt(S.t) + ' s, where v = ' + fmt(st.v) + ' m/s.'
        + (S.area ? ' Shaded area so far equals the displacement, ' + fmt(st.x - ph[0].x, 1) + ' m.' : '');
    }
    var yp = yourPh(), ys = state(yp, S.t);
    return h + 'Target: ' + shapeText(tgtPh()) + ' Exact target velocities are in the data table. '
      + 'Yours: ' + shapeText(yp) + ' Drawn up to t = ' + fmt(S.t) + ' s, where your v = ' + fmt(ys.v) + ' m/s.'
      + (S.area ? ' Your shaded area so far equals your displacement, ' + fmt(ys.x - yp[0].x, 1) + ' m.' : '');
  }

  /* ----- motion diagram rows ----- */
  var DW = 880, DH = 72, DLY = 28;
  function dpx(x) { return 110 + (x - XMIN)*660/(XMAX - XMIN); }
  function rowStatic() {
    var s = '', xa = dpx(XMIN), xb = dpx(XMAX) + 26;
    s += '<line class="vgtrack" x1="' + xa + '" y1="' + DLY + '" x2="' + xb + '" y2="' + DLY + '"/>'
      + '<polygon class="vgtrackhead" points="' + (xb + 12) + ',' + DLY + ' ' + xb + ',' + (DLY - 6) + ' ' + xb + ',' + (DLY + 6) + '"/>'
      + '<text class="vgaxlab" x="' + (xb + 18) + '" y="' + (DLY + 5) + '" text-anchor="start">x (m)</text>';
    for (var v = XMIN; v <= XMAX; v += 10) {
      s += '<line class="vgtick" x1="' + dpx(v) + '" y1="' + (DLY - 6) + '" x2="' + dpx(v) + '" y2="' + (DLY + 6) + '"/>'
        + '<text class="vgticklab" x="' + dpx(v) + '" y="' + (DLY + 27) + '">' + fmt(v, 0) + '</text>';
    }
    return s;
  }
  function rowDyn(ph, tDraw) {
    var s = '';
    for (var k = 0; k*GHOST_DT <= tDraw + 1e-6; k++) {
      var x = dpx(state(ph, k*GHOST_DT).x).toFixed(1);
      s += '<circle class="vgghost" cx="' + x + '" cy="' + DLY + '" r="10"/><circle class="vggdot" cx="' + x + '" cy="' + DLY + '" r="1.6"/>';
    }
    return s + '<circle class="vglive" cx="' + dpx(state(ph, tDraw).x).toFixed(1) + '" cy="' + DLY + '" r="11"/>';
  }
  var rows = !match ? [{ key: 'O', name: 'Object', cls: 'vgkyours' }]
    : (cfg.showTargetDiagram ? [{ key: 'T', name: 'Target', cls: 'vgktarget' }] : []).concat([{ key: 'Y', name: 'Yours', cls: 'vgkyours' }]);
  function rowPh(r) { return r.key === 'O' ? objPh() : r.key === 'T' ? tgtPh() : yourPh(); }
  function rowRead(r) {
    if (r.key === 'T') return '<span class="vgrn">Target</span> <span class="vgmuted">find its starting position, starting velocity and acceleration</span>';
    var st = state(rowPh(r), S.t), tr = trend(st.v, st.a);
    return '<span class="vgrn">' + r.name + '</span> <span>x = ' + fmt(st.x) + ' m</span> <span>v = ' + fmt(st.v)
      + ' m/s</span> <span>a = ' + fmt(st.a) + ' m/s' + SQ + '</span> <span class="vgbadge ' + tr.cls + '">' + tr.txt + '</span>';
  }
  function rowLabel(r) {
    var n = Math.floor(S.t/GHOST_DT + 1e-6) + 1, st = state(rowPh(r), S.t);
    return r.name + ' motion diagram, ' + n + ' images, one every second.' + (r.key === 'T' ? '' : ' Now at x = ' + fmt(st.x) + ' m, ' + trend(st.v, st.a).txt + '.');
  }

  /* ----- data table ----- */
  function tableHTML() {
    var h = '<div class="vgtblwrap" tabindex="0" role="group" aria-label="Data table"><table class="vgtbl"><caption>'
      + (match ? 'Velocities every second. Your columns fill in as the motion plays.' : 'Values every second, up to the current time.') + '</caption><thead><tr><th scope="col">t (s)</th>';
    h += match ? '<th scope="col">target v (m/s)</th><th scope="col">your v (m/s)</th><th scope="col">your x (m)</th>'
               : '<th scope="col">v (m/s)</th><th scope="col">a (m/s' + SQ + ')</th><th scope="col">x (m)</th>';
    h += '</tr></thead><tbody>';
    for (var t = 0; t <= T_END; t++) {
      var on = t <= S.t + 1e-6;
      if (!match) {
        if (!on) break;
        var st = state(objPh(), t);
        h += '<tr><td>' + t + '</td><td>' + fmt(st.v) + '</td><td>' + fmt(st.a) + '</td><td>' + fmt(st.x) + '</td></tr>';
      } else {
        var tv = (cfg.targetFull || on) ? fmt(state(tgtPh(), t).v) : '\u2014';
        var ys = state(yourPh(), t);
        h += '<tr><td>' + t + '</td><td>' + tv + '</td><td>' + (on ? fmt(ys.v) : '\u2014') + '</td><td>' + (on ? fmt(ys.x) : '\u2014') + '</td></tr>';
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
    var sig = S.opt + ':' + S.tgt + ':' + Math.floor(S.t + 1e-6) + ':' + JSON.stringify(S.vals[S.tgt] || '') + ':' + S.x0[S.tgt];
    if (S.table && (forceTable || sig !== S.sig)) { $('Table').innerHTML = tableHTML(); S.sig = sig; }
  }

  /* ----- animation ----- */
  function describeNow() {
    if (!match) { var st = state(objPh(), S.t); return 't = ' + fmt(S.t) + ' s. x = ' + fmt(st.x) + ' m, v = ' + fmt(st.v) + ' m/s, ' + trend(st.v, st.a).txt + '.'; }
    var y = state(yourPh(), S.t);
    var s = 't = ' + fmt(S.t) + ' s. Your x = ' + fmt(y.x) + ' m, v = ' + fmt(y.v) + ' m/s.';
    if (cfg.targetFull || S.t > 0) s += ' Target v = ' + fmt(state(tgtPh(), S.t).v) + ' m/s.';
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
    bt.classList.toggle('vga11yon', on); bt.setAttribute('aria-pressed', on ? 'true' : 'false');
    bt.textContent = suffix ? label + ': ' + (on ? 'on' : 'off') : label;
  }
  function applyA11y() {
    var r = host.querySelector('.vgroot'); if (!r) return;
    r.classList.toggle('vglm', A.lm); r.classList.toggle('vghc', A.hc);
    r.style.setProperty('--vgfs', FONT_SIZES[A.fs]);
    setBtn('BtnLM', A.lm, 'Light mode'); setBtn('BtnNR', A.nr, 'Narration', true);
    setBtn('BtnHC', A.hc, 'High contrast'); setBtn('BtnFS', A.fs > 0, 'Font size: ' + ['normal', 'large', 'extra large'][A.fs]);
    $('Nar').classList.toggle('vgnarshow', A.nr);
  }
  function toggleA11y(key) { if (key === 'fs') A.fs = (A.fs + 1) % 3; else A[key] = !A[key]; refreshAll(sh); }
  function refreshPills() {
    for (var i = 1; i <= TOTAL; i++) {
      var li = $('Pill' + i); if (!li) continue;
      li.classList.toggle('vgpilldone', !!sh.done[i]);
      li.querySelector('.vgsr').textContent = sh.done[i] ? ' (completed)' : (i === cfg.stage ? ' (current)' : '');
    }
  }

  /* ----- sliders + matching ----- */
  function keysFor(i) { return (i === 0 && cfg.xSlider) ? ['x', 'v', 'a'] : ['v', 'a']; }
  function phaseLegend(i) {
    var tg = cfg.targets[S.tgt];
    if (nPh === 1) return 'Your motion';
    var t1 = i + 1 < tg.times.length ? tg.times[i + 1] : T_END;
    return 'Phase ' + (i + 1) + ': t = ' + tg.times[i] + ' s to ' + t1 + ' s (v<sub>i</sub> at t = ' + tg.times[i] + ' s)';
  }
  function givenText() {
    var tg = cfg.targets[S.tgt];
    if (tg.given === 'start') return 'Given: the object starts at x = ' + fmt(tg.x0, 0) + ' m.';
    if (tg.given === 'end') return 'Given: at t = 10 s the object is at x = ' + fmt(phaseEnd(tgtPh()[tgtPh().length - 1]).x, 0) + ' m.';
    return '';
  }
  function slidersHTML() {
    var h = '<div class="vgsliders' + (nPh > 1 ? ' vgsl3' : '') + '">';
    for (var i = 0; i < nPh; i++) {
      h += '<fieldset class="vgph"><legend id="' + id('PhL' + i) + '">' + phaseLegend(i) + '</legend>';
      keysFor(i).forEach(function(k){
        var d = SL[k], sid = id('S' + k + i);
        h += '<div class="vgsl"><label for="' + sid + '">' + d.label + ' = <output id="' + id('O' + k + i) + '" for="' + sid + '">0</output> ' + d.unit + '</label>'
          + '<div class="vgslrow"><span class="vgslmin" aria-hidden="true">' + fmt(d.min, 0) + '</span>'
          + '<input type="range" id="' + sid + '" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="0">'
          + '<span class="vgslmax" aria-hidden="true">' + fmt(d.max, 0) + '</span></div></div>';
      });
      h += '</fieldset>';
    }
    return h + '</div>';
  }
  function getVal(k, i) { return k === 'x' ? S.x0[S.tgt] : S.vals[S.tgt][i][k]; }
  function syncSliders() {
    var done = solved(S.tgt);
    for (var i = 0; i < nPh; i++) {
      $('PhL' + i).innerHTML = phaseLegend(i);
      keysFor(i).forEach(function(k){
        var el = $('S' + k + i), d = SL[k], val = getVal(k, i);
        el.value = val; el.disabled = done;
        $('O' + k + i).textContent = fmt(val, d.dec);
        el.setAttribute('aria-valuetext', (nPh > 1 ? 'phase ' + (i + 1) + ' ' : '') + d.name + ' ' + fmt(val, d.dec) + ' ' + d.unit.replace(SQ, ' squared'));
      });
    }
    $('Chk').disabled = done;
    var gv = $('Given'); if (gv) { var g = givenText(); gv.textContent = g; gv.hidden = !g; }
    var tb = document.querySelectorAll('#' + id('Tgts') + ' button');
    for (var j = 0; j < tb.length; j++) {
      tb[j].setAttribute('aria-pressed', j === S.tgt ? 'true' : 'false');
      tb[j].classList.toggle('vgtgtnow', j === S.tgt);
      tb[j].textContent = (solved(j) ? '\u2713 ' : '') + cfg.targets[j].label;
    }
  }
  function onSlide(k, i, el) {
    if (k === 'x') S.x0[S.tgt] = parseFloat(el.value); else S.vals[S.tgt][i][k] = parseFloat(el.value);
    if (S.playing || S.t > 0) { pause(); S.t = 0; }
    syncSliders(); render();
  }
  function cmpMsg(k, u, t, pre) {
    var Y = pre ? 'your' : 'Your', tg = cfg.targets[S.tgt];
    if (k === 'x') {
      if (tg.given === 'end') return pre + Y + ' x<sub>i</sub> does not lead to the given final position. Find the displacement from the area under the target\u2019s velocity graph; then x<sub>i</sub> = x<sub>final</sub> \u2212 \u0394x.';
      if (tg.given === 'start') return pre + Y + ' x<sub>i</sub> is not the given starting position.';
      return pre + Y + ' motion diagram starts to the ' + (u > t ? 'right' : 'left') + ' of the target\u2019s (check x<sub>i</sub>). The velocity graph cannot show this; use the motion diagram.';
    }
    if (k === 'v') return pre + Y + ' graph starts ' + (u > t ? 'above' : 'below') + ' the target (check v<sub>i</sub>).';
    return pre + Y + ' graph has a ' + (u > t ? 'larger' : 'smaller') + ' slope than the target: it ' + (u > t ? 'rises more steeply or falls less steeply' : 'rises less steeply or falls more steeply') + ' (check a).';
  }
  function checkMatch() {
    var rec = sh.items[itemKey('T' + (S.tgt + 1))], tg = cfg.targets[S.tgt], vals = S.vals[S.tgt];
    if (rec.solved) return;
    rec.attempts++;
    var msgs = [], ok = true, yp = yourPh();
    if (cfg.xSlider && Math.abs(S.x0[S.tgt] - tg.x0) > 1e-6) { ok = false; msgs.push(cmpMsg('x', S.x0[S.tgt], tg.x0, '')); }
    for (var i = 0; i < nPh; i++) {
      var pre = nPh > 1 ? 'Phase ' + (i + 1) + ': ' : '';
      if (i > 0) {
        var e = phaseEnd(yp[i - 1]);
        if (Math.abs(e.v - vals[i].v) > 1e-6) msgs.push(pre + 'your graph jumps at t = ' + tg.times[i] + ' s, meaning the velocity changes instantly. The target\u2019s velocity changes smoothly, so this phase must start at the velocity the previous phase ends with.');
      }
      ['v', 'a'].forEach(function(k){
        if (Math.abs(vals[i][k] - tg.phases[i][k]) > 1e-6) { ok = false; msgs.push(cmpMsg(k, vals[i][k], tg.phases[i][k], pre)); }
      });
    }
    if (rec.first === null) rec.first = ok;
    var fb = $('MFb');
    if (ok) {
      rec.solved = true;
      var vals2 = (cfg.xSlider ? 'x<sub>i</sub> = ' + fmt(tg.x0, 0) + ' m; ' : '') + tg.phases.map(function(p, i){ return (nPh > 1 ? 'phase ' + (i + 1) + ': ' : '') + 'v<sub>i</sub> = ' + fmt(p.v, 0) + ' m/s, a = ' + fmt(p.a, 1) + ' m/s' + SQ; }).join('; ');
      var next = -1; for (var j = 0; j < cfg.targets.length; j++) if (!solved(j)) { next = j; break; }
      fb.className = 'vgmfb vgfbgood';
      fb.innerHTML = '\u2713 Match! ' + vals2 + '.' + (next >= 0 ? ' <button type="button" class="vgbtn" id="' + id('GoNext') + '">Go to ' + cfg.targets[next].label + '</button>' : '');
      if (next >= 0) $('GoNext').addEventListener('click', function(){ selectTarget(next); });
      announce('Match. ' + strip(vals2) + '.' + (next >= 0 ? ' Next: ' + cfg.targets[next].label + '.' : ''));
      syncSliders(); checkStage();
    } else {
      fb.className = 'vgmfb vgfbbad';
      fb.innerHTML = 'Not a match yet.<ul>' + msgs.map(function(m){ return '<li>' + m + '</li>'; }).join('') + '</ul>';
      announce('Not a match yet. ' + strip(msgs.join(' ')));
    }
  }
  function selectTarget(i) {
    S.tgt = i; pause(); S.t = 0;
    var fb = $('MFb');
    fb.className = 'vgmfb' + (solved(i) ? ' vgfbgood' : ''); fb.textContent = solved(i) ? '\u2713 Already matched.' : '';
    syncSliders(); render(true);
    announce(cfg.targets[i].label + ' selected.' + (solved(i) ? ' Already matched.' : ' Press Play, then set the sliders.'));
  }

  /* ----- quiz ----- */
  function quizHTML() {
    return (cfg.questions || []).map(function(q, j){
      var h = '<fieldset class="vgq" id="' + id('Q' + j) + '"><legend>' + (j + 1) + '. ' + q.prompt + '</legend><div class="vgchoices">';
      q.choices.forEach(function(c, ci){
        h += '<label class="vgchoice"><input type="radio" name="' + id('Q' + j) + '" value="' + ci + '"> <span>' + choiceText(c) + '</span></label>';
      });
      return h + '</div><button type="button" class="vgbtn" id="' + id('QB' + j) + '">Check answer</button><div class="vgqfb" id="' + id('QF' + j) + '" aria-live="polite"></div></fieldset>';
    }).join('');
  }
  function lockQuestion(j) {
    var q = cfg.questions[j], ins = document.getElementsByName(id('Q' + j));
    for (var i = 0; i < ins.length; i++) ins[i].disabled = true;
    $('QB' + j).disabled = true; $('Q' + j).classList.add('vgqdone');
    var fb = $('QF' + j); fb.className = 'vgqfb vgfbgood'; fb.innerHTML = '\u2713 Correct. ' + q.explain;
  }
  function check(j) {
    var q = cfg.questions[j], rec = sh.items[itemKey(q.id)], fb = $('QF' + j);
    if (rec.solved) return;
    var sel = document.querySelector('input[name="' + id('Q' + j) + '"]:checked');
    if (!sel) { fb.className = 'vgqfb vgfbinfo'; fb.textContent = 'Choose an answer, then check it.'; return; }
    var c = +sel.value; rec.attempts++;
    if (rec.first === null) rec.first = (c === q.correct);
    if (c === q.correct) { rec.solved = true; lockQuestion(j); announce('Correct. ' + strip(q.explain)); checkStage(); }
    else {
      var ch = q.choices[c], msg = (typeof ch === 'object' && ch.fb) ? ch.fb : (q.hint || 'Look at the graph and the motion diagram again, then try another answer.');
      fb.className = 'vgqfb vgfbbad'; fb.innerHTML = 'Not quite. ' + msg; announce('Not quite. ' + strip(msg));
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
    if (box.classList.contains('vgshow')) return;
    box.classList.add('vgshow');
    if (cfg.stage < TOTAL) {
      box.innerHTML = '<p class="vgcompmsg">\u2713 Stage ' + cfg.stage + ' complete.</p><button type="button" class="vgbtn vgbtnnext" id="' + id('Next') + '">Continue to stage ' + (cfg.stage + 1) + ': ' + STAGE_NAMES[cfg.stage] + '</button>';
      $('Next').addEventListener('click', function(){
        this.disabled = true; this.textContent = 'Stage ' + (cfg.stage + 1) + ' is open below';
        fire({ stage: cfg.stage, thisq: thisq }); announce('Stage ' + (cfg.stage + 1) + ' is now open below.');
      });
      announce('Stage ' + cfg.stage + ' complete. Use the Continue button to open the next stage.');
    } else {
      box.innerHTML = '<p class="vgcompmsg">\u2713 All targets matched.</p><button type="button" class="vgbtn vgbtnnext" id="' + id('Fin') + '">Finish tutorial and show results</button><div id="' + id('Res') + '"></div>';
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
    var h = '<div class="vgresult" role="group" aria-labelledby="' + id('ResH') + '"><h4 id="' + id('ResH') + '">Your results</h4><dl class="vgresdl">'
      + '<dt>Correct on first try</dt><dd>' + r.score + ' of ' + r.total + ' (' + r.percent + '%)</dd>'
      + '<dt>Checks used</dt><dd>' + r.attempts + '</dd>'
      + '<dt>Stages completed</dt><dd>' + r.stages + ' of ' + TOTAL + '</dd>'
      + '<dt>Finished</dt><dd>' + new Date().toLocaleString() + '</dd></dl>'
      + '<h4>Key ideas</h4><ul class="vgkeys">'
      + '<li>The height of a velocity graph is the velocity: above the t axis means moving toward +x, below means moving toward \u2212x.</li>'
      + '<li>A horizontal velocity graph means constant velocity, not necessarily at rest.</li>'
      + '<li>The slope of a velocity graph is the acceleration.</li>'
      + '<li>The object speeds up when the graph moves away from the t axis and slows down when it moves toward it; crossing the axis means turning around.</li>'
      + '<li>The area between the graph and the t axis is the displacement. A velocity graph alone cannot tell you the starting position.</li></ul>';
    if (w) {
      if (w.ok.length) h += '<p class="vgsubmitted">Results entered in answer box' + (w.ok.length > 1 ? 'es ' : ' ') + w.ok.join(', ') + '.</p>';
      if (w.miss.length) h += '<p class="vgsubmitwarn">Could not find answer box' + (w.miss.length > 1 ? 'es ' : ' ') + w.miss.join(', ') + ' on this page.</p>';
    }
    $('Res').innerHTML = h + '</div>';
    $('Fin').textContent = 'Update results';
    announce('Tutorial complete. ' + r.score + ' of ' + r.total + ' correct on the first try.' + (w && w.ok.length ? ' Results entered in the answer boxes.' : ''));
    fire({ stage: cfg.stage, thisq: thisq, results: r, answerWritten: !!(w && w.ok.length) });
  }

  /* ----- DOM ----- */
  function buildDOM() {
    var h = '<div class="vgroot" role="region" aria-label="Stage ' + cfg.stage + ' of ' + TOTAL + ': ' + cfg.title + '">'
      + '<div class="vga11y" role="toolbar" aria-label="Display options">'
      + '<button type="button" class="vga11ybtn" id="' + id('BtnLM') + '">Light mode</button>'
      + '<button type="button" class="vga11ybtn" id="' + id('BtnNR') + '">Narration: on</button>'
      + '<button type="button" class="vga11ybtn" id="' + id('BtnHC') + '">High contrast</button>'
      + '<button type="button" class="vga11ybtn" id="' + id('BtnFS') + '">Font size: normal</button></div>'
      + '<div id="' + id('Nar') + '" class="vgnarbar" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '<h3 class="vgtitle">Stage ' + cfg.stage + ': ' + cfg.title + '</h3><ol class="vgpills" aria-label="Tutorial stages">';
    for (var i = 1; i <= TOTAL; i++) {
      h += '<li id="' + id('Pill' + i) + '" class="vgpill' + (i === cfg.stage ? ' vgpillnow' : '') + '"' + (i === cfg.stage ? ' aria-current="step"' : '') + '>'
        + i + '. ' + STAGE_NAMES[i - 1] + '<span class="vgsr"></span></li>';
    }
    h += '</ol>' + (cfg.intro ? '<div class="vgintro">' + cfg.intro + '</div>' : '');
    if (match) {
      h += '<div class="vgtgts" id="' + id('Tgts') + '" role="group" aria-label="Choose a target">';
      cfg.targets.forEach(function(tg, j){ h += '<button type="button" class="vgbtn vgtgt" data-i="' + j + '" aria-pressed="false">' + tg.label + '</button>'; });
      h += '</div>';
    }
    if (match) h += '<p class="vggiven" id="' + id('Given') + '" hidden></p>';
    h += '<div class="vgsim"><div class="vglegend"><span>'
      + (match ? '<span class="vgkey vgktarget"><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="vgline vgltarget"/></svg> Target (solid)</span>'
               + '<span class="vgkey vgkyours"><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="vgline vglyoursdash"/></svg> Yours (dashed)</span>'
               : '<span class="vgkey vgkyours"><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="vgline vglyours"/></svg> Object</span>')
      + '</span><span class="vgclock" id="' + id('Clock') + '" aria-hidden="true">t = 0.00 s</span></div>'
      + '<svg class="vggraph" id="' + id('Graph') + '" viewBox="0 0 ' + GW + ' ' + GH + '" role="img" aria-label="">' + graphStatic() + '<g id="' + id('GDyn') + '"></g></svg>';
    rows.forEach(function(r){
      h += '<figure class="vgrow ' + r.cls + '"><svg class="vgdiag" id="' + id('R' + r.key + 'Svg') + '" viewBox="0 0 ' + DW + ' ' + DH + '" role="img" aria-label="">'
        + rowStatic() + '<g id="' + id('R' + r.key + 'Dyn') + '"></g></svg><figcaption class="vgread" id="' + id('R' + r.key + 'Read') + '"></figcaption></figure>';
    });
    h += '</div><div class="vgctl">';
    if (!match && cfg.scenarios.length > 1) {
      h += '<fieldset class="vgopts"><legend>Motion</legend>';
      cfg.scenarios.forEach(function(sc, j){ h += '<label class="vgopt"><input type="radio" name="' + id('Opt') + '" value="' + j + '"' + (j === 0 ? ' checked' : '') + '> ' + sc.label + '</label>'; });
      h += '</fieldset>';
    }
    h += '<div class="vgbtns"><button type="button" class="vgbtn vgbtnplay" id="' + id('Play') + '">Play</button>'
      + '<button type="button" class="vgbtn" id="' + id('Back') + '" aria-label="Step back ' + stepDt + ' seconds">\u25C0 Step</button>'
      + '<button type="button" class="vgbtn" id="' + id('Fwd') + '" aria-label="Step forward ' + stepDt + ' seconds">Step \u25B6</button>'
      + '<button type="button" class="vgbtn" id="' + id('Rst') + '">Reset</button>'
      + '<button type="button" class="vgbtn vgtoggle" id="' + id('Tan') + '" aria-pressed="false">Slope tool</button>'
      + '<button type="button" class="vgbtn vgtoggle" id="' + id('Area') + '" aria-pressed="false">Area tool</button>'
      + '<button type="button" class="vgbtn vgtoggle" id="' + id('Tbl') + '" aria-pressed="false" aria-controls="' + id('Table') + '">Data table</button></div></div>';
    if (match) {
      h += '<div class="vgmatch">' + slidersHTML()
        + '<div class="vgchkrow"><button type="button" class="vgbtn vgbtncheck" id="' + id('Chk') + '">Check match</button></div>'
        + '<div class="vgmfb" id="' + id('MFb') + '" aria-live="polite"></div></div>';
    }
    h += '<div class="vgtable" id="' + id('Table') + '" hidden></div>'
      + '<section class="vgtext">' + cfg.text + '</section>';
    if (cfg.questions && cfg.questions.length) {
      h += '<section class="vgquiz" aria-labelledby="' + id('QH') + '"><h4 id="' + id('QH') + '">Check your understanding</h4>' + quizHTML() + '</section>';
    }
    h += '<div class="vgcomplete" id="' + id('Comp') + '" role="status"></div>'
      + '<span class="vgsr" id="' + id('Live') + '" aria-live="polite" aria-atomic="true"></span></div>';
    host.innerHTML = h;

    $('Play').addEventListener('click', play);
    $('Back').addEventListener('click', function(){ step(-1); });
    $('Fwd').addEventListener('click', function(){ step(1); });
    $('Rst').addEventListener('click', function(){ reset(false); });
    $('Tan').addEventListener('click', function(){
      S.tan = !S.tan; this.setAttribute('aria-pressed', S.tan ? 'true' : 'false'); this.classList.toggle('vga11yon', S.tan); render();
      announce(S.tan ? 'Slope tool on. A line shows the slope of ' + (match ? 'your' : 'the') + ' velocity graph at the current time; the slope equals the acceleration.' : 'Slope tool off.');
    });
    $('Area').addEventListener('click', function(){
      S.area = !S.area; this.setAttribute('aria-pressed', S.area ? 'true' : 'false'); this.classList.toggle('vga11yon', S.area); render();
      announce(S.area ? 'Area tool on. The area between ' + (match ? 'your' : 'the') + ' graph and the t axis is shaded; area above the axis counts as positive, area below as negative. The total equals the displacement.' : 'Area tool off.');
    });
    $('Tbl').addEventListener('click', function(){
      S.table = !S.table; this.setAttribute('aria-pressed', S.table ? 'true' : 'false'); this.classList.toggle('vga11yon', S.table);
      $('Table').hidden = !S.table; render(true); announce(S.table ? 'Data table shown.' : 'Data table hidden.');
    });
    var radios = document.getElementsByName(id('Opt'));
    for (var r = 0; r < radios.length; r++) radios[r].addEventListener('change', function(){
      S.opt = +this.value; reset(true); announce(cfg.scenarios[S.opt].label + ' selected. Press Play.');
    });
    if (match) {
      var tb = document.querySelectorAll('#' + id('Tgts') + ' button');
      for (var j = 0; j < tb.length; j++) tb[j].addEventListener('click', function(){ selectTarget(+this.getAttribute('data-i')); });
      for (var p = 0; p < nPh; p++) keysFor(p).forEach(function(k){
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

window.VelGraph = { mount: mount, version: '1.0', state: state };
})();
