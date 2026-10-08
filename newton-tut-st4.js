/* =====================================================================
   NEWTON'S SECOND LAW TUTORIAL — STAGE 4: COMPONENT EQUATIONS
   Students pick convenient axes, then build each component equation
   by choosing every force's component and the right-hand side.
   ===================================================================== */
(function(){
'use strict';
var NT = window.NTCore; if (!NT) return;
var thisq = window.ntThisq, N = 4;
var id = NT.ids(thisq, N);
var stKey = 'ntSt4_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, d:{} };
var S = window[stKey];
var sh = NT.shared(thisq);

function D(i){ if (!S.d[i]) S.d[i] = { axes:'', axesOk:false, pick:{}, marks:{}, msg:null, axMsg:null }; return S.d[i]; }

/* ---------- component option codes ---------- */
function codes(i, slot){
  var out = ['0','+','-'], ang = NT.SITS[i].angles[slot] || [];
  for (var j=0;j<ang.length;j++) out.push('+c'+j, '-c'+j, '+s'+j, '-s'+j);
  return out;
}
function parse(code){
  if (code === '0') return { z:true };
  return { z:false, sg:code.charAt(0), tr:code.charAt(1) || '', ai:code.length > 2 ? parseInt(code.charAt(2), 10) : -1 };
}
function trigT(tr, ang){ var f = tr === 'c' ? 'cos' : 'sin'; return ang.charAt(0) === '(' ? f + ang : f + ' ' + ang; }
function trigH(tr, ang){
  var f = tr === 'c' ? 'cos' : 'sin';
  var a = ang.replace(/([\u03B8\u03C6])/g, '<i>$1</i>');
  return ang.charAt(0) === '(' ? ' ' + f + a : ' ' + f + ' ' + a;
}
function codeText(i, slot, code){
  var k = NT.slotKey(thisq, i, slot), p = parse(code);
  if (p.z) return '0';
  var s = (p.sg === '-' ? '\u2212' : '+') + NT.symT(k);
  if (p.tr) s += ' ' + trigT(p.tr, NT.SITS[i].angles[slot][p.ai]);
  return s;
}
function codeHTML(i, slot, code, first){
  var k = NT.slotKey(thisq, i, slot), p = parse(code);
  var sign = p.sg === '-' ? (first ? '\u2212' : ' \u2212 ') : (first ? '' : ' + ');
  return sign + NT.symH(k, false) + (p.tr ? trigH(p.tr, NT.SITS[i].angles[slot][p.ai]) : '');
}

/* ---------- rendering ---------- */
function render(){
  var i = S.cur, Sit = NT.SITS[i], d = D(i), done = sh.sits[i].done[3];
  NT.renderTabsScene(thisq, N, i);
  var radios = '';
  Sit.axes.opts.forEach(function(o, j){
    var chosen = (done || d.axesOk) && o.id === Sit.axes.correct;
    radios += '<label><input type="radio" name="' + id('Ax') + '" value="' + o.id + '"' + (d.axes === o.id || chosen ? ' checked' : '') + (done || d.axesOk ? ' disabled' : '') + '><span>' + o.t
      + (chosen ? '<span class="ntaxchosen" aria-hidden="true"> \u2713</span><span class="ntsr"> (your choice, correct)</span>' : '') + '</span></label>';
  });
  var Wk = document.getElementById(id('Work'));
  Wk.innerHTML = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Resolve Newton\u2019s second law into components</h4>'
    + '<fieldset class="ntaxesset"><legend>1. Choose the most convenient axes</legend>' + radios + '</fieldset>'
    + '<div class="ntfb" id="' + id('AxFb') + '"></div>'
    + '<div id="' + id('Comp') + 'Area"></div>';
  var rad = Wk.querySelectorAll('input[type=radio]');
  for (var k=0;k<rad.length;k++) rad[k].addEventListener('change', function(){ chooseAxes(this.value); });
  if (d.axesOk || done) {
    setAxFb('<span class="ntfbhead">Good axes.</span> One axis lies along the acceleration (or, with a\u20D7 = 0\u20D7, along most of the forces), so as few forces as possible need splitting.', 'good');
    renderComps();
  } else if (d.axMsg) setAxFb(d.axMsg.html, d.axMsg.tone);
  else setAxFb('Tip: line up one axis with the acceleration. Then the right side of one equation is <i>m a</i> and the other is 0 (or a second, known acceleration component).', '');
  if (NT.allDone(thisq, N)) finalSummary(false);
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
    NT.announce(thisq, N, 'Good axes. Now choose each force\u2019s component along each axis.');
    var first = document.querySelector('#' + id('Comp') + 'Area select'); if (first) first.focus();
  } else {
    var o = Sit.axes.opts.filter(function(x){ return x.id === v; })[0];
    d.axMsg = { html:'<span class="ntfbhead">Possible, but not the best choice.</span> ' + o.fb, tone:'bad' };
    setAxFb(d.axMsg.html, 'bad');
    NT.announce(thisq, N, 'Possible, but not the best choice. ' + o.fb);
  }
}
function diagramSVG(i){
  var Sit = NT.SITS[i], O = 150, L = 78, s = '';
  s += NT.arrow(10, O, 290, O, 'ntaxis', {head:8}) + NT.arrow(O, 290, O, 10, 'ntaxis', {head:8});
  var std = Sit.axes.dirs[0].d === 0;
  if (!std) {
    Sit.axes.dirs.forEach(function(ax){
      var a = ax.d*Math.PI/180, ux = Math.cos(a), uy = -Math.sin(a), R = 128;
      s += NT.arrow(O - ux*R, O - uy*R, O + ux*R, O + uy*R, 'ntaxtilt', {head:10});
      var lx = Math.max(10, Math.min(286, O + ux*(R+8) - uy*12 - 5)), ly = Math.max(16, Math.min(294, O + uy*(R+8) + ux*12 + 5));
      s += '<text class="ntaxtiltl" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">' + ax.n + '</text>';
    });
  } else {
    s += '<text class="ntaxtiltl" x="276" y="140">x</text><text class="ntaxtiltl" x="158" y="22">y</text>';
  }
  Sit.forces.forEach(function(f){
    var k = NT.slotKey(thisq, i, f.slot), a = f.dir*Math.PI/180, tx = O + L*Math.cos(a), ty = O - L*Math.sin(a), cls = NT.colorClass(k);
    s += NT.arrow(O, O, tx, ty, cls, {head:11});
    var px = -Math.sin(a), py = -Math.cos(a);
    var lx = Math.max(18, Math.min(282, tx + Math.cos(a)*20 + px*13)), ly = Math.max(18, Math.min(286, ty - Math.sin(a)*20 + py*13 + 4));
    s += NT.vecLabel(lx, ly, k, cls);
  });
  Sit.axes.marks.forEach(function(m, j){ s += NT.angleArc(O, O, 36 + j*18, m.a1, m.a2, m.l, 'ntarc'); });
  s += '<circle class="ntorigin" cx="150" cy="150" r="4.5"/>';
  return s;
}
function renderComps(){
  var i = S.cur, Sit = NT.SITS[i], d = D(i), done = sh.sits[i].done[3];
  var area = document.getElementById(id('Comp') + 'Area');
  var rows = '';
  Sit.comps.forEach(function(c, ci){
    var sels = '';
    Sit.forces.forEach(function(f, fi){
      var k = NT.slotKey(thisq, i, f.slot), cur = d.pick[c.axis + f.slot] || '', mk = d.marks[c.axis + f.slot];
      var o = '<option value="">' + NT.symT(k) + ': choose</option>';
      codes(i, f.slot).forEach(function(code){ o += '<option value="' + code + '"' + (cur === code ? ' selected' : '') + '>' + codeText(i, f.slot, code) + '</option>'; });
      sels += (fi ? '<span class="ntop" aria-hidden="true"> </span>' : '')
        + '<select data-key="' + c.axis + f.slot + '" class="' + (mk === 'ok' ? 'ntselok' : mk === 'bad' ? 'ntselbad' : '') + '" aria-label="' + c.axis + '-component of ' + NT.symSpeak(k, true) + (mk ? (mk === 'ok' ? ', correct' : ', needs fixing') : '') + '"' + (done ? ' disabled' : '') + '>' + o + '</select>';
    });
    var rcur = d.pick[c.axis + '=rhs'] || '', rmk = d.marks[c.axis + '=rhs'];
    var ro = '<option value="">right side</option>';
    c.rhsOpts.forEach(function(code){ ro += '<option value="' + code + '"' + (rcur === code ? ' selected' : '') + '>' + NT.RHS[code].t + '</option>'; });
    rows += '<div class="ntcomprow"><div class="ntcompsel"><span class="ntaxname">' + c.axis + ':</span>' + sels
      + '<span class="ntop">=</span><select data-key="' + c.axis + '=rhs" class="' + (rmk === 'ok' ? 'ntselok' : rmk === 'bad' ? 'ntselbad' : '') + '" aria-label="Right side of the ' + c.axis + ' equation' + (rmk ? (rmk === 'ok' ? ', correct' : ', needs fixing') : '') + '"' + (done ? ' disabled' : '') + '>' + ro + '</select></div>'
      + '<div class="ntpreview ntmath" id="' + id('Pv' + ci) + '" aria-live="off"></div></div>';
  });
  var hint = Sit.comps.length === 1 ? 'Every force here is vertical, so only the y-equation carries information (the x-equation reads 0 = 0).' : 'Each row is one scalar equation: the sum of the components along that axis equals <i>m</i> times the acceleration component along it.';
  area.innerHTML = '<div class="ntcompgrid" style="margin-top:4px">'
    + '<svg class="ntdiag" viewBox="0 0 300 300" role="img" aria-label="' + NT.esc(diagramDesc(i)) + '">' + diagramSVG(i) + '</svg>'
    + '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><b>2. Build the component equations</b><p class="ntinstr">' + hint + ' Use the magnitudes <i>F</i>, with the sign showing the direction. The marked angles on the diagram tell you which trig function goes with each force.</p></div></div>'
    + '<div class="ntcomprows" style="margin-top:10px">' + rows + '</div>'
    + '<div class="ntbtnrow" style="margin-top:10px"><button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my equations</button>'
    + '<button type="button" class="ntbtn" id="' + id('Reset') + '"' + (done ? ' disabled' : '') + '>Clear</button></div>'
    + '<div class="ntfb" id="' + id('Fb') + '" style="margin-top:10px"></div>';
  var sels = area.querySelectorAll('select');
  for (var k=0;k<sels.length;k++) sels[k].addEventListener('change', function(){
    var dd = D(S.cur), key = this.getAttribute('data-key');
    dd.pick[key] = this.value; delete dd.marks[key];
    this.className = '';
    previews();
  });
  document.getElementById(id('Check')).addEventListener('click', check);
  document.getElementById(id('Reset')).addEventListener('click', function(){
    var dd = D(S.cur); dd.pick = {}; dd.marks = {}; dd.msg = null; render(); NT.announce(thisq, N, 'Equations cleared.');
  });
  previews();
  if (done) showSuccess(false);
  else if (d.msg) setFb(d.msg.html, d.msg.tone);
  else setFb('Choose every component and both right sides, then select <b>Check my equations</b>.', '');
}
function diagramDesc(i){
  var Sit = NT.SITS[i];
  var s = 'Free-body diagram with the chosen axes: ' + Sit.axes.dirs.map(function(a){ return a.n + ' axis at ' + a.d + ' degrees'; }).join(', ') + '. Forces: ';
  s += Sit.forces.map(function(f){ return NT.symSpeak(NT.slotKey(thisq, i, f.slot), true) + ' at ' + f.dir + ' degrees'; }).join(', ') + '.';
  if (Sit.axes.marks.length) s += ' Marked angles: ' + Sit.axes.marks.map(function(m){ return m.l.replace('\u03B8','theta').replace('\u03C6','phi') + ' between ' + m.a1 + ' and ' + (m.a2 % 360) + ' degrees'; }).join('; ') + '.';
  return s;
}
function previews(){
  var i = S.cur, Sit = NT.SITS[i], d = D(i);
  Sit.comps.forEach(function(c, ci){
    var el = document.getElementById(id('Pv' + ci)); if (!el) return;
    var h = '', first = true, missing = false;
    Sit.forces.forEach(function(f){
      var code = d.pick[c.axis + f.slot];
      if (!code) { missing = true; return; }
      if (code === '0') return;
      h += codeHTML(i, f.slot, code, first); first = false;
    });
    if (first) h = '0';
    if (missing) h += ' <span class="nteqempty">+ \u2026</span>';
    var r = d.pick[c.axis + '=rhs'];
    el.innerHTML = '<i>' + c.axis + '</i>:\u2003' + h + ' = ' + (r ? NT.RHS[r].h : '?');
  });
}
function setFb(html, tone){
  var fb = document.getElementById(id('Fb')); if (!fb) return;
  fb.className = 'ntfb' + (tone ? ' ntfb' + tone : '');
  fb.innerHTML = NT.vecify(html);
}

/* ---------- checking ---------- */
function compHint(i, slot, axis, want, got){
  var k = NT.slotKey(thisq, i, slot), F = NT.symH(k, false), w = parse(want), g = parse(got), msgs = [];
  if (w.z) return F + ' is perpendicular to the ' + axis + '-axis, so its ' + axis + '-component is 0.';
  if (g.z) return F + ' is not perpendicular to the ' + axis + '-axis, so it has a nonzero ' + axis + '-component.';
  if (!w.tr && g.tr) return F + ' lies along the ' + axis + '-axis, so its whole magnitude counts: no sine or cosine.';
  if (w.tr && !g.tr) return F + ' is tilted relative to the ' + axis + '-axis, so only part of it counts: use the sine or cosine of the marked angle.';
  if (w.tr && g.tr && w.ai !== g.ai) msgs.push(F + ': use the angle between this force and the axes, as marked on the diagram.');
  else if (w.tr && g.tr && w.tr !== g.tr) msgs.push(F + ': check sine versus cosine. The component <i>adjacent</i> to the marked angle uses cos; the one <i>opposite</i> it uses sin.');
  if (w.sg !== g.sg) msgs.push(F + ': check the sign. Its ' + axis + '-component points in the ' + (w.sg === '-' ? '\u2212' : '+') + axis + ' direction.');
  return msgs.join(' ');
}
function check(){
  var i = S.cur, Sit = NT.SITS[i], d = D(i), issues = [], marks = {}, blanks = 0;
  sh.sits[i].tries[3]++;
  Sit.comps.forEach(function(c){
    Sit.forces.forEach(function(f){
      var key = c.axis + f.slot, got = d.pick[key], want = c.terms[f.slot];
      if (!got) { blanks++; return; }
      if (got === want) marks[key] = 'ok';
      else { marks[key] = 'bad'; issues.push('<b>' + c.axis + ':</b> ' + compHint(i, f.slot, c.axis, want, got)); }
    });
    var rk = c.axis + '=rhs', rg = d.pick[rk];
    if (!rg) blanks++;
    else if (rg === c.rhs) marks[rk] = 'ok';
    else { marks[rk] = 'bad'; issues.push('<b>' + c.axis + ', right side:</b> ' + (c.rfb[rg] || 'The right side is <i>m</i> times the acceleration component along this axis.')); }
  });
  d.marks = marks;
  if (blanks) issues.unshift(blanks + (blanks === 1 ? ' box is' : ' boxes are') + ' still empty.');
  if (!issues.length) {
    sh.sits[i].done[3] = true; d.msg = null; NT.report(thisq);
    render(); showSuccess(true); return;
  }
  var html = '<span class="ntfbhead">Not yet \u2014 ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix:</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  d.msg = { html:html, tone:'bad' };
  renderComps();
  NT.announce(thisq, N, 'Not yet. ' + issues[0]);
}
function finalEqs(i){
  var Sit = NT.SITS[i];
  return Sit.comps.map(function(c){
    var h = '', first = true;
    Sit.forces.forEach(function(f){ var code = c.terms[f.slot]; if (code === '0') return; h += codeHTML(i, f.slot, code, first); first = false; });
    return '<div class="ntmath"><i>' + c.axis + '</i>:\u2003' + h + ' = ' + NT.RHS[c.rhs].h + '</div>';
  }).join('');
}
function showSuccess(say){
  var i = S.cur, Sit = NT.SITS[i];
  setFb('<span class="ntfbhead">Correct component equations.</span><div style="margin:6px 0">' + finalEqs(i) + '</div>'
    + '<div class="ntwrapnote">' + NT.fillWrap(thisq, i, Sit.wrap4) + '</div>' + NT.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next'));
  if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say) {
    NT.announce(thisq, N, 'Correct component equations.');
    if (NT.allDone(thisq, N)) finalSummary(true);
  }
}
function finalSummary(fresh){
  if (fresh || !sh.finishedAt) sh.finishedAt = sh.finishedAt || new Date();
  var rows = '';
  NT.SITS.forEach(function(Sit, i){
    var t = sh.sits[i].tries;
    rows += '<tr><td>' + (i+1) + '. ' + Sit.tab + '</td><td>' + t[0] + '</td><td>' + t[1] + '</td><td>' + t[2] + '</td><td>' + t[3] + '</td></tr>';
  });
  var when = sh.finishedAt.toLocaleString();
  NT.showStageComplete(thisq, N, 'All four stages are complete for all five situations. Take a snapshot of this panel and paste it in the answer box below.'
    + '<table class="ntsummary"><caption class="ntsr">Number of checks used per stage</caption><thead><tr><th scope="col">Situation</th><th scope="col">Stage 1 checks</th><th scope="col">Stage 2 checks</th><th scope="col">Stage 3 checks</th><th scope="col">Stage 4 checks</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<p style="margin-top:6px">Completed ' + when + '.</p>');
  if (fresh) {
    NT.completeStage(thisq, N);
    var comp = document.getElementById(id('Comp'));
    if (comp) { comp.setAttribute('tabindex', '-1'); try { comp.focus({ preventScroll:false }); } catch(e){} }
    NT.announce(thisq, N, 'Tutorial complete. Take a snapshot of the summary and paste it in the answer box.');
  }
}
function goTo(i){
  S.cur = i; render(); NT.focusHeading(thisq, N);
  NT.announce(thisq, N, 'Situation ' + (i+1) + ': ' + NT.SITS[i].title + '. First choose the axes.');
}

NT.mount(thisq, N, 'nt4Root' + thisq, {
  label:'Newton\u2019s second law tutorial, stage 4: component equations',
  subtitle:'Choose convenient axes, then write Newton\u2019s second law along each axis.',
  render:render,
  onTab:goTo,
  onShow:function(){ NT.announce(thisq, N, 'Stage 4 ready. Choose the axes for situation ' + (S.cur+1) + '.'); }
});
})();
