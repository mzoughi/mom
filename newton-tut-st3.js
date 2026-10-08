/* =====================================================================
   NEWTON'S SECOND LAW TUTORIAL — STAGE 3: FREE-BODY DIAGRAM
   Interactive FBD (adapted from the FBD builder) checked by the sim:
   labels, missing/extra forces and directions (within +/-5 degrees).
   ===================================================================== */
(function(){
'use strict';
var NT = window.NTCore; if (!NT) return;
var thisq = window.ntThisq, N = 3;
var id = NT.ids(thisq, N);
var stKey = 'ntSt3_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, d:{} };
var S = window[stKey];
var sh = NT.shared(thisq);

var W = 400, OX = 200, OY = 200, LEN = 140, STEP = 5, TOL = 5, MAXF = 6;
var DIRS = [0,45,90,135,180,225,270,315], GLYPH = ['\u2192','\u2197','\u2191','\u2196','\u2190','\u2199','\u2193','\u2198'];
var DIR_HINT = {
  grav:'Gravity is never tilted. Which way does Earth pull?',
  norm:'A normal force is perpendicular to the contact surface, pointing away from it.',
  fric:'Friction acts along the contact surface, opposite to the sliding (or the tendency to slide).',
  ten:'A string can only pull, along its own length, toward its other end.',
  app:'Look at the direction of the push or pull in the picture.',
  drag:'Drag points opposite to the velocity.'
};

function D(i){ if (!S.d[i]) S.d[i] = { forces:[], sel:-1, verdict:{}, wrong:{}, msg:null, axes:'', axesOk:false, axMsg:null }; return S.d[i]; }
function norm(a){ a = Math.round(Number(a)/STEP)*STEP; return ((a % 360) + 360) % 360; }
function angDiff(a, b){ var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
/* Angle of the chosen +x axis in the real world. The diagram itself is always drawn
   with the chosen axes horizontal/vertical (the picture is rotated by this angle). */
function rot(){ var a = NT.SITS[S.cur].axes.dirs; for (var j=0;j<a.length;j++) if (a[j].n === 'x') return a[j].d; return 0; }
var ROT_HINT = {
  grav:'Gravity points toward Earth, but this diagram is rotated, so the real vertical is not along \u2212y. Use the angle marked in the scene to find how far gravity leans from \u2212y.',
  app:'The diagram is rotated: find the push\u2019s angle relative to the ramp (the x-axis), not relative to the horizontal.'
};
function dirName(a){
  if (rot()) {
    var ax = { 0:'along plus x', 90:'along plus y', 180:'along minus x', 270:'along minus y' };
    if (ax.hasOwnProperty(a)) return ax[a] + ', ' + a + ' degrees from the plus x axis';
    var qq = a < 90 ? 'between plus x and plus y' : a < 180 ? 'between plus y and minus x' : a < 270 ? 'between minus x and minus y' : 'between minus y and plus x';
    return qq + ', ' + a + ' degrees from the plus x axis';
  }
  var nm = {0:'to the right',45:'up and to the right',90:'straight up',135:'up and to the left',180:'to the left',225:'down and to the left',270:'straight down',315:'down and to the right'};
  if (nm.hasOwnProperty(a)) return nm[a] + ', ' + a + ' degrees';
  var q = a < 90 ? 'up and to the right' : a < 180 ? 'up and to the left' : a < 270 ? 'down and to the left' : 'down and to the right';
  return q + ', ' + a + ' degrees from the plus x axis';
}
function slotFor(i, key){
  var f = NT.SITS[i].forces;
  for (var j=0;j<f.length;j++) if (f[j].keys.indexOf(key) >= 0) return f[j];
  return null;
}
function speech(f){ return f.key ? NT.symSpeak(f.key, true) + ' (' + NT.FORCES[f.key].name.toLowerCase() + ')' : 'unlabeled force'; }

/* ---------- rendering ---------- */
function render(){
  var i = S.cur, Sit = NT.SITS[i], done = sh.sits[i].done[2], d = D(i), ready = done || d.axesOk;
  NT.renderTabsScene(thisq, N, i);
  var radios = '';
  Sit.axes.opts.forEach(function(o){
    var chosen = ready && o.id === Sit.axes.correct;
    radios += '<label><input type="radio" name="' + id('Ax') + '" value="' + o.id + '"' + (d.axes === o.id || chosen ? ' checked' : '') + (ready ? ' disabled' : '') + '><span>' + o.t
      + (chosen ? '<span class="ntaxchosen" aria-hidden="true"> \u2713</span><span class="ntsr"> (your choice, correct)</span>' : '') + '</span></label>';
  });
  var html = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Draw the free-body diagram</h4>'
    + '<fieldset class="ntaxesset"><legend>1. Choose the most convenient axes</legend>' + radios + '</fieldset>'
    + '<div class="ntfb" id="' + id('AxFb') + '"></div>';
  if (ready) {
    var remind = Sit.forces.map(function(f){ return NT.symH(NT.slotKey(thisq, i, f.slot), true); }).join(', ');
    html += '<p class="ntinstr"><b>2. Draw the free-body diagram on these axes.</b> The object is the dot at the origin. Add each force, give it a symbol, and aim it: select a force, then click or drag on the diagram, or type the angle (degrees from +x). With the diagram focused, \u2190/\u2192 rotate by 5\u00B0 (Shift: 45\u00B0) and number keys select a force.</p>'
      + (rot() && Sit.frameNote ? '<p class="ntfb ntfbinfo">' + Sit.frameNote + '</p>' : '')
      + '<p class="ntremind">Forces from Stage 1: ' + remind + '.</p>'
      + '<div class="ntfbdwrap">'
      + '<svg class="ntfbdsvg" id="' + id('Svg') + '" viewBox="0 0 400 400" tabindex="0" role="img" aria-label="Free-body diagram drawn on your chosen axes' + (rot() ? ', rotated so those axes are horizontal and vertical' : '') + '. Use the force controls, or focus here and use the arrow keys. Select Describe to hear the diagram."></svg>'
      + '<div class="ntfrows" id="' + id('Rows') + '"></div></div>'
      + '<div class="ntbtnrow">'
      + '<button type="button" class="ntbtn" id="' + id('Add') + '"' + (done ? ' disabled' : '') + '>Add force</button>'
      + '<button type="button" class="ntbtn" id="' + id('Seed') + '"' + (done ? ' disabled' : '') + '>Add my Stage 1 forces</button>'
      + '<button type="button" class="ntbtn" id="' + id('Desc') + '">Describe</button>'
      + '<button type="button" class="ntbtn" id="' + id('Clr') + '"' + (done ? ' disabled' : '') + '>Clear diagram</button>'
      + '<button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my diagram</button>'
      + '</div><div class="ntfb" id="' + id('Fb') + '"></div>';
  }
  var Wk = document.getElementById(id('Work'));
  Wk.innerHTML = html;
  var rad = Wk.querySelectorAll('input[type=radio]');
  for (var k=0;k<rad.length;k++) rad[k].addEventListener('change', function(){ chooseAxes(this.value); });
  if (ready) {
    setAxFb('<span class="ntfbhead">Good axes.</span> One axis lies along the acceleration (or, with a\u20D7 = 0\u20D7, along most of the forces), so as few forces as possible need splitting.'
      + (rot() ? ' The diagram below is drawn with these axes horizontal and vertical.' : ''), 'good');
    buildRows(); draw(); bind();
    if (done) showSuccess(false);
    else if (d.msg) setFb(d.msg.html, d.msg.tone);
    else setFb('Add the forces, aim them, then select <b>Check my diagram</b>.', '');
  } else if (d.axMsg) setAxFb(d.axMsg.html, d.axMsg.tone);
  else setAxFb('Before drawing, choose your axes. Tip: put one axis along the acceleration; if a\u20D7 = 0\u20D7, line the axes up with as many forces as possible.', '');
  if (NT.allDone(thisq, N)) completeBanner();
}
function setAxFb(html, tone){
  var fb = document.getElementById(id('AxFb'));
  fb.className = 'ntfb' + (tone ? ' ntfb' + tone : '');
  fb.innerHTML = NT.vecify(html);
}
function chooseAxes(v){
  var i = S.cur, Sit = NT.SITS[i], d = D(i);
  d.axes = v;
  if (v === Sit.axes.correct) {
    d.axesOk = true; d.axMsg = null; render();
    NT.announce(thisq, N, 'Good axes. Now draw the free-body diagram on them.' + (rot() ? ' The diagram is rotated so these axes are horizontal and vertical.' : ''));
    var a = document.getElementById(id('Add')); if (a) a.focus();
  } else {
    var o = Sit.axes.opts.filter(function(x){ return x.id === v; })[0];
    d.axMsg = { html:'<span class="ntfbhead">Possible, but not the best choice.</span> ' + o.fb, tone:'bad' };
    setAxFb(d.axMsg.html, 'bad');
    NT.announce(thisq, N, 'Possible, but not the best choice. ' + o.fb);
  }
}
function draw(){
  var i = S.cur, d = D(i), svg = document.getElementById(id('Svg')); if (!svg) return;
  var R = 0, s = '<g class="ntgrid"' + (R ? ' transform="rotate(' + (-R) + ' 200 200)"' : '') + '>';
  var lo = R ? -100 : 25, hi = R ? 500 : W;
  for (var v=lo; v<hi; v+=25) s += '<line x1="'+v+'" y1="'+(R?-100:0)+'" x2="'+v+'" y2="'+(R?500:400)+'"/><line x1="'+(R?-100:0)+'" y1="'+v+'" x2="'+(R?500:400)+'" y2="'+v+'"/>';
  s += '</g>';
  if (!R) {
    s += NT.arrow(8, OY, W-6, OY, 'ntaxis', {head:10}) + NT.arrow(OX, W-8, OX, 6, 'ntaxis', {head:10});
    s += '<text class="ntaxlbl" x="380" y="186">x</text><text class="ntaxlbl" x="210" y="20">y</text>';
  } else {
    [[R,'x'],[R+90,'y']].forEach(function(ax){
      var a = ax[0]*Math.PI/180, ux = Math.cos(a), uy = -Math.sin(a), E = 188;
      s += NT.arrow(OX - ux*E, OY - uy*E, OX + ux*E, OY + uy*E, 'ntaxis', {head:10});
      var lx = Math.max(10, Math.min(388, OX + ux*(E-6) - uy*14 - 5)), ly = Math.max(16, Math.min(394, OY + uy*(E-6) + ux*14 + 5));
      s += '<text class="ntaxlbl" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'">' + ax[1] + '</text>';
    });
  }
  var seen = {};
  d.forces.forEach(function(f, k){
    if (f.ang === null) return;
    var a = (f.ang + R)*Math.PI/180, tx = OX + LEN*Math.cos(a), ty = OY - LEN*Math.sin(a);
    var cls = f.key ? NT.colorClass(f.key) : 'ntk-other';
    if (k === d.sel) s += '<line class="ntselband" x1="'+OX+'" y1="'+OY+'" x2="'+tx.toFixed(1)+'" y2="'+ty.toFixed(1)+'"/>';
    s += NT.arrow(OX, OY, tx, ty, cls, {head:14});
    s += '<g class="' + cls + '"><circle cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'" r="4.5"/></g>';
    var nn = seen[f.ang] || 0; seen[f.ang] = nn + 1;
    var px = -Math.sin(a), py = -Math.cos(a), side = 16 + nn*24;
    var lx = Math.max(22, Math.min(W-26, tx + Math.cos(a)*26 + px*side)), ly = Math.max(22, Math.min(W-14, ty - Math.sin(a)*26 + py*side));
    if (f.key) s += NT.vecLabel(lx, ly, f.key, cls);
    else s += '<text class="ntaxlbl" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="middle">#' + (k+1) + '?</text>';
  });
  s += '<circle class="ntorigin" cx="'+OX+'" cy="'+OY+'" r="6"/>';
  if (!d.forces.length) s += '<text class="ntaxlbl" x="200" y="380" text-anchor="middle" style="font-style:normal;font-size:14px">Add a force to begin.</text>';
  svg.innerHTML = s;
}
function buildRows(){
  var i = S.cur, d = D(i), done = sh.sits[i].done[2], host = document.getElementById(id('Rows'));
  var html = '';
  d.forces.forEach(function(f, k){
    var lab = 'force ' + (k+1), v = d.verdict[k];
    var symOpts = '<option value="">\u2014 symbol \u2014</option>';
    NT.FORCE_ORDER.forEach(function(key){
      var F = NT.FORCES[key];
      symOpts += '<option value="' + key + '"' + (f.key === key ? ' selected' : '') + '>F_' + F.sub + ' (' + F.name.toLowerCase() + ')</option>';
    });
    var dirOpts = '<option value="">dir</option>';
    DIRS.forEach(function(a, j){
    var lab = rot() ? (a + '\u00B0' + (a % 90 === 0 ? ' (' + ['+x','+y','\u2212x','\u2212y'][a/90] + ')' : '')) : (GLYPH[j] + ' ' + a + '\u00B0');
    dirOpts += '<option value="' + a + '"' + (f.ang === a ? ' selected' : '') + '>' + lab + '</option>';
  });
    var dis = done ? ' disabled' : '';
    html += '<div class="ntfrow ' + (f.key ? NT.colorClass(f.key) : 'ntk-other') + (k === d.sel ? ' ntfrowsel' : '') + (v === 'ok' ? ' ntfrowok' : v === 'bad' ? ' ntfrowbad' : '') + '">'
      + '<button type="button" class="ntbtn" data-act="sel" data-k="' + k + '" aria-pressed="' + (k === d.sel ? 'true' : 'false') + '" aria-label="Select ' + lab + '">Force ' + (k+1) + '</button>'
      + '<select data-act="sym" data-k="' + k + '" aria-label="Symbol of ' + lab + '"' + dis + '>' + symOpts + '</select>'
      + '<select data-act="dir" data-k="' + k + '" aria-label="Quick direction of ' + lab + '"' + dis + '>' + dirOpts + '</select>'
      + '<input type="number" min="0" max="359" step="5" data-act="ang" data-k="' + k + '" value="' + (f.ang === null ? '' : f.ang) + '" aria-label="Angle of ' + lab + ' in degrees from the plus x axis"' + dis + '><span aria-hidden="true">\u00B0</span>'
      + '<span class="ntstat" aria-hidden="true" style="color:var(' + (v === 'ok' ? '--nt-good' : '--nt-bad') + ')">' + (v === 'ok' ? '\u2713' : v === 'bad' ? '\u2717' : '') + '</span>'
      + (v ? '<span class="ntsr">' + (v === 'ok' ? 'correct' : 'needs fixing') + '</span>' : '')
      + '<button type="button" class="ntbtn" data-act="rm" data-k="' + k + '" aria-label="Remove ' + lab + '"' + dis + '>\u2715</button>'
      + '</div>';
  });
  host.innerHTML = html;
}
function refresh(){ buildRows(); draw(); }
function setFb(html, tone){
  var fb = document.getElementById(id('Fb'));
  fb.className = 'ntfb' + (tone ? ' ntfb' + tone : '');
  fb.innerHTML = NT.vecify(html);
}
function clearVerdict(k){ var d = D(S.cur); delete d.verdict[k]; }

/* ---------- actions ---------- */
function addForce(key){
  var d = D(S.cur);
  if (d.forces.length >= MAXF) { NT.announce(thisq, N, 'The diagram already has the maximum of ' + MAXF + ' forces.'); return; }
  d.forces.push({ key:key || '', ang:null }); d.sel = d.forces.length - 1; d.verdict = {};
  refresh();
  NT.announce(thisq, N, 'Force ' + d.forces.length + ' added and selected. Choose its symbol and aim it.');
}
function setDir(k, a){
  var d = D(S.cur), f = d.forces[k]; if (!f) return;
  f.ang = norm(a); d.sel = k; clearVerdict(k); refresh();
  NT.announce(thisq, N, 'Force ' + (k+1) + ', ' + speech(f) + ', points ' + dirName(f.ang) + '.');
}
function describe(){
  var d = D(S.cur);
  if (!d.forces.length) { NT.announce(thisq, N, 'The diagram is empty. Add a force to begin.'); return; }
  var msg = 'Your diagram has ' + d.forces.length + (d.forces.length === 1 ? ' force. ' : ' forces. ');
  d.forces.forEach(function(f, k){ msg += 'Force ' + (k+1) + ', ' + speech(f) + ', ' + (f.ang === null ? 'has no direction yet. ' : 'points ' + dirName(f.ang) + '. '); });
  NT.announce(thisq, N, msg);
}
function bind(){
  var rows = document.getElementById(id('Rows'));
  rows.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    var k = parseInt(b.getAttribute('data-k'), 10), d = D(S.cur), act = b.getAttribute('data-act');
    if (act === 'sel') { d.sel = k; refresh(); NT.announce(thisq, N, 'Force ' + (k+1) + ' selected: ' + speech(d.forces[k]) + '.'); }
    else if (act === 'rm') {
      var gone = speech(d.forces[k]); d.forces.splice(k, 1); d.verdict = {};
      if (d.sel >= d.forces.length) d.sel = d.forces.length - 1;
      refresh(); NT.announce(thisq, N, 'Removed ' + gone + '. ' + d.forces.length + ' forces remain.');
    }
  });
  rows.addEventListener('change', function(e){
    var t = e.target, k = parseInt(t.getAttribute('data-k'), 10), d = D(S.cur), act = t.getAttribute('data-act');
    if (act === 'sym') {
      var key = t.value;
      for (var j=0;j<d.forces.length;j++) if (j !== k && key && d.forces[j].key === key) {
        t.value = d.forces[k].key; NT.announce(thisq, N, 'That symbol is already used by force ' + (j+1) + '.'); return;
      }
      d.forces[k].key = key; d.sel = k; clearVerdict(k); refresh();
      NT.announce(thisq, N, 'Force ' + (k+1) + ' is now ' + speech(d.forces[k]) + '.' + (d.forces[k].ang === null ? ' Now aim it.' : ''));
    }
    else if ((act === 'dir' || act === 'ang') && t.value !== '') setDir(k, t.value);
  });
  document.getElementById(id('Add')).addEventListener('click', function(){ addForce(''); });
  document.getElementById(id('Seed')).addEventListener('click', function(){
    var i = S.cur, d = D(i), added = 0;
    NT.SITS[i].forces.forEach(function(f){
      var key = NT.slotKey(thisq, i, f.slot), have = false;
      d.forces.forEach(function(g){ if (g.key === key) have = true; });
      if (!have && d.forces.length < MAXF) { d.forces.push({ key:key, ang:null }); added++; }
    });
    if (d.sel < 0 && d.forces.length) d.sel = 0;
    d.verdict = {}; refresh();
    NT.announce(thisq, N, added ? added + ' labeled forces added without directions. Aim each one.' : 'Your Stage 1 forces are already on the diagram.');
  });
  document.getElementById(id('Desc')).addEventListener('click', describe);
  document.getElementById(id('Clr')).addEventListener('click', function(){
    var keep = D(S.cur); S.d[S.cur] = null; var nd = D(S.cur); nd.axes = keep.axes; nd.axesOk = keep.axesOk;
    render(); NT.announce(thisq, N, 'Diagram cleared.');
  });
  document.getElementById(id('Check')).addEventListener('click', check);

  var svg = document.getElementById(id('Svg')), dragging = false;
  function pos(e){ var r = svg.getBoundingClientRect(); return [(e.clientX - r.left)*W/r.width, (e.clientY - r.top)*W/r.height]; }
  function aim(p){
    var d = D(S.cur); if (d.sel < 0 || !d.forces[d.sel]) return;
    var dx = p[0]-OX, dy = OY-p[1]; if (dx*dx + dy*dy < 144) return;
    var a = norm(Math.atan2(dy, dx)*180/Math.PI), f = d.forces[d.sel];
    if (f.ang !== a) { f.ang = a; clearVerdict(d.sel); refresh(); }
  }
  svg.addEventListener('pointerdown', function(e){
    if (sh.sits[S.cur].done[2]) return;
    var d = D(S.cur), p = pos(e), hit = -1;
    for (var k=d.forces.length-1; k>=0; k--){
      var f = d.forces[k]; if (f.ang === null) continue;
      var a = f.ang*Math.PI/180, tx = OX + LEN*Math.cos(a), ty = OY - LEN*Math.sin(a);
      if ((tx-p[0])*(tx-p[0]) + (ty-p[1])*(ty-p[1]) < 324) { hit = k; break; }
    }
    if (hit >= 0) d.sel = hit;
    else if (d.sel < 0 || !d.forces[d.sel]) {
      for (var j=0;j<d.forces.length;j++) if (d.forces[j].ang === null) { d.sel = j; break; }
      if (d.sel < 0) { describe(); return; }
    }
    dragging = true;
    try { svg.setPointerCapture(e.pointerId); } catch(err){}
    if (hit < 0) aim(p); else refresh();
    e.preventDefault();
  });
  svg.addEventListener('pointermove', function(e){ if (dragging) aim(pos(e)); });
  function end(){ if (!dragging) return; dragging = false; var d = D(S.cur), f = d.forces[d.sel]; if (f && f.ang !== null) NT.announce(thisq, N, 'Force ' + (d.sel+1) + ', ' + speech(f) + ', points ' + dirName(f.ang) + '.'); }
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', function(e){
    if (sh.sits[S.cur].done[2]) return;
    var d = D(S.cur), key = e.key;
    if (key >= '1' && key <= '9') { var n = parseInt(key, 10) - 1; if (n < d.forces.length) { d.sel = n; refresh(); NT.announce(thisq, N, 'Force ' + (n+1) + ' selected: ' + speech(d.forces[n]) + '.'); e.preventDefault(); } return; }
    if (d.sel < 0 || !d.forces[d.sel]) return;
    var f = d.forces[d.sel], a = f.ang === null ? 0 : f.ang, st = e.shiftKey ? 45 : STEP;
    if (key === 'ArrowLeft' || key === 'ArrowUp') { setDir(d.sel, a + st); e.preventDefault(); }
    else if (key === 'ArrowRight' || key === 'ArrowDown') { setDir(d.sel, a - st); e.preventDefault(); }
  });
}

/* ---------- checking ---------- */
function check(){
  var i = S.cur, Sit = NT.SITS[i], d = D(i), issues = [], verdict = {}, used = {};
  sh.sits[i].tries[2]++;
  if (!d.forces.length) { setFb('The diagram is empty. Add the forces first.', 'bad'); NT.announce(thisq, N, 'The diagram is empty.'); return; }
  var incomplete = [];
  d.forces.forEach(function(f, k){ if (!f.key || f.ang === null) incomplete.push(k+1); });
  if (incomplete.length) {
    var m = 'Force ' + incomplete.join(', ') + (incomplete.length === 1 ? ' needs' : ' need') + ' both a symbol and a direction before the diagram can be checked.';
    setFb(m, 'bad'); NT.announce(thisq, N, m); return;
  }
  d.forces.forEach(function(f, k){
    var F = NT.FORCES[f.key], slot = slotFor(i, f.key), tag = '<b>Force ' + (k+1) + ' (' + NT.symH(f.key, true) + '):</b> ';
    if (!F.real) { verdict[k] = 'bad'; issues.push(tag + F.why); return; }
    if (!slot) { verdict[k] = 'bad'; issues.push(tag + (Sit.absent[f.key] || 'this force does not act on the object here.')); return; }
    if (used[slot.slot]) { verdict[k] = 'bad'; issues.push(tag + 'this is the same pull as force ' + (used[slot.slot]) + '. Remove one of them.'); return; }
    used[slot.slot] = k + 1;
    if (angDiff(f.ang, norm(slot.dir - rot())) <= TOL) { verdict[k] = 'ok'; return; }
    verdict[k] = 'bad';
    d.wrong[slot.slot] = (d.wrong[slot.slot] || 0) + 1;
    issues.push(tag + 'the direction is off. ' + ((rot() && ROT_HINT[slot.keys[0]]) || DIR_HINT[slot.keys[0]]) + (d.wrong[slot.slot] >= 2 ? ' <i>' + slot.tip + '</i>' : ''));
  });
  Sit.forces.forEach(function(f){
    if (!used[f.slot]) issues.push('<b>Missing:</b> ' + NT.symH(NT.slotKey(thisq, i, f.slot), true) + ' acts on the object but is not on the diagram.');
  });
  d.verdict = verdict;
  if (!issues.length) {
    sh.sits[i].done[2] = true; d.msg = null; NT.report(thisq);
    render(); showSuccess(true); return;
  }
  var good = Object.keys(verdict).filter(function(k){ return verdict[k] === 'ok'; }).length;
  var html = '<span class="ntfbhead">' + good + ' of ' + Sit.forces.length + ' forces correct so far.</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  d.msg = { html:html, tone:'bad' };
  refresh(); setFb(html, 'bad');
  NT.announce(thisq, N, good + ' of ' + Sit.forces.length + ' forces correct. ' + issues[0]);
}
function showSuccess(say){
  var i = S.cur, Sit = NT.SITS[i];
  var list = Sit.forces.map(function(f){ return NT.symH(NT.slotKey(thisq, i, f.slot), true) + ' at ' + norm(f.dir - rot()) + '\u00B0'; }).join(', ');
  setFb('<span class="ntfbhead">Correct free-body diagram.</span> ' + list + (rot() ? ' (measured from +x on your chosen axes). Notice how many forces now lie exactly along an axis: only the tilted ones will need splitting into components.' : '.') + ' Every arrow starts on the object and points the way its agent pushes or pulls.' + NT.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next'));
  if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say) {
    NT.announce(thisq, N, 'Correct free-body diagram.');
    if (NT.allDone(thisq, N)) { completeBanner(); var b = document.getElementById(id('Cont')); if (b) b.focus(); }
  }
}
function completeBanner(){
  NT.showStageComplete(thisq, N, 'All five free-body diagrams are correct. Last step: choose axes and resolve Newton\u2019s second law into components.');
}
function goTo(i){
  S.cur = i; render(); NT.focusHeading(thisq, N);
  NT.announce(thisq, N, 'Situation ' + (i+1) + ': ' + NT.SITS[i].title + '.');
}

NT.mount(thisq, N, 'nt3Root' + thisq, {
  label:'Newton\u2019s second law tutorial, stage 3: free-body diagrams',
  subtitle:'For each situation, choose convenient axes, then draw the free-body diagram on them. The simulation checks the symbols and the directions of your arrows.',
  render:render,
  onTab:goTo,
  onShow:function(){ NT.announce(thisq, N, 'Stage 3 ready. Draw the free-body diagram for situation ' + (S.cur+1) + '.'); }
});
})();
