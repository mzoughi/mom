/* =====================================================================
   TWO-BODY TUTORIAL — STAGE 4: COMPONENT EQUATIONS FOR EACH BLOCK
   Choose axes (positive along each block's motion), then pick every
   force component and right side. Tension magnitudes share F_T and the
   blocks share the acceleration magnitude a.
   ===================================================================== */
(function(){
'use strict';
var TB = window.TBCore; if (!TB) return;
var thisq = window.tbThisq, N = 4;
var id = TB.ids(thisq, N);
var stKey = 'tbSt4_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, d:{} };
var S = window[stKey];
var sh = TB.shared(thisq);

function D(i){ if (!S.d[i]) S.d[i] = { pick:{}, marks:{}, msg:null }; return S.d[i]; }

/* ---------- component codes ---------- */
function codes(i, slot){
  var out = ['0','+','-'], ang = TB.SITS[i].angles[slot] || [];
  for (var j=0;j<ang.length;j++) out.push('+c'+j, '-c'+j, '+s'+j, '-s'+j);
  return out;
}
function parse(c){ if (c === '0') return { z:true }; return { z:false, sg:c.charAt(0), tr:c.charAt(1) || '', ai:c.length > 2 ? parseInt(c.charAt(2), 10) : -1 }; }
function angOf(i, slot, ai){ return TB.SITS[i].angles[slot][ai]; }
function codeText(i, slot, c){
  var p = parse(c); if (p.z) return '0';
  return (p.sg === '-' ? '\u2212' : '+') + TB.symT(slot, true) + (p.tr ? ' ' + (p.tr === 'c' ? 'cos ' : 'sin ') + angOf(i, slot, p.ai) : '');
}
function angH(a){ return a.replace(/([\u03B8\u03C6])([\u2081\u2082]?)/g, function(m, g, s){ return '<i>' + g + '</i>' + (s ? '<sub>' + (s === '\u2081' ? '1' : '2') + '</sub>' : ''); }); }
function codeHTML(i, slot, c, first){
  var p = parse(c), sign = p.sg === '-' ? (first ? '\u2212' : ' \u2212 ') : (first ? '' : ' + ');
  return sign + TB.symH(slot, false, true) + (p.tr ? ' ' + (p.tr === 'c' ? 'cos ' : 'sin ') + angH(angOf(i, slot, p.ai)) : '');
}

/* ---------- rendering ---------- */
function render(){
  var i = S.cur, Sit = TB.SITS[i];
  TB.renderTabsScene(thisq, N, i);
  var ax = Sit.axes.opts.filter(function(o){ return o.id === Sit.axes.correct; })[0];
  var Wk = document.getElementById(id('Work'));
  Wk.innerHTML = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Resolve Newton\u2019s second law for each block</h4>'
    + '<p class="ntinstr">These are your free-body diagrams from Stage 3, on the same axes: <b>' + ax.t + '</b>.</p>'
    + '<div id="' + id('Area') + '"></div>';
  renderComps();
  if (TB.allDone(thisq, N)) finalSummary(false);
}
function setFb(html, tone){ TB.setFb(document.getElementById(id('Fb')), html, tone); }
function diagramSVG(i, b){
  var Sit = TB.SITS[i], ax = Sit.axes.bodies[b], O = 150, L = 84, R = TB.frame(i, b), s = '';
  var yd = TB.yDown(i, b);
  s += TB.arrow(10, O, 290, O, 'ntaxis', {head:8}) + (yd ? TB.arrow(O, 10, O, 290, 'ntaxis', {head:8}) : TB.arrow(O, 290, O, 10, 'ntaxis', {head:8}));
  s += '<text class="ntaxtiltl" x="278" y="140">x</text><text class="ntaxtiltl" x="' + (yd ? 122 : 158) + '" y="' + (yd ? 292 : 22) + '">' + (yd ? '+y' : 'y') + '</text>';
  var seen = {};
  TB.bodyForces(i, b).forEach(function(f){
    var dir = ((f.dir - R) % 360 + 360) % 360, r = dir*Math.PI/180, tx = O + L*Math.cos(r), ty = O - L*Math.sin(r), cls = TB.colorClass(f.slot);
    var nn = seen[dir] || 0; seen[dir] = nn + 1;
    s += TB.arrow(O, O, tx, ty, cls, {head:11});
    var px = -Math.sin(r), py = -Math.cos(r);
    var lx = Math.max(20, Math.min(278, tx + Math.cos(r)*20 + px*(13 + nn*26))), ly = Math.max(18, Math.min(286, ty - Math.sin(r)*20 + py*(13 + nn*26) + 4));
    s += TB.vecLabel(lx, ly, f.slot, cls);
  });
  ax.marks.forEach(function(m, j){ s += TB.angleArc(O, O, 36 + j*18, m.a1 - R, m.a2 - R, m.l, 'ntarc'); });
  return s + '<circle class="ntorigin" cx="150" cy="150" r="4.5"/>';
}
function diagramDesc(i, b){
  var ax = TB.SITS[i].axes.bodies[b], R = TB.frame(i, b);
  function rel(x){ return ((x - R) % 360 + 360) % 360; }
  return 'Block ' + b + '\u2019s free-body diagram from Stage 3, with its x axis horizontal (+x points ' + ax.xdesc + ') and y vertical. Forces, in degrees from plus x: '
    + TB.bodyForces(i, b).map(function(f){ return TB.symSpeak(f.slot, true) + ' at ' + rel(f.dir); }).join(', ') + '.'
    + (ax.marks.length ? ' Marked angles: ' + ax.marks.map(function(m){ return m.l + ' between ' + rel(m.a1) + ' and ' + (rel(m.a2) || 360) + ' degrees'; }).join('; ') + '.' : '');
}
function bodyCard(i, b, done){
  var Sit = TB.SITS[i], d = D(i), rows = '';
  Sit.comps[b].forEach(function(c, ci){
    var sels = '', pre = b + c.axis;
    TB.bodyForces(i, b).forEach(function(f){
      var key = pre + f.slot, cur = d.pick[key] || '', mk = d.marks[key];
      var o = '<option value="">' + TB.symT(f.slot, true) + ': choose</option>';
      codes(i, f.slot).forEach(function(code){ o += '<option value="' + code + '"' + (cur === code ? ' selected' : '') + '>' + codeText(i, f.slot, code) + '</option>'; });
      sels += '<select data-key="' + key + '" class="' + (mk === 'ok' ? 'ntselok' : mk === 'bad' ? 'ntselbad' : '') + '" aria-label="Block ' + b + ', ' + c.axis + '-component of ' + TB.symSpeak(f.slot, true) + (mk ? (mk === 'ok' ? ', correct' : ', needs fixing') : '') + '"' + (done ? ' disabled' : '') + '>' + o + '</select>';
    });
    var rk = pre + '=rhs', rcur = d.pick[rk] || '', rmk = d.marks[rk];
    var ro = '<option value="">right side</option>';
    c.rhsOpts.forEach(function(code){ ro += '<option value="' + code + '"' + (rcur === code ? ' selected' : '') + '>' + TB.RHS[code].t + '</option>'; });
    rows += '<div class="ntcomprow"><div class="ntcompsel"><span class="ntaxname">' + c.axis + ':</span>' + sels
      + '<span class="ntop">=</span><select data-key="' + rk + '" class="' + (rmk === 'ok' ? 'ntselok' : rmk === 'bad' ? 'ntselbad' : '') + '" aria-label="Right side of block ' + b + '\u2019s ' + c.axis + ' equation' + (rmk ? (rmk === 'ok' ? ', correct' : ', needs fixing') : '') + '"' + (done ? ' disabled' : '') + '>' + ro + '</select></div>'
      + '<div class="ntpreview ntmath" id="' + id('Pv' + b + ci) + '"></div></div>';
  });
  return '<div class="tbbody" role="group" aria-labelledby="' + id('BH' + b) + '">'
    + '<div class="tbbodyh" id="' + id('BH' + b) + '"><span class="tbbodytag">' + b + '</span> Block ' + b + '</div>'
    + '<svg class="ntdiag" style="margin:0 auto" viewBox="0 0 300 300" role="img" aria-label="' + TB.esc(diagramDesc(i, b)) + '">' + diagramSVG(i, b) + '</svg>'
    + '<p class="ntinstr">' + (Sit.comps[b].length === 1 ? 'Every force on block ' + b + ' is vertical, so the y-equation carries all the information (the x-equation reads 0 = 0).' : 'One equation per axis: the components along that axis add up to <i>m</i><sub>' + b + '</sub> times block ' + b + '\u2019s acceleration component.') + ' The marked angles tell you which trig function goes with each force.</p>'
    + '<div class="ntcomprows">' + rows + '</div></div>';
}
function renderComps(){
  var i = S.cur, d = D(i), done = sh.sits[i].done[3], area = document.getElementById(id('Area'));
  area.innerHTML = '<p class="ntinstr" style="margin:8px 0"><b>Build the component equations.</b> Use magnitudes, with the sign showing the direction. The string is ideal, so both tensions have the same magnitude <i>F</i><sub>T</sub>, and both blocks share the acceleration magnitude <i>a</i>.</p>'
    + '<div class="tbfbdpair">' + bodyCard(i, 1, done) + bodyCard(i, 2, done) + '</div>'
    + '<div class="ntbtnrow" style="margin-top:10px"><button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my equations</button>'
    + '<button type="button" class="ntbtn" id="' + id('Reset') + '"' + (done ? ' disabled' : '') + '>Clear</button></div>'
    + '<div class="ntfb" id="' + id('Fb') + '" style="margin-top:10px"></div>';
  var sels = area.querySelectorAll('select');
  for (var k=0;k<sels.length;k++) sels[k].addEventListener('change', function(){
    var dd = D(S.cur), key = this.getAttribute('data-key');
    dd.pick[key] = this.value; delete dd.marks[key]; this.className = ''; previews();
  });
  document.getElementById(id('Check')).addEventListener('click', check);
  document.getElementById(id('Reset')).addEventListener('click', function(){ var dd = D(S.cur); dd.pick = {}; dd.marks = {}; dd.msg = null; render(); TB.announce(thisq, N, 'Equations cleared.'); });
  previews();
  if (done) showSuccess(false);
  else if (d.msg) setFb(d.msg.html, d.msg.tone);
  else setFb('Choose every component and every right side, then select <b>Check my equations</b>.', '');
}
function previews(){
  var i = S.cur, Sit = TB.SITS[i], d = D(i);
  [1,2].forEach(function(b){
    Sit.comps[b].forEach(function(c, ci){
      var el = document.getElementById(id('Pv' + b + ci)); if (!el) return;
      var h = '', first = true, missing = false;
      TB.bodyForces(i, b).forEach(function(f){
        var code = d.pick[b + c.axis + f.slot];
        if (!code) { missing = true; return; }
        if (code === '0') return;
        h += codeHTML(i, f.slot, code, first); first = false;
      });
      if (first) h = '0';
      if (missing) h += ' <span class="nteqempty">+ \u2026</span>';
      var r = d.pick[b + c.axis + '=rhs'];
      el.innerHTML = '<i>' + c.axis + '</i>:\u2003' + h + ' = ' + (r ? TB.RHS[r].h : '?');
    });
  });
}

/* ---------- checking ---------- */
function compHint(i, slot, axis, want, got){
  var F = TB.symH(slot, false, true), w = parse(want), g = parse(got), m = [];
  if (w.z) return F + ' is perpendicular to the ' + axis + '-axis, so its ' + axis + '-component is 0.';
  if (g.z) return F + ' is not perpendicular to the ' + axis + '-axis, so it has a nonzero ' + axis + '-component.';
  if (!w.tr && g.tr) return F + ' lies along the ' + axis + '-axis, so its whole magnitude counts: no sine or cosine.';
  if (w.tr && !g.tr) return F + ' is tilted relative to the ' + axis + '-axis, so only part of it counts: use the sine or cosine of the marked angle.';
  if (w.ai !== g.ai) m.push(F + ': use the angle marked next to this force on the diagram.');
  else if (w.tr !== g.tr) m.push(F + ': check sine versus cosine. The component <i>adjacent</i> to the marked angle uses cos; the one <i>opposite</i> it uses sin.');
  if (w.sg !== g.sg) m.push(F + ': check the sign. Its ' + axis + '-component points in the ' + (w.sg === '-' ? '\u2212' : '+') + axis + ' direction.');
  return m.join(' ');
}
function rhsHint(b, axis, want, got){
  var other = b === 1 ? 2 : 1;
  if (got === '+mta') return '(<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i> belongs to the whole two-block system. For block ' + b + ' alone, use <i>m</i><sub>' + b + '</sub>.';
  if (got === '+m' + other + 'a' || got === '-m' + other + 'a') return 'Use block ' + b + '\u2019s own mass, <i>m</i><sub>' + b + '</sub>.';
  if (got.indexOf('g') > 0) return 'That is a weight, which is already on the left as a force. The right side is mass times acceleration.';
  if (want === '0') return 'Block ' + b + ' does not accelerate along ' + axis + ', so the right side is 0.';
  if (got === '0') return 'Block ' + b + ' accelerates along ' + axis + ', so the right side is not 0.';
  return 'Check the sign: you chose +' + axis + ' along block ' + b + '\u2019s motion, and it is speeding up, so its acceleration component is +<i>a</i>.';
}
function check(){
  var i = S.cur, Sit = TB.SITS[i], d = D(i), issues = [], marks = {}, blanks = 0;
  sh.sits[i].tries[3]++;
  [1,2].forEach(function(b){
    Sit.comps[b].forEach(function(c){
      var pre = b + c.axis, tag = '<b>Block ' + b + ', ' + c.axis + ':</b> ';
      TB.bodyForces(i, b).forEach(function(f){
        var key = pre + f.slot, got = d.pick[key], want = c.terms[f.slot];
        if (!got) { blanks++; return; }
        if (got === want) marks[key] = 'ok'; else { marks[key] = 'bad'; issues.push(tag + compHint(i, f.slot, c.axis, want, got)); }
      });
      var rk = pre + '=rhs', rg = d.pick[rk];
      if (!rg) blanks++;
      else if (rg === c.rhs) marks[rk] = 'ok';
      else { marks[rk] = 'bad'; issues.push(tag + 'right side \u2014 ' + rhsHint(b, c.axis, c.rhs, rg)); }
    });
  });
  d.marks = marks;
  if (blanks) issues.unshift(blanks + (blanks === 1 ? ' box is' : ' boxes are') + ' still empty.');
  if (!issues.length) {
    sh.sits[i].done[3] = true; d.msg = null; TB.report(thisq);
    render(); showSuccess(true); return;
  }
  var html = '<span class="ntfbhead">Not yet \u2014 ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix:</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  d.msg = { html:html, tone:'bad' };
  renderComps(); TB.announce(thisq, N, 'Not yet. ' + issues[0]);
}
function finalEqs(i){
  var Sit = TB.SITS[i], out = '';
  [1,2].forEach(function(b){
    Sit.comps[b].forEach(function(c){
      var h = '', first = true;
      TB.bodyForces(i, b).forEach(function(f){ var code = c.terms[f.slot]; if (code === '0') return; h += codeHTML(i, f.slot, code, first); first = false; });
      out += '<div class="ntmath">Block ' + b + ', <i>' + c.axis + '</i>:\u2003' + h + ' = ' + TB.RHS[c.rhs].h + '</div>';
    });
  });
  return out;
}
function showSuccess(say){
  var i = S.cur, Sit = TB.SITS[i];
  setFb('<span class="ntfbhead">Correct component equations.</span><div style="margin:6px 0">' + finalEqs(i) + '</div>'
    + '<div class="ntwrapnote">' + TB.fillWrap(Sit.wrap4) + '</div>' + TB.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next')); if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say) {
    TB.announce(thisq, N, 'Correct component equations.');
    if (TB.allDone(thisq, N)) finalSummary(true);
  }
}
function finalSummary(fresh){
  if (!sh.finishedAt) sh.finishedAt = new Date();
  var rows = '';
  TB.SITS.forEach(function(Sit, i){
    var t = sh.sits[i].tries;
    rows += '<tr><td>' + (i+1) + '. ' + Sit.tab + '</td><td>' + t[0] + '</td><td>' + t[1] + '</td><td>' + t[2] + '</td><td>' + t[3] + '</td></tr>';
  });
  TB.showStageComplete(thisq, N, 'All four stages are complete for all five two-body systems. Take a snapshot of this panel and paste it in the answer box below.'
    + '<table class="ntsummary"><caption class="ntsr">Number of checks used per stage</caption><thead><tr><th scope="col">Situation</th><th scope="col">Stage 1 checks</th><th scope="col">Stage 2 checks</th><th scope="col">Stage 3 checks</th><th scope="col">Stage 4 checks</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<p style="margin-top:6px">Completed ' + sh.finishedAt.toLocaleString() + '.</p>');
  if (fresh) {
    TB.completeStage(thisq, N);
    var comp = document.getElementById(id('Comp'));
    if (comp) { comp.setAttribute('tabindex', '-1'); try { comp.focus(); } catch(e){} }
    TB.announce(thisq, N, 'Tutorial complete. Take a snapshot of the summary and paste it in the answer box.');
  }
}
function goTo(i){ S.cur = i; render(); TB.focusHeading(thisq, N); TB.announce(thisq, N, 'Situation ' + (i+1) + ': ' + TB.SITS[i].title + '. Build the component equations.'); }

TB.mount(thisq, N, 'tb4Root' + thisq, {
  label:'Two-body tutorial, stage 4: component equations',
  subtitle:'Using your free-body diagrams and axes from Stage 3, write Newton\u2019s second law along each axis for each block.',
  render:render, onTab:goTo,
  onShow:function(){ TB.announce(thisq, N, 'Stage 4 ready. Build the component equations for situation ' + (S.cur+1) + '.'); }
});
})();
