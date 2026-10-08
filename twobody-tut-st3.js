/* =====================================================================
   TWO-BODY TUTORIAL — STAGE 3: FREE-BODY DIAGRAMS (one per block)
   Each FBD is checked by the sim: labels, forces on the wrong block,
   missing/extra forces and directions (+/-5 deg). Blocks on ramps use
   The student first chooses the axes; each FBD is then drawn with that block's
   chosen axes horizontal/vertical (x along the block's motion). Angles from +x.
   ===================================================================== */
(function(){
'use strict';
var TB = window.TBCore; if (!TB) return;
var thisq = window.tbThisq, N = 3;
var id = TB.ids(thisq, N);
var stKey = 'tbSt3_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, d:{} };
var S = window[stKey];
var sh = TB.shared(thisq);

var W = 400, OX = 200, OY = 200, LEN = 140, STEP = 5, TOL = 5, MAXF = 7;
var DIRS = [0,45,90,135,180,225,270,315], GLYPH = ['\u2192','\u2197','\u2191','\u2196','\u2190','\u2199','\u2193','\u2198'];
var DIR_HINT = {
  grav:'Gravity always points straight down on the page.',
  norm:'A normal force is perpendicular to the contact surface, pointing away from the surface that exerts it.',
  fric:'Friction acts along the contact surface, opposite to the sliding (or the tendency to slide) of this block relative to the surface.',
  ten:'A string can only pull, along its own length, away from the block.',
  app:'Look at the direction of the push or pull in the picture.'
};

function D(i, b){
  if (!S.d[i]) S.d[i] = { msg:null };
  if (!S.d[i][b]) S.d[i][b] = { forces:[], sel:-1, verdict:{}, wrong:{} };
  return S.d[i][b];
}
function rot(b){ return TB.frame(S.cur, b); }   /* real-world angle of block b's +x; the drawing is rotated by it */
function axState(i){ if (!S.d[i]) S.d[i] = { msg:null }; if (!S.d[i].ax) S.d[i].ax = { axes:'', ok:false, msg:null }; return S.d[i].ax; }
function norm(a){ a = Math.round(Number(a)/STEP)*STEP; return ((a % 360) + 360) % 360; }
function angDiff(a, c){ var d = Math.abs(a - c) % 360; return d > 180 ? 360 - d : d; }
function dirName(a, b){
  if (rot(b)) {
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
function speech(f){ return f.key ? TB.symSpeak(f.key, true) + ' (' + TB.LBL[f.key].name + ')' : 'unlabeled force'; }

/* ---------- rendering ---------- */
function bodyCard(i, b, done){
  var dis = done ? ' disabled' : '';
  var remind = TB.bodyForces(i, b).map(function(f){ return TB.symH(f.slot, true); }).join(', ');
  var xd = TB.SITS[i].axes.bodies[b].xdesc;
  var note = rot(b) ? '<p class="ntfb ntfbinfo">Block ' + b + '\u2019s diagram is drawn with its chosen axes horizontal and vertical: <b>+x points ' + xd + '</b>. The picture is rotated, so the real vertical is no longer straight down on this diagram. Measure angles from +x.</p>' : '';
  return '<div class="tbbody" role="group" aria-labelledby="' + id('BH' + b) + '">'
    + '<div class="tbbodyh" id="' + id('BH' + b) + '"><span class="tbbodytag">' + b + '</span> Free-body diagram of block ' + b + '</div>'
    + note + '<p class="ntremind">Forces on block ' + b + ' from Stage 1: ' + remind + '.</p>'
    + '<svg class="ntfbdsvg" id="' + id('Svg' + b) + '" viewBox="0 0 400 400" tabindex="0" role="img" aria-label="Free-body diagram of block ' + b + (rot(b) ? ', rotated so its chosen axes are horizontal and vertical' : '') + '. Use the force controls, or focus here and use the arrow keys. Select Describe to hear the diagram."></svg>'
    + '<div class="ntfrows" id="' + id('Rows' + b) + '"></div>'
    + '<div class="ntbtnrow">'
    + '<button type="button" class="ntbtn" data-act="add" data-b="' + b + '"' + dis + '>Add force</button>'
    + '<button type="button" class="ntbtn" data-act="seed" data-b="' + b + '"' + dis + '>Add block ' + b + '\u2019s Stage 1 forces</button>'
    + '<button type="button" class="ntbtn" data-act="desc" data-b="' + b + '">Describe</button>'
    + '<button type="button" class="ntbtn" data-act="clr" data-b="' + b + '"' + dis + '>Clear</button></div></div>';
}
function render(){
  var i = S.cur, Sit = TB.SITS[i], done = sh.sits[i].done[2], ax = axState(i), ready = done || ax.ok;
  TB.renderTabsScene(thisq, N, i);
  var radios = '';
  Sit.axes.opts.forEach(function(o){
    var chosen = ready && o.id === Sit.axes.correct;
    radios += '<label><input type="radio" name="' + id('Ax') + '" value="' + o.id + '"' + (ax.axes === o.id || chosen ? ' checked' : '') + (ready ? ' disabled' : '') + '><span>' + o.t
      + (chosen ? '<span class="ntaxchosen" aria-hidden="true"> \u2713</span><span class="ntsr"> (your choice, correct)</span>' : '') + '</span></label>';
  });
  var html = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Draw a free-body diagram for each block</h4>'
    + '<fieldset class="ntaxesset"><legend>1. Choose the most convenient axes</legend>' + radios + '</fieldset>'
    + '<div class="ntfb" id="' + id('AxFb') + '"></div>';
  if (ready) html += '<p class="ntinstr"><b>2. Draw each block\u2019s diagram on its axes.</b> Each block is the dot at the origin of its own diagram. Add each force, give it its label, and aim it: select a force, then click or drag on the diagram, or type the angle (degrees from +x). With a diagram focused, \u2190/\u2192 rotate by 5\u00B0 (Shift: 45\u00B0) and number keys select a force.</p>'
    + '<div class="tbfbdpair">' + bodyCard(i, 1, done) + bodyCard(i, 2, done) + '</div>'
    + '<div class="ntbtnrow"><button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check both diagrams</button></div>'
    + '<div class="ntfb" id="' + id('Fb') + '"></div>';
  var Wk = document.getElementById(id('Work'));
  Wk.innerHTML = html;
  var rad = Wk.querySelectorAll('input[type=radio]');
  for (var k=0;k<rad.length;k++) rad[k].addEventListener('change', function(){ chooseAxes(this.value); });
  if (!Wk.getAttribute('data-bound')) { Wk.setAttribute('data-bound', '1'); delegate(Wk); }
  if (ready) {
    setAxFb('<span class="ntfbhead">Good axes.</span> Each block has its x-axis along its own acceleration, positive in its direction of motion, so both blocks share +<i>a</i>. Each diagram below is drawn with that block\u2019s axes horizontal and vertical.', 'good');
    [1,2].forEach(function(b){ buildRows(b); draw(b); bindBody(b); });
    document.getElementById(id('Check')).addEventListener('click', check);
    var d = S.d[i];
    if (done) showSuccess(false);
    else if (d && d.msg) setFb(d.msg.html, d.msg.tone);
    else setFb('Draw both diagrams, then select <b>Check both diagrams</b>.', '');
  } else if (ax.msg) setAxFb(ax.msg.html, ax.msg.tone);
  else setAxFb('Before drawing, choose the axes. Tip: for each block, put x along that block\u2019s acceleration, positive in the direction it moves.', '');
  if (TB.allDone(thisq, N)) completeBanner();
}
function setAxFb(html, tone){ TB.setFb(document.getElementById(id('AxFb')), html, tone); }
function chooseAxes(v){
  var i = S.cur, Sit = TB.SITS[i], ax = axState(i);
  ax.axes = v;
  if (v === Sit.axes.correct) {
    ax.ok = true; ax.msg = null; render();
    say('Good axes. Now draw both diagrams; each is drawn with that block\u2019s axes horizontal and vertical.');
    var a = document.querySelector('#' + id('Work') + ' button[data-act="add"]'); if (a) a.focus();
  } else {
    var o = Sit.axes.opts.filter(function(x){ return x.id === v; })[0];
    ax.msg = { html:'<span class="ntfbhead">Possible, but not the best choice.</span> ' + o.fb, tone:'bad' };
    setAxFb(ax.msg.html, 'bad'); say('Possible, but not the best choice. ' + o.fb);
  }
}
function draw(b){
  var d = D(S.cur, b), svg = document.getElementById(id('Svg' + b)); if (!svg) return;
  var R = 0, s = '<g class="ntgrid"' + (R ? ' transform="rotate(' + (-R) + ' 200 200)"' : '') + '>';
  var lo = R ? -100 : 25, hi = R ? 500 : W;
  for (var v=lo; v<hi; v+=25) s += '<line x1="'+v+'" y1="'+(R?-100:0)+'" x2="'+v+'" y2="'+(R?500:400)+'"/><line x1="'+(R?-100:0)+'" y1="'+v+'" x2="'+(R?500:400)+'" y2="'+v+'"/>';
  s += '</g>';
  if (!R) {
    s += TB.arrow(8, OY, W-6, OY, 'ntaxis', {head:10}) + TB.arrow(OX, W-8, OX, 6, 'ntaxis', {head:10});
    s += '<text class="ntaxlbl" x="380" y="186">x</text><text class="ntaxlbl" x="210" y="20">y</text>';
  } else {
    [[R,'x'],[R+90,'y']].forEach(function(ax){
      var a = ax[0]*Math.PI/180, ux = Math.cos(a), uy = -Math.sin(a), E = 188;
      s += TB.arrow(OX - ux*E, OY - uy*E, OX + ux*E, OY + uy*E, 'ntaxis', {head:10});
      var lx = Math.max(10, Math.min(388, OX + ux*(E-6) - uy*14 - 5)), ly = Math.max(16, Math.min(394, OY + uy*(E-6) + ux*14 + 5));
      s += '<text class="ntaxlbl" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'">' + ax[1] + '</text>';
    });
  }
  var seen = {};
  d.forces.forEach(function(f, k){
    if (f.ang === null) return;
    var a = (f.ang + R)*Math.PI/180, tx = OX + LEN*Math.cos(a), ty = OY - LEN*Math.sin(a);
    var cls = f.key ? TB.colorClass(f.key) : 'ntk-other';
    if (k === d.sel) s += '<line class="ntselband" x1="'+OX+'" y1="'+OY+'" x2="'+tx.toFixed(1)+'" y2="'+ty.toFixed(1)+'"/>';
    s += TB.arrow(OX, OY, tx, ty, cls, {head:14}) + '<g class="' + cls + '"><circle cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'" r="4.5"/></g>';
    var nn = seen[f.ang] || 0; seen[f.ang] = nn + 1;
    var px = -Math.sin(a), py = -Math.cos(a), side = 16 + nn*26;
    var lx = Math.max(26, Math.min(W-30, tx + Math.cos(a)*26 + px*side)), ly = Math.max(22, Math.min(W-14, ty - Math.sin(a)*26 + py*side));
    if (f.key) s += TB.vecLabel(lx, ly, f.key, cls);
    else s += '<text class="ntaxlbl" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="middle">#' + (k+1) + '?</text>';
  });
  s += '<circle class="ntorigin" cx="'+OX+'" cy="'+OY+'" r="6"/><text class="tbblk" x="'+(OX+10)+'" y="'+(OY+20)+'">' + b + '</text>';
  if (!d.forces.length) s += '<text class="ntaxlbl" x="200" y="382" text-anchor="middle" style="font-style:normal;font-size:14px">Add a force to begin.</text>';
  svg.innerHTML = s;
}
function buildRows(b){
  var i = S.cur, d = D(i, b), done = sh.sits[i].done[2], host = document.getElementById(id('Rows' + b)), html = '';
  d.forces.forEach(function(f, k){
    var lab = 'force ' + (k+1) + ' on block ' + b, v = d.verdict[k], dis = done ? ' disabled' : '';
    var so = '<option value="">\u2014 label \u2014</option>';
    TB.LBL_ORDER.forEach(function(key){ so += '<option value="' + key + '"' + (f.key === key ? ' selected' : '') + '>F_' + TB.LBL[key].sub + ' (' + TB.LBL[key].name + ')</option>'; });
    var dop = '<option value="">dir</option>';
    DIRS.forEach(function(a, j){
      var t = rot(b) ? (a + '\u00B0' + (a % 90 === 0 ? ' (' + ['+x','+y','\u2212x','\u2212y'][a/90] + ')' : '')) : (GLYPH[j] + ' ' + a + '\u00B0');
      dop += '<option value="' + a + '"' + (f.ang === a ? ' selected' : '') + '>' + t + '</option>';
    });
    html += '<div class="ntfrow ' + (f.key ? TB.colorClass(f.key) : 'ntk-other') + (k === d.sel ? ' ntfrowsel' : '') + (v === 'ok' ? ' ntfrowok' : v === 'bad' ? ' ntfrowbad' : '') + '">'
      + '<button type="button" class="ntbtn" data-act="sel" data-b="' + b + '" data-k="' + k + '" aria-pressed="' + (k === d.sel ? 'true' : 'false') + '" aria-label="Select ' + lab + '">Force ' + (k+1) + '</button>'
      + '<select data-act="sym" data-b="' + b + '" data-k="' + k + '" aria-label="Label of ' + lab + '"' + dis + '>' + so + '</select>'
      + '<select data-act="dir" data-b="' + b + '" data-k="' + k + '" aria-label="Quick direction of ' + lab + '"' + dis + '>' + dop + '</select>'
      + '<input type="number" min="0" max="359" step="5" data-act="ang" data-b="' + b + '" data-k="' + k + '" value="' + (f.ang === null ? '' : f.ang) + '" aria-label="Angle of ' + lab + ' in degrees from the plus x axis"' + dis + '><span aria-hidden="true">\u00B0</span>'
      + '<span class="ntstat" aria-hidden="true" style="color:var(' + (v === 'ok' ? '--nt-good' : '--nt-bad') + ')">' + (v === 'ok' ? '\u2713' : v === 'bad' ? '\u2717' : '') + '</span>'
      + (v ? '<span class="ntsr">' + (v === 'ok' ? 'correct' : 'needs fixing') + '</span>' : '')
      + '<button type="button" class="ntbtn" data-act="rm" data-b="' + b + '" data-k="' + k + '" aria-label="Remove ' + lab + '"' + dis + '>\u2715</button></div>';
  });
  host.innerHTML = html;
}
function refresh(b){ buildRows(b); draw(b); }
function setFb(html, tone){ TB.setFb(document.getElementById(id('Fb')), html, tone); }
function say(m){ TB.announce(thisq, N, m); }

/* ---------- actions ---------- */
function setDir(b, k, a){
  var d = D(S.cur, b), f = d.forces[k]; if (!f) return;
  f.ang = norm(a); d.sel = k; delete d.verdict[k]; refresh(b);
  say('Block ' + b + ', force ' + (k+1) + ', ' + speech(f) + ', points ' + dirName(f.ang, b) + '.');
}
function describe(b){
  var d = D(S.cur, b);
  if (!d.forces.length) { say('Block ' + b + '\u2019s diagram is empty.'); return; }
  var m = 'Block ' + b + '\u2019s diagram has ' + d.forces.length + (d.forces.length === 1 ? ' force. ' : ' forces. ');
  d.forces.forEach(function(f, k){ m += 'Force ' + (k+1) + ', ' + speech(f) + ', ' + (f.ang === null ? 'has no direction yet. ' : 'points ' + dirName(f.ang, b) + '. '); });
  say(m);
}
function delegate(Wk){
  Wk.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('button[data-act]') : null; if (!t || t.disabled) return;
    var b = parseInt(t.getAttribute('data-b'), 10), act = t.getAttribute('data-act'), k = parseInt(t.getAttribute('data-k'), 10), d = D(S.cur, b);
    if (act === 'add') {
      if (d.forces.length >= MAXF) { say('Maximum of ' + MAXF + ' forces.'); return; }
      d.forces.push({ key:'', ang:null }); d.sel = d.forces.length - 1; d.verdict = {}; refresh(b);
      say('Force ' + d.forces.length + ' added to block ' + b + ' and selected. Choose its label and aim it.');
    } else if (act === 'seed') {
      var added = 0;
      TB.bodyForces(S.cur, b).forEach(function(f){
        var have = d.forces.some(function(g){ return g.key === f.slot; });
        if (!have && d.forces.length < MAXF) { d.forces.push({ key:f.slot, ang:null }); added++; }
      });
      if (d.sel < 0 && d.forces.length) d.sel = 0;
      d.verdict = {}; refresh(b);
      say(added ? added + ' labeled forces added to block ' + b + ' without directions. Aim each one.' : 'Those forces are already on the diagram.');
    } else if (act === 'desc') describe(b);
    else if (act === 'clr') { S.d[S.cur][b] = null; refresh(b); say('Block ' + b + '\u2019s diagram cleared.'); }
    else if (act === 'sel') { d.sel = k; refresh(b); say('Force ' + (k+1) + ' on block ' + b + ' selected: ' + speech(d.forces[k]) + '.'); }
    else if (act === 'rm') {
      var gone = speech(d.forces[k]); d.forces.splice(k, 1); d.verdict = {};
      if (d.sel >= d.forces.length) d.sel = d.forces.length - 1;
      refresh(b); say('Removed ' + gone + ' from block ' + b + '.');
    }
  });
  Wk.addEventListener('change', function(e){
    var t = e.target, act = t.getAttribute('data-act'); if (!act) return;
    var b = parseInt(t.getAttribute('data-b'), 10), k = parseInt(t.getAttribute('data-k'), 10), d = D(S.cur, b);
    if (act === 'sym') {
      for (var j=0;j<d.forces.length;j++) if (j !== k && t.value && d.forces[j].key === t.value) { t.value = d.forces[k].key; say('That label is already used by force ' + (j+1) + '.'); return; }
      d.forces[k].key = t.value; d.sel = k; delete d.verdict[k]; refresh(b);
      say('Force ' + (k+1) + ' on block ' + b + ' is now ' + speech(d.forces[k]) + '.');
    } else if ((act === 'dir' || act === 'ang') && t.value !== '') setDir(b, k, t.value);
  });
}
function bindBody(b){
  var svg = document.getElementById(id('Svg' + b)), dragging = false;
  function pos(e){ var r = svg.getBoundingClientRect(); return [(e.clientX - r.left)*W/r.width, (e.clientY - r.top)*W/r.height]; }
  function aim(p){
    var d = D(S.cur, b); if (d.sel < 0 || !d.forces[d.sel]) return;
    var dx = p[0]-OX, dy = OY-p[1]; if (dx*dx + dy*dy < 144) return;
    var a = norm(Math.atan2(dy, dx)*180/Math.PI), f = d.forces[d.sel];
    if (f.ang !== a) { f.ang = a; delete d.verdict[d.sel]; refresh(b); }
  }
  svg.addEventListener('pointerdown', function(e){
    if (sh.sits[S.cur].done[2]) return;
    var d = D(S.cur, b), p = pos(e), hit = -1;
    for (var k=d.forces.length-1; k>=0; k--){
      var f = d.forces[k]; if (f.ang === null) continue;
      var a = f.ang*Math.PI/180, tx = OX + LEN*Math.cos(a), ty = OY - LEN*Math.sin(a);
      if ((tx-p[0])*(tx-p[0]) + (ty-p[1])*(ty-p[1]) < 324) { hit = k; break; }
    }
    if (hit >= 0) d.sel = hit;
    else if (d.sel < 0 || !d.forces[d.sel]) {
      for (var j=0;j<d.forces.length;j++) if (d.forces[j].ang === null) { d.sel = j; break; }
      if (d.sel < 0) { describe(b); return; }
    }
    dragging = true;
    try { svg.setPointerCapture(e.pointerId); } catch(err){}
    if (hit < 0) aim(p); else refresh(b);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', function(e){ if (dragging) aim(pos(e)); });
  function end(){ if (!dragging) return; dragging = false; var d = D(S.cur, b), f = d.forces[d.sel]; if (f && f.ang !== null) say('Block ' + b + ', force ' + (d.sel+1) + ', ' + speech(f) + ', points ' + dirName(f.ang, b) + '.'); }
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', function(e){
    if (sh.sits[S.cur].done[2]) return;
    var d = D(S.cur, b), key = e.key;
    if (key >= '1' && key <= '9') { var n = parseInt(key, 10) - 1; if (n < d.forces.length) { d.sel = n; refresh(b); say('Force ' + (n+1) + ' selected: ' + speech(d.forces[n]) + '.'); e.preventDefault(); } return; }
    if (d.sel < 0 || !d.forces[d.sel]) return;
    var f = d.forces[d.sel], a = f.ang === null ? 0 : f.ang, st = e.shiftKey ? 45 : STEP;
    if (key === 'ArrowLeft' || key === 'ArrowUp') { setDir(b, d.sel, a + st); e.preventDefault(); }
    else if (key === 'ArrowRight' || key === 'ArrowDown') { setDir(b, d.sel, a - st); e.preventDefault(); }
  });
}

/* ---------- checking ---------- */
function checkBody(i, b, issues){
  var d = D(i, b), req = TB.bodyForces(i, b), other = b === 1 ? 2 : 1, used = {}, verdict = {}, tag = '<b>Block ' + b + ':</b> ';
  if (!d.forces.length) { issues.push(tag + 'the diagram is empty.'); d.verdict = {}; return 0; }
  var inc = [];
  d.forces.forEach(function(f, k){ if (!f.key || f.ang === null) inc.push(k+1); });
  if (inc.length) { issues.push(tag + 'force ' + inc.join(', ') + (inc.length === 1 ? ' needs' : ' need') + ' both a label and a direction.'); d.verdict = {}; return 0; }
  var good = 0;
  d.forces.forEach(function(f, k){
    var L = TB.LBL[f.key], ft = tag + 'force ' + (k+1) + ' (' + TB.symH(f.key, true) + ') ';
    if (L.fake) { verdict[k] = 'bad'; issues.push(ft + '\u2014 ' + TB.TYPES.net.why); return; }
    var mine = req.filter(function(x){ return x.slot === f.key; })[0];
    if (!mine) {
      verdict[k] = 'bad';
      var theirs = TB.bodyForces(i, other).filter(function(x){ return x.slot === f.key; })[0];
      issues.push(ft + (theirs ? 'acts on block ' + other + ', not block ' + b + '. Draw only the forces exerted <b>on</b> block ' + b + '.' : 'does not act in this situation.'));
      return;
    }
    if (used[f.key]) { verdict[k] = 'bad'; issues.push(ft + 'appears twice.'); return; }
    used[f.key] = 1;
    if (angDiff(f.ang, norm(mine.dir - rot(b))) <= TOL) { verdict[k] = 'ok'; good++; return; }
    verdict[k] = 'bad';
    d.wrong[f.key] = (d.wrong[f.key] || 0) + 1;
    issues.push(ft + 'points the wrong way. ' + (rot(b) && L.type === 'grav' ? 'Gravity points toward Earth, but this diagram is rotated, so the real vertical is not along \u2212y. Work out which way \u201Cdown\u201D points relative to this block\u2019s +x.' : DIR_HINT[L.type]) + (d.wrong[f.key] >= 2 ? ' <i>' + mine.tip + '</i>' : ''));
  });
  req.forEach(function(f){ if (!used[f.slot]) issues.push(tag + '<b>missing:</b> ' + TB.symH(f.slot, true) + ' acts on block ' + b + ' but is not on its diagram.'); });
  d.verdict = verdict;
  return good;
}
function check(){
  var i = S.cur, issues = [];
  sh.sits[i].tries[2]++;
  var g1 = checkBody(i, 1, issues), g2 = checkBody(i, 2, issues);
  if (!issues.length) {
    sh.sits[i].done[2] = true; S.d[i].msg = null; TB.report(thisq);
    render(); showSuccess(true); return;
  }
  var n1 = TB.bodyForces(i, 1).length, n2 = TB.bodyForces(i, 2).length;
  var html = '<span class="ntfbhead">Block 1: ' + g1 + ' of ' + n1 + ' correct. Block 2: ' + g2 + ' of ' + n2 + ' correct.</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  S.d[i].msg = { html:html, tone:'bad' };
  refresh(1); refresh(2); setFb(html, 'bad');
  say('Block 1: ' + g1 + ' of ' + n1 + ' correct. Block 2: ' + g2 + ' of ' + n2 + ' correct. ' + issues[0]);
}
function showSuccess(say_){
  var i = S.cur, Sit = TB.SITS[i];
  function list(b){
    return TB.bodyForces(i, b).map(function(f){ return TB.symH(f.slot, true) + ' at ' + norm(f.dir - TB.frame(i, b)) + '\u00B0'; }).join(', ') + (TB.frame(i, b) ? ' (from +x on its rotated diagram)' : '');
  }
  setFb('<span class="ntfbhead">Both diagrams are correct.</span><br><b>Block 1:</b> ' + list(1) + '.<br><b>Block 2:</b> ' + list(2) + '.'
    + '<div class="ntwrapnote">Each diagram shows only the forces <b>on</b> that block. Forces between the blocks, or along the string, show up once on each diagram.</div>'
    + TB.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next')); if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say_) {
    say('Both diagrams are correct.');
    if (TB.allDone(thisq, N)) { completeBanner(); var c = document.getElementById(id('Cont')); if (c) c.focus(); }
  }
}
function completeBanner(){
  TB.showStageComplete(thisq, N, 'All ten free-body diagrams are correct. Last step: write the component equations for each block.');
}
function goTo(i){ S.cur = i; render(); TB.focusHeading(thisq, N); say('Situation ' + (i+1) + ': ' + TB.SITS[i].title + '.'); }

TB.mount(thisq, N, 'tb3Root' + thisq, {
  label:'Two-body tutorial, stage 3: free-body diagrams',
  subtitle:'Choose convenient axes, then draw a separate free-body diagram for each block on them. The simulation checks the labels and directions.',
  render:render, onTab:goTo,
  onShow:function(){ say('Stage 3 ready. Draw the free-body diagrams for situation ' + (S.cur+1) + '.'); }
});
})();
