/* =====================================================================
 motiondiag-core.js  —  Motion Diagrams: Velocity & Acceleration tutorial
 Shared engine for all stage files (motiondiag-st1.js … motiondiag-st8.js).
 Load this file BEFORE the stage files.

 Page contract (same pattern as the Kirchhoff tutorials):
   <div id="ctRoot$thisq"></div>, <div id="ct2Root$thisq" style="display:none"></div> …
   <script>window.ctThisq = '$thisq';</script>
 Each stage fires   document 'ctStageComplete'  {detail:{stage, thisq}}
 and calls window['ctOnStageComplete_' + thisq](stage) if that hook exists.

 Optional configuration (set BEFORE the scripts load):
   window['mdConfig_' + thisq] = {
     momSubmit: true,                       // write results into MOM answer boxes
     lockBoxes: true,                       // make those boxes read-only for students
     answerMap: { score:'001', percent:'002' }  // result field -> 3-digit box number
   };
   Result fields: score (first-try correct), total, percent, attempts, stages
 ===================================================================== */
(function(){
'use strict';
if (window.MotionDiag && window.MotionDiag.mount) return;

var TOTAL = 8;
var STAGE_NAMES = ['Motion diagrams', 'Direction', 'Spacing', 'Positive direction',
  'Negative direction', 'Turning around', 'Perpendicular a', 'Tangential + perpendicular'];
var FONT_SIZES = ['15px', '17px', '20px'];
var EPS = 1e-6;
var SQ = '\u00B2', MINUS = '\u2212', PAR = 'a\u2225', PERP = 'a\u22A5';

/* ---------- small helpers ---------- */
function fmt(n, d) {
  if (d == null) d = 2;
  var s = Number(n).toFixed(d);
  if (parseFloat(s) === 0) s = (0).toFixed(d);
  return s.replace('-', MINUS);
}
function strip(html) { return String(html).replace(/<[^>]*>/g, ''); }
function choiceText(c) { return typeof c === 'string' ? c : c.t; }
function shared(thisq) {
  var k = 'mdShared_' + thisq;
  if (!window[k]) window[k] = {
    a11y: { lm:false, nr:true, hc:false, fs:0 },
    stages: {}, questions: {}, done: {}, finished: false
  };
  return window[k];
}
function refreshAll(sh) {
  for (var k in sh.stages) if (sh.stages.hasOwnProperty(k)) sh.stages[k]();
}
function getConfig(thisq) {
  return window['mdConfig_' + thisq] || window.mdConfig || {};
}
function pad3(c) { c = String(c); while (c.length < 3) c = '0' + c; return c; }

/* ---------- kinematics ----------
 '1d'    : {x0, v0, a}
 'line'  : {p0:[x,y], v0:[vx,vy], a:[ax,ay]}     (straight line or projectile)
 'circle': {c:[cx,cy], R, th0 (deg), v0, at}    (counter-clockwise)          */
function kin(sc, t) {
  var T = Math.min(Math.max(t, 0), sc.tEnd);
  if (sc.type === '1d') {
    return { x: sc.x0 + sc.v0*T + 0.5*sc.a*T*T, y: 0,
             vx: sc.v0 + sc.a*T, vy: 0, ax: sc.a, ay: 0, t: T };
  }
  if (sc.type === 'line') {
    return { x: sc.p0[0] + sc.v0[0]*T + 0.5*sc.a[0]*T*T,
             y: sc.p0[1] + sc.v0[1]*T + 0.5*sc.a[1]*T*T,
             vx: sc.v0[0] + sc.a[0]*T, vy: sc.v0[1] + sc.a[1]*T,
             ax: sc.a[0], ay: sc.a[1], t: T };
  }
  // circle
  var v = sc.v0 + sc.at*T, s = sc.v0*T + 0.5*sc.at*T*T;
  var th = sc.th0*Math.PI/180 + s/sc.R, c = Math.cos(th), sn = Math.sin(th);
  var an = v*v/sc.R;
  return { x: sc.c[0] + sc.R*c, y: sc.c[1] + sc.R*sn,
           vx: -v*sn, vy: v*c,
           ax: -sc.at*sn - an*c, ay: sc.at*c - an*sn, t: T };
}
function decomp(k) {
  var sp = Math.sqrt(k.vx*k.vx + k.vy*k.vy), am = Math.sqrt(k.ax*k.ax + k.ay*k.ay);
  var r = { sp: sp, am: am, par: 0, perp: 0, ang: null };
  if (sp > 1e-4) {
    r.par = (k.ax*k.vx + k.ay*k.vy)/sp;
    r.perp = Math.abs(k.vx*k.ay - k.vy*k.ax)/sp;
    if (am > EPS) r.ang = Math.acos(Math.max(-1, Math.min(1, r.par/am)))*180/Math.PI;
  }
  return r;
}
function turnTime(sc) {
  return (sc.type === '1d' && sc.v0*sc.a < 0) ? -sc.v0/sc.a : Infinity;
}
function trend1(k) {
  var v = k.vx, a = k.ax;
  if (Math.abs(v) < 1e-4) return { txt: 'momentarily at rest', cls: 'mdbrest' };
  var dir = v > 0 ? 'moving right' : 'moving left';
  if (Math.abs(a) < EPS) return { txt: dir + ', constant speed', cls: 'mdbconst' };
  if (v*a > 0) return { txt: dir + ', speeding up', cls: 'mdbup' };
  return { txt: dir + ', slowing down', cls: 'mdbdown' };
}
function trend2(d) {
  if (d.sp < 1e-4) return { txt: 'momentarily at rest', cls: 'mdbrest' };
  var turning = d.perp > 1e-4;
  if (d.par > 1e-4) return { txt: 'speeding up' + (turning ? ' and turning' : ' in a straight line'), cls: 'mdbup' };
  if (d.par < -1e-4) return { txt: 'slowing down' + (turning ? ' and turning' : ' in a straight line'), cls: 'mdbdown' };
  return { txt: turning ? 'speed not changing, turning' : 'constant velocity', cls: 'mdbconst' };
}

/* ---------- SVG arrow ---------- */
function arrow(x1, y1, x2, y2, cls, label, dashed) {
  var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx*dx + dy*dy);
  if (L < 3) return '';
  var ux = dx/L, uy = dy/L, h = Math.min(10, L*0.6), w = h*0.55;
  var bx = x2 - ux*h, by = y2 - uy*h;
  var s = '<g class="' + cls + '"><line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1)
    + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '"'
    + (dashed ? ' stroke-dasharray="5 3"' : '') + '/>'
    + '<polygon points="' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' '
    + (bx - uy*w).toFixed(1) + ',' + (by + ux*w).toFixed(1) + ' '
    + (bx + uy*w).toFixed(1) + ',' + (by - ux*w).toFixed(1) + '"/>';
  if (label) s += '<text x="' + (x2 + ux*13).toFixed(1) + '" y="' + (y2 + uy*13 + 4).toFixed(1)
    + '" class="mdvect">' + label + '</text>';
  return s + '</g>';
}

/* =====================================================================
 MOUNT A STAGE
 ===================================================================== */
function mount(cfg) {
  var thisq = String(window.ctThisq);           // capture now (MOM may reuse the global)
  var rootId = (cfg.stage === 1 ? 'ctRoot' : 'ct' + cfg.stage + 'Root') + thisq;
  function start() {
    var host = document.getElementById(rootId);
    if (host) build(cfg, thisq, host);
  }
  if (document.getElementById(rootId)) start();
  else document.addEventListener('DOMContentLoaded', start);
}

function build(cfg, thisq, host) {
  var sh = shared(thisq), A = sh.a11y, C = getConfig(thisq);
  var P = 'md' + cfg.stage;
  function id(n) { return P + n + thisq; }
  function $(n) { return document.getElementById(id(n)); }
  var dim = cfg.dim || 1, panels = cfg.panels, opts = cfg.options || [{ label: 'Show', panels: panels.map(function(_, i){ return i; }) }];
  var stepDt = cfg.stepDt || 1, rate = cfg.rate || 1;
  var S = { t: 0, playing: false, opt: 0, vec: true, table: false, raf: 0, last: null, sig: '' };

  cfg.questions.forEach(function(q){
    var qid = cfg.stage + '.' + q.id;
    if (!sh.questions[qid]) sh.questions[qid] = { stage: cfg.stage, first: null, attempts: 0, solved: false, choice: null };
  });

  /* ----- geometry ----- */
  var G;
  if (dim === 1) {
    var rng = cfg.range || [-40, 60];
    G = { VW: 880, VH: 118, ly: 78, x0: rng[0], x1: rng[1] };
    G.px = function(x){ return 110 + (x - G.x0)*(660/(G.x1 - G.x0)); };
  } else {
    var b = cfg.bounds, m = 36, VW = 480, sc = (VW - 2*m)/(b.x[1] - b.x[0]);
    G = { VW: VW, m: m, sc: sc, b: b };
    G.VH = Math.round(2*m + (b.y[1] - b.y[0])*sc);
    G.wx = function(x){ return m + (x - b.x[0])*sc; };
    G.wy = function(y){ return G.VH - m - (y - b.y[0])*sc; };
  }
  function visible() { return opts[S.opt].panels; }
  function tMax() {
    var mx = 0; visible().forEach(function(i){ mx = Math.max(mx, panels[i].tEnd); }); return mx;
  }
  function ghostDt(sc) { return sc.ghostDt || cfg.ghostDt || 1; }

  /* ----- static SVG layers ----- */
  function staticSvg(i) {
    var s = '', sc = panels[i];
    if (dim === 1) {
      var ly = G.ly, xa = G.px(G.x0), xb = G.px(G.x1) + 26;
      s += '<line class="mdtrack" x1="' + xa + '" y1="' + ly + '" x2="' + xb + '" y2="' + ly + '"/>';
      s += '<polygon class="mdtrackhead" points="' + (xb + 12) + ',' + ly + ' ' + xb + ',' + (ly - 6) + ' ' + xb + ',' + (ly + 6) + '"/>';
      s += '<text class="mdaxlab" x="' + (xb + 18) + '" y="' + (ly + 5) + '" text-anchor="start">x (m)</text>';
      for (var v = G.x0; v <= G.x1 + EPS; v += 10) {
        var x = G.px(v);
        s += '<line class="mdtick" x1="' + x + '" y1="' + (ly - 6) + '" x2="' + x + '" y2="' + (ly + 6) + '"/>';
        s += '<text class="mdticklab" x="' + x + '" y="' + (ly + 27) + '">' + fmt(v, 0) + '</text>';
      }
    } else {
      var bb = G.b, gx, gy;
      for (gx = Math.ceil(bb.x[0]/10)*10; gx <= bb.x[1] + EPS; gx += 10) {
        s += '<line class="' + (gx === 0 ? 'mdaxis' : 'mdgrid') + '" x1="' + G.wx(gx) + '" y1="' + G.wy(bb.y[0]) + '" x2="' + G.wx(gx) + '" y2="' + G.wy(bb.y[1]) + '"/>';
        s += '<text class="mdticklab" x="' + G.wx(gx) + '" y="' + (G.wy(bb.y[0]) + 16) + '">' + fmt(gx, 0) + '</text>';
      }
      for (gy = Math.ceil(bb.y[0]/10)*10; gy <= bb.y[1] + EPS; gy += 10) {
        s += '<line class="' + (gy === 0 ? 'mdaxis' : 'mdgrid') + '" x1="' + G.wx(bb.x[0]) + '" y1="' + G.wy(gy) + '" x2="' + G.wx(bb.x[1]) + '" y2="' + G.wy(gy) + '"/>';
        s += '<text class="mdticklab" x="' + (G.wx(bb.x[0]) - 6) + '" y="' + (G.wy(gy) + 4) + '" text-anchor="end">' + fmt(gy, 0) + '</text>';
      }
      s += '<text class="mdaxlab" x="' + (G.VW - 4) + '" y="' + (G.VH - 4) + '" text-anchor="end">x (m)</text>';
      s += '<text class="mdaxlab" x="4" y="14" text-anchor="start">y (m)</text>';
      if (sc.type === 'circle') {
        var cx = G.wx(sc.c[0]), cy = G.wy(sc.c[1]);
        s += '<g class="mdcenter"><line x1="' + (cx - 5) + '" y1="' + cy + '" x2="' + (cx + 5) + '" y2="' + cy + '"/><line x1="' + cx + '" y1="' + (cy - 5) + '" x2="' + cx + '" y2="' + (cy + 5) + '"/></g>';
      }
    }
    return s;
  }

  /* ----- dynamic SVG layer ----- */
  function dyn(i, t) {
    var sc = panels[i], gd = ghostDt(sc), tt = Math.min(t, sc.tEnd);
    var n = Math.floor(tt/gd + 1e-6), s = '', j, kj, k = kin(sc, tt);
    if (dim === 1) {
      var tturn = sc.lift ? turnTime(sc) : Infinity;
      var yOf = function(time){ return time > tturn + 1e-6 ? G.ly - 18 : G.ly; };
      for (j = 0; j <= n; j++) {
        kj = kin(sc, j*gd);
        var gy1 = yOf(j*gd);
        s += '<circle class="mdghost" cx="' + G.px(kj.x).toFixed(1) + '" cy="' + gy1 + '" r="10"/>'
           + '<circle class="mdgdot" cx="' + G.px(kj.x).toFixed(1) + '" cy="' + gy1 + '" r="1.6"/>';
      }
      var X = G.px(k.x), Y = yOf(tt);
      s += '<circle class="mdlive" cx="' + X.toFixed(1) + '" cy="' + Y + '" r="11"/>';
      if (S.vec) {
        s += arrow(X, Y - 26, X + k.vx*(cfg.vPx || 3), Y - 26, 'mdvv', 'v');
        s += arrow(X, Y - 44, X + k.ax*(cfg.aPx || 12), Y - 44, 'mdva', 'a');
      }
    } else {
      var pts = [], st = Math.max(0.02, tt/300);
      for (var u = 0; u < tt; u += st) { var ku = kin(sc, u); pts.push(G.wx(ku.x).toFixed(1) + ',' + G.wy(ku.y).toFixed(1)); }
      pts.push(G.wx(k.x).toFixed(1) + ',' + G.wy(k.y).toFixed(1));
      if (pts.length > 1) s += '<polyline class="mdtrail" points="' + pts.join(' ') + '"/>';
      for (j = 0; j <= n; j++) {
        kj = kin(sc, j*gd);
        s += '<circle class="mdghost" cx="' + G.wx(kj.x).toFixed(1) + '" cy="' + G.wy(kj.y).toFixed(1) + '" r="6"/>'
           + '<circle class="mdgdot" cx="' + G.wx(kj.x).toFixed(1) + '" cy="' + G.wy(kj.y).toFixed(1) + '" r="1.4"/>';
      }
      var x0 = G.wx(k.x), y0 = G.wy(k.y);
      var vs = sc.vSec || cfg.vSec || 1, as = sc.aSec2 || cfg.aSec2 || 2;
      s += '<circle class="mdlive" cx="' + x0.toFixed(1) + '" cy="' + y0.toFixed(1) + '" r="8"/>';
      if (S.vec) {
        var d = decomp(k), ox = 0, oy = 0;
        // components only when BOTH are present (otherwise one would sit on top of a)
        if (cfg.showComponents && d.sp > 1e-4 && Math.abs(d.par) > 0.05*d.am && d.perp > 0.05*d.am) {
          var ux = k.vx/d.sp, uy = k.vy/d.sp, pax = d.par*ux, pay = d.par*uy;
          s += arrow(x0, y0, G.wx(k.x + pax*as), G.wy(k.y + pay*as), 'mdvc', PAR, true);
          s += arrow(x0, y0, G.wx(k.x + (k.ax - pax)*as), G.wy(k.y + (k.ay - pay)*as), 'mdvc', PERP, true);
        }
        // a nearly parallel/antiparallel to v: shift the a arrow sideways so both stay visible
        if (d.sp > 1e-4 && d.am > EPS && d.perp < 0.1*d.am) { ox = -(k.vy/d.sp)*9; oy = -(k.vx/d.sp)*9; }
        s += arrow(x0 + ox, y0 + oy, G.wx(k.x + k.ax*as) + ox, G.wy(k.y + k.ay*as) + oy, 'mdva', 'a');
        s += arrow(x0, y0, G.wx(k.x + k.vx*vs), G.wy(k.y + k.vy*vs), 'mdvv', 'v');
      }
    }
    return s;
  }

  /* ----- readouts & descriptions ----- */
  function readout(i, t) {
    var sc = panels[i], k = kin(sc, t), h = '<span class="mdrn">' + sc.name + '</span> ';
    if (dim === 1) {
      var tr = trend1(k);
      return h + '<span>x = ' + fmt(k.x) + ' m</span> <span>v = ' + fmt(k.vx) + ' m/s</span> <span>a = '
        + fmt(k.ax) + ' m/s' + SQ + '</span> <span class="mdbadge ' + tr.cls + '">' + tr.txt + '</span>';
    }
    var d = decomp(k), tr2 = trend2(d);
    return h + '<span>speed = ' + fmt(d.sp) + ' m/s</span> <span>' + PAR + ' = ' + fmt(d.par) + ' m/s' + SQ
      + '</span> <span>' + PERP + ' = ' + fmt(d.perp) + ' m/s' + SQ + '</span> <span>angle(a, v) = '
      + (d.ang === null ? '\u2014' : fmt(d.ang, 0) + '\u00B0') + '</span> <span class="mdbadge ' + tr2.cls + '">' + tr2.txt + '</span>';
  }
  function spacingTrend(sc, t) {
    var gd = ghostDt(sc), n = Math.floor(Math.min(t, sc.tEnd)/gd + 1e-6);
    if (n < 2) return '';
    var a = kin(sc, (n - 2)*gd), b2 = kin(sc, (n - 1)*gd), c = kin(sc, n*gd);
    var d1 = Math.hypot(b2.x - a.x, b2.y - a.y), d2 = Math.hypot(c.x - b2.x, c.y - b2.y);
    if (Math.abs(d2 - d1) < 0.05) return 'Spacing between images is constant. ';
    return 'Spacing between images is ' + (d2 > d1 ? 'increasing' : 'decreasing') + '. ';
  }
  function describe(i, t, long) {
    var sc = panels[i], k = kin(sc, t), gd = ghostDt(sc);
    var n = Math.floor(Math.min(t, sc.tEnd)/gd + 1e-6) + 1;
    var pre = long ? sc.name + (dim === 1 ? ' motion diagram. ' : ' path diagram. ') + n + ' images, one every ' + gd + ' s. ' + spacingTrend(sc, t) : sc.name + ': ';
    if (dim === 1) {
      return pre + 'x = ' + fmt(k.x) + ' m, v = ' + fmt(k.vx) + ' m/s, a = ' + fmt(k.ax) + ' m/s' + SQ + ', ' + trend1(k).txt + '.';
    }
    var d = decomp(k);
    return pre + 'position (' + fmt(k.x, 1) + ', ' + fmt(k.y, 1) + ') m, speed ' + fmt(d.sp) + ' m/s, tangential acceleration '
      + fmt(d.par) + ', perpendicular acceleration ' + fmt(d.perp) + ' m/s' + SQ + ', ' + trend2(d).txt + '.';
  }
  function describeNow() {
    return 't = ' + fmt(S.t) + ' s. ' + visible().map(function(i){ return describe(i, S.t, false); }).join(' ');
  }

  /* ----- data table ----- */
  function tableHTML() {
    var h = '';
    visible().forEach(function(i){
      var sc = panels[i], gd = ghostDt(sc), n = Math.floor(Math.min(S.t, sc.tEnd)/gd + 1e-6), prev = null;
      h += '<div class="mdtblwrap" tabindex="0" role="group" aria-label="' + sc.name + ' data"><table class="mdtbl"><caption>' + sc.name + ': one image every ' + gd + ' s</caption><thead><tr>';
      h += dim === 1
        ? '<th scope="col">t (s)</th><th scope="col">x (m)</th><th scope="col">spacing \u0394x (m)</th><th scope="col">v (m/s)</th><th scope="col">a (m/s' + SQ + ')</th>'
        : '<th scope="col">t (s)</th><th scope="col">x (m)</th><th scope="col">y (m)</th><th scope="col">spacing (m)</th><th scope="col">speed (m/s)</th><th scope="col">' + PAR + ' (m/s' + SQ + ')</th><th scope="col">' + PERP + ' (m/s' + SQ + ')</th>';
      h += '</tr></thead><tbody>';
      for (var j = 0; j <= n; j++) {
        var k = kin(sc, j*gd);
        var sp = prev ? (dim === 1 ? fmt(k.x - prev.x) : fmt(Math.hypot(k.x - prev.x, k.y - prev.y))) : '\u2014';
        if (dim === 1) h += '<tr><td>' + fmt(j*gd) + '</td><td>' + fmt(k.x) + '</td><td>' + sp + '</td><td>' + fmt(k.vx) + '</td><td>' + fmt(k.ax) + '</td></tr>';
        else { var d = decomp(k); h += '<tr><td>' + fmt(j*gd) + '</td><td>' + fmt(k.x) + '</td><td>' + fmt(k.y) + '</td><td>' + sp + '</td><td>' + fmt(d.sp) + '</td><td>' + fmt(d.par) + '</td><td>' + fmt(d.perp) + '</td></tr>'; }
        prev = k;
      }
      h += '</tbody></table></div>';
    });
    return h;
  }

  /* ----- render ----- */
  function render(forceTable) {
    var vis = visible(), sig = S.opt + ':';
    panels.forEach(function(sc, i){
      var fig = $('Fig' + i), on = vis.indexOf(i) >= 0;
      fig.hidden = !on;
      if (!on) return;
      $('Dyn' + i).innerHTML = dyn(i, S.t);
      $('Read' + i).innerHTML = readout(i, S.t);
      $('Svg' + i).setAttribute('aria-label', describe(i, S.t, true));
      sig += Math.floor(Math.min(S.t, sc.tEnd)/ghostDt(sc) + 1e-6) + ',';
    });
    $('Clock').textContent = 't = ' + fmt(S.t) + ' s';
    var pb = $('Play');
    pb.textContent = S.playing ? 'Pause' : (S.t >= tMax() - EPS ? 'Replay' : 'Play');
    if (S.table && (forceTable || sig !== S.sig)) { $('Table').innerHTML = tableHTML(); S.sig = sig; }
  }

  /* ----- animation ----- */
  function frame(ts) {
    if (!S.playing) return;
    if (S.last === null) S.last = ts;
    var dt = Math.min(0.1, (ts - S.last)/1000);
    S.last = ts; S.t += dt*rate;
    var tm = tMax();
    if (S.t >= tm) {
      S.t = tm; S.playing = false; render();
      announce('Finished. ' + describeNow());
      return;
    }
    render();
    S.raf = requestAnimationFrame(frame);
  }
  function play() {
    if (S.playing) { pause(); announce('Paused. ' + describeNow()); return; }
    if (S.t >= tMax() - EPS) S.t = 0;
    S.playing = true; S.last = null;
    announce('Playing ' + opts[S.opt].label + '.');
    render(); S.raf = requestAnimationFrame(frame);
  }
  function pause() { S.playing = false; if (S.raf) cancelAnimationFrame(S.raf); render(); }
  function step(dir) {
    pause();
    var k = dir > 0 ? Math.floor(S.t/stepDt + 1e-6) + 1 : Math.ceil(S.t/stepDt - 1e-6) - 1;
    S.t = Math.max(0, Math.min(tMax(), k*stepDt));
    render(); announce(describeNow());
  }
  function reset(quiet) { pause(); S.t = 0; render(true); if (!quiet) announce('Reset to t = 0. ' + describeNow()); }

  /* ----- narration ----- */
  function announce(msg) {
    var live = $('Live'), nar = $('Nar');
    if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
    if (nar && A.nr) nar.textContent = msg;
  }

  /* ----- accessibility toolbar ----- */
  function setBtn(n, on, label, suffix) {
    var bt = $(n); if (!bt) return;
    bt.classList.toggle('mda11yon', on);
    bt.setAttribute('aria-pressed', on ? 'true' : 'false');
    bt.textContent = suffix ? label + ': ' + (on ? 'on' : 'off') : label;
  }
  function applyA11y() {
    var r = host.querySelector('.mdroot'); if (!r) return;
    r.classList.toggle('mdlm', A.lm);
    r.classList.toggle('mdhc', A.hc);
    r.style.setProperty('--mdfs', FONT_SIZES[A.fs]);
    setBtn('BtnLM', A.lm, 'Light mode');
    setBtn('BtnNR', A.nr, 'Narration', true);
    setBtn('BtnHC', A.hc, 'High contrast');
    setBtn('BtnFS', A.fs > 0, 'Font size: ' + ['normal', 'large', 'extra large'][A.fs]);
    $('Nar').classList.toggle('mdnarshow', A.nr);
  }
  function toggleA11y(key) {
    if (key === 'fs') A.fs = (A.fs + 1) % 3; else A[key] = !A[key];
    refreshAll(sh);   // display settings apply to every stage of this question
  }
  function refreshPills() {
    for (var i = 1; i <= TOTAL; i++) {
      var li = $('Pill' + i); if (!li) continue;
      li.classList.toggle('mdpilldone', !!sh.done[i]);
      var sr = li.querySelector('.mdsr'); if (sr) sr.textContent = sh.done[i] ? ' (completed)' : (i === cfg.stage ? ' (current)' : '');
    }
  }

  /* ----- quiz ----- */
  function quizHTML() {
    return cfg.questions.map(function(q, j){
      var h = '<fieldset class="mdq" id="' + id('Q' + j) + '"><legend>' + (j + 1) + '. ' + q.prompt + '</legend><div class="mdchoices">';
      q.choices.forEach(function(c, ci){
        h += '<label class="mdchoice"><input type="radio" name="' + id('Q' + j) + '" value="' + ci + '"> <span>' + choiceText(c) + '</span></label>';
      });
      return h + '</div><button type="button" class="mdbtn mdbtncheck" id="' + id('QB' + j) + '">Check answer</button>'
        + '<div class="mdqfb" id="' + id('QF' + j) + '" aria-live="polite"></div></fieldset>';
    }).join('');
  }
  function lockQuestion(j, ok) {
    var q = cfg.questions[j], fb = $('QF' + j);
    var inputs = document.getElementsByName(id('Q' + j));
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    $('QB' + j).disabled = true;
    $('Q' + j).classList.add('mdqdone');
    fb.className = 'mdqfb mdfbgood';
    fb.innerHTML = '\u2713 Correct. ' + q.explain;
  }
  function check(j) {
    var q = cfg.questions[j], rec = sh.questions[cfg.stage + '.' + q.id], fb = $('QF' + j);
    if (rec.solved) return;
    var sel = document.querySelector('input[name="' + id('Q' + j) + '"]:checked');
    if (!sel) { fb.className = 'mdqfb mdfbinfo'; fb.textContent = 'Choose an answer, then check it.'; return; }
    var c = +sel.value;
    rec.attempts++; rec.choice = c;
    if (rec.first === null) rec.first = (c === q.correct);
    if (c === q.correct) {
      rec.solved = true; lockQuestion(j);
      announce('Correct. ' + strip(q.explain));
      checkStage();
    } else {
      var ch = q.choices[c], msg = (typeof ch === 'object' && ch.fb) ? ch.fb : (q.hint || 'Look at the diagram and data again, then try another answer.');
      fb.className = 'mdqfb mdfbbad';
      fb.innerHTML = 'Not quite. ' + msg;
      announce('Not quite. ' + strip(msg));
    }
  }
  function stageSolved() {
    return cfg.questions.every(function(q){ return sh.questions[cfg.stage + '.' + q.id].solved; });
  }
  function checkStage() {
    if (!stageSolved()) return;
    sh.done[cfg.stage] = true;
    refreshAll(sh);
    showComplete();
  }

  /* ----- completion / results ----- */
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
    if (box.classList.contains('mdshow')) return;
    box.classList.add('mdshow');
    if (cfg.stage < TOTAL) {
      box.innerHTML = '<p class="mdcompmsg">\u2713 Stage ' + cfg.stage + ' complete.</p>'
        + '<button type="button" class="mdbtn mdbtnnext" id="' + id('Next') + '">Continue to stage ' + (cfg.stage + 1) + ': ' + STAGE_NAMES[cfg.stage] + '</button>';
      $('Next').addEventListener('click', function(){
        this.disabled = true; this.textContent = 'Stage ' + (cfg.stage + 1) + ' is open below';
        fire({ stage: cfg.stage, thisq: thisq });
        announce('Stage ' + (cfg.stage + 1) + ' is now open below.');
      });
      announce('Stage ' + cfg.stage + ' complete. Use the Continue button to open the next stage.');
    } else {
      box.innerHTML = '<p class="mdcompmsg">\u2713 All questions answered.</p>'
        + '<button type="button" class="mdbtn mdbtnnext" id="' + id('Fin') + '">Finish tutorial and show results</button>'
        + '<div id="' + id('Res') + '"></div>';
      $('Fin').addEventListener('click', finish);
      announce('All stages complete. Use the Finish button to see your results.');
    }
  }
  function results() {
    var r = { score: 0, total: 0, attempts: 0, stages: 0 };
    for (var k in sh.questions) if (sh.questions.hasOwnProperty(k)) {
      var q = sh.questions[k]; r.total++; r.attempts += q.attempts; if (q.first === true) r.score++;
    }
    for (var s = 1; s <= TOTAL; s++) if (sh.done[s]) r.stages++;
    r.percent = r.total ? Math.round(100*r.score/r.total) : 0;
    return r;
  }
  function writeBoxes(r) {
    var map = C.answerMap || {}, ok = [], miss = [];
    for (var f in map) if (map.hasOwnProperty(f)) {
      var code = pad3(map[f]), el = document.getElementById('qn' + thisq + code);
      if (!el) { miss.push(code); continue; }
      el.readOnly = false;
      el.value = String(r[f]);
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
      if (el) { if (!sh.finished) { el.readOnly = true; el.title = 'Filled in automatically when you finish the tutorial'; } }
      else pending++;
    }
    if (pending && tries < 10) setTimeout(function(){ lockBoxesEarly(tries + 1); }, 500);
  }
  function finish() {
    sh.finished = true;
    var r = results(), w = null;
    if (C.momSubmit) w = writeBoxes(r);
    var h = '<div class="mdresult" role="group" aria-labelledby="' + id('ResH') + '">'
      + '<h4 id="' + id('ResH') + '">Your results</h4><dl class="mdresdl">'
      + '<dt>Correct on first try</dt><dd>' + r.score + ' of ' + r.total + ' (' + r.percent + '%)</dd>'
      + '<dt>Answer checks used</dt><dd>' + r.attempts + '</dd>'
      + '<dt>Stages completed</dt><dd>' + r.stages + ' of ' + TOTAL + '</dd>'
      + '<dt>Finished</dt><dd>' + new Date().toLocaleString() + '</dd></dl>'
      + '<h4>Key ideas</h4><ul class="mdkeys">'
      + '<li>Equal spacing in a motion diagram means constant velocity; growing spacing means speeding up; shrinking spacing means slowing down.</li>'
      + '<li>On a line: speeding up when v and a have the same sign, slowing down when the signs are opposite.</li>'
      + '<li>Zero velocity does not mean zero acceleration.</li>'
      + '<li>' + PAR + ' (along v) changes the speed; ' + PERP + ' (perpendicular to v) changes the direction.</li>'
      + '<li>Angle between a and v: under 90\u00B0 speeding up, over 90\u00B0 slowing down, exactly 90\u00B0 constant speed.</li></ul>';
    if (w) {
      if (w.ok.length) h += '<p class="mdsubmitted">Results entered in answer box' + (w.ok.length > 1 ? 'es ' : ' ') + w.ok.join(', ') + '.</p>';
      if (w.miss.length) h += '<p class="mdsubmitwarn">Could not find answer box' + (w.miss.length > 1 ? 'es ' : ' ') + w.miss.join(', ') + ' on this page.</p>';
    }
    $('Res').innerHTML = h + '</div>';
    var fb = $('Fin'); fb.textContent = 'Update results';
    announce('Tutorial complete. ' + r.score + ' of ' + r.total + ' correct on the first try.' + (w && w.ok.length ? ' Results entered in the answer boxes.' : ''));
    fire({ stage: cfg.stage, thisq: thisq, results: r, answerWritten: !!(w && w.ok.length) });
  }

  /* ----- DOM ----- */
  function buildDOM() {
    var h = '<div class="mdroot" role="region" aria-label="Stage ' + cfg.stage + ' of ' + TOTAL + ': ' + cfg.title + '">'
      + '<div class="mda11y" role="toolbar" aria-label="Display options">'
      + '<button type="button" class="mda11ybtn" id="' + id('BtnLM') + '">Light mode</button>'
      + '<button type="button" class="mda11ybtn" id="' + id('BtnNR') + '">Narration: on</button>'
      + '<button type="button" class="mda11ybtn" id="' + id('BtnHC') + '">High contrast</button>'
      + '<button type="button" class="mda11ybtn" id="' + id('BtnFS') + '">Font size: normal</button></div>'
      + '<div id="' + id('Nar') + '" class="mdnarbar" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '<h3 class="mdtitle">Stage ' + cfg.stage + ': ' + cfg.title + '</h3>'
      + '<ol class="mdpills" aria-label="Tutorial stages">';
    for (var i = 1; i <= TOTAL; i++) {
      h += '<li id="' + id('Pill' + i) + '" class="mdpill' + (i === cfg.stage ? ' mdpillnow' : '') + '"' + (i === cfg.stage ? ' aria-current="step"' : '') + '>'
        + i + '. ' + STAGE_NAMES[i - 1] + '<span class="mdsr"></span></li>';
    }
    h += '</ol><div class="mdsim"><div class="mdpanels ' + (dim === 1 ? 'mdpan1' : 'mdpan2') + '">';
    panels.forEach(function(sc, i){
      var vw = G.VW, vh = G.VH;
      h += '<figure class="mdpanel mdk' + (sc.color || (i + 1)) + '" id="' + id('Fig' + i) + '">'
        + '<div class="mdpanelh">' + sc.name + ' \u2014 ' + sc.desc + '</div>'
        + '<svg class="mdsvg" id="' + id('Svg' + i) + '" viewBox="0 0 ' + vw + ' ' + vh + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="">'
        + staticSvg(i) + '<g id="' + id('Dyn' + i) + '"></g></svg>'
        + '<figcaption class="mdread" id="' + id('Read' + i) + '"></figcaption></figure>';
    });
    h += '</div><div class="mdclock" id="' + id('Clock') + '" aria-hidden="true">t = 0.00 s</div></div>'
      + '<div class="mdctl">';
    if (opts.length > 1) {
      h += '<fieldset class="mdopts"><legend>Show</legend>';
      opts.forEach(function(o, j){
        h += '<label class="mdopt"><input type="radio" name="' + id('Opt') + '" value="' + j + '"' + (j === S.opt ? ' checked' : '') + '> ' + o.label + '</label>';
      });
      h += '</fieldset>';
    }
    h += '<div class="mdbtns">'
      + '<button type="button" class="mdbtn mdbtnplay" id="' + id('Play') + '">Play</button>'
      + '<button type="button" class="mdbtn" id="' + id('Back') + '" aria-label="Step back ' + stepDt + ' seconds">\u25C0 Step</button>'
      + '<button type="button" class="mdbtn" id="' + id('Fwd') + '" aria-label="Step forward ' + stepDt + ' seconds">Step \u25B6</button>'
      + '<button type="button" class="mdbtn" id="' + id('Rst') + '">Reset</button>'
      + '<button type="button" class="mdbtn mdtoggle mda11yon" id="' + id('Vec') + '" aria-pressed="true">Vectors</button>'
      + '<button type="button" class="mdbtn mdtoggle" id="' + id('Tbl') + '" aria-pressed="false" aria-controls="' + id('Table') + '">Data table</button>'
      + '</div></div>'
      + '<div class="mdtable" id="' + id('Table') + '" hidden></div>'
      + '<section class="mdtext">' + cfg.text + '</section>'
      + '<section class="mdquiz" aria-labelledby="' + id('QH') + '"><h4 id="' + id('QH') + '">Check your understanding</h4>'
      + quizHTML() + '</section>'
      + '<div class="mdcomplete" id="' + id('Comp') + '" role="status"></div>'
      + '<span class="mdsr" id="' + id('Live') + '" aria-live="polite" aria-atomic="true"></span>'
      + '</div>';
    host.innerHTML = h;

    $('Play').addEventListener('click', play);
    $('Back').addEventListener('click', function(){ step(-1); });
    $('Fwd').addEventListener('click', function(){ step(1); });
    $('Rst').addEventListener('click', function(){ reset(false); });
    $('Vec').addEventListener('click', function(){
      S.vec = !S.vec; this.setAttribute('aria-pressed', S.vec ? 'true' : 'false');
      this.classList.toggle('mda11yon', S.vec); render();
      announce(S.vec ? 'Velocity and acceleration arrows shown.' : 'Arrows hidden.');
    });
    $('Tbl').addEventListener('click', function(){
      S.table = !S.table; this.setAttribute('aria-pressed', S.table ? 'true' : 'false');
      this.classList.toggle('mda11yon', S.table);
      $('Table').hidden = !S.table; render(true);
      announce(S.table ? 'Data table shown below the controls.' : 'Data table hidden.');
    });
    var radios = document.getElementsByName(id('Opt'));
    for (var r = 0; r < radios.length; r++) radios[r].addEventListener('change', function(){
      S.opt = +this.value; reset(true);
      announce('Showing ' + opts[S.opt].label + '. Press Play.');
    });
    cfg.questions.forEach(function(q, j){
      $('QB' + j).addEventListener('click', function(){ check(j); });
      var rec = sh.questions[cfg.stage + '.' + q.id];
      if (rec.solved) {
        var ins = document.getElementsByName(id('Q' + j));
        if (ins[q.correct]) ins[q.correct].checked = true;
        lockQuestion(j);
      }
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
  var nar = $('Nar'); if (nar) nar.textContent = cfg.ready || ('Stage ' + cfg.stage + ' ready. Press Play.');
}

window.MotionDiag = { mount: mount, version: '1.0', kin: kin };
})();
