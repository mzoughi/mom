/* =====================================================================
   NEWTON'S SECOND LAW TUTORIAL — STAGE 1: IDENTIFY THE FORCES
   Students tick every force acting on the object and name its agent.
   ===================================================================== */
(function(){
'use strict';
var NT = window.NTCore; if (!NT) return;
var thisq = window.ntThisq, N = 1;
var id = NT.ids(thisq, N);
var stKey = 'ntSt1_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, inputs:{}, bad:{}, msg:{} };
var S = window[stKey];
var sh = NT.shared(thisq);

var MISSING_HINT = {
  grav:'Every object near Earth is pulled down by Earth, touching or not.',
  norm:'The object touches a surface, and a surface pushes back perpendicular to itself.',
  fric:'The object slides (or tends to slide) along a rough surface.',
  ten:'A string is attached and pulls on the object.',
  app:'Someone is pushing or pulling the object.',
  drag:'The object moves through the air, and the air pushes back.'
};

function inp(i){
  if (!S.inputs[i]) S.inputs[i] = { checked:{}, agent:{} };
  return S.inputs[i];
}
function slotFor(i, key){
  var f = NT.SITS[i].forces;
  for (var j=0;j<f.length;j++) if (f[j].keys.indexOf(key) >= 0) return f[j];
  return null;
}

/* ---------- rendering ---------- */
function render(){
  var i = S.cur, Sit = NT.SITS[i], done = sh.sits[i].done[0], I = inp(i);
  NT.renderTabsScene(thisq, N, i);
  var rows = '';
  NT.FORCE_ORDER.forEach(function(key){
    var F = NT.FORCES[key], cb = id('Cb' + key), ag = id('Ag' + key);
    var on = !!I.checked[key], bad = S.bad[i] && S.bad[i][key];
    var opts = '<option value="">\u2014 choose \u2014</option>';
    NT.AGENTS.forEach(function(a){
      opts += '<option value="' + a.id + '"' + (I.agent[key] === a.id ? ' selected' : '') + '>' + a.t + '</option>';
    });
    rows += '<tr' + (bad ? ' class="ntrowbad"' : '') + '><td><label for="' + cb + '">'
      + '<input type="checkbox" id="' + cb + '" data-key="' + key + '"' + (on ? ' checked' : '') + (done ? ' disabled' : '') + '>'
      + NT.symH(key, true) + ' <span>' + F.name + '</span>'
      + (bad ? '<span class="ntmark ntmarkbad" aria-hidden="true">\u2717</span><span class="ntsr"> (needs another look)</span>' : '')
      + (done && on ? '<span class="ntmark ntmarkok" aria-hidden="true">\u2713</span>' : '')
      + '</label></td><td><select id="' + ag + '" data-key="' + key + '" aria-label="Exerted by, for ' + F.name + '"'
      + (on && !done ? '' : ' disabled') + '>' + opts + '</select></td></tr>';
  });
  var W = document.getElementById(id('Work'));
  W.innerHTML = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Which forces act on the object?</h4>'
    + '<p class="ntinstr">Tick every force that acts <b>on the object</b> and choose the agent that exerts it. Each real force is a push or pull by a specific agent: something touching the object, or Earth.</p>'
    + '<table class="ntftable"><thead><tr><th scope="col">Force on the object</th><th scope="col">Exerted by</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="ntbtnrow">'
    + '<button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my forces</button>'
    + '<button type="button" class="ntbtn" id="' + id('Hint') + '"' + (done ? ' disabled' : '') + '>Hint</button>'
    + '<button type="button" class="ntbtn" id="' + id('Reset') + '"' + (done ? ' disabled' : '') + '>Clear</button>'
    + '</div>'
    + '<div class="ntfb" id="' + id('Fb') + '"></div>';
  bind();
  if (done) showSuccess(false);
  else if (S.msg[i]) setFb(S.msg[i].html, S.msg[i].tone);
  else setFb('Tick the forces, choose their agents, then select <b>Check my forces</b>.', '');
  if (NT.allDone(thisq, N)) completeBanner();
}
function bind(){
  var W = document.getElementById(id('Work'));
  var cbs = W.querySelectorAll('input[type=checkbox]');
  for (var k=0;k<cbs.length;k++) cbs[k].addEventListener('change', function(){
    var key = this.getAttribute('data-key'), I = inp(S.cur);
    I.checked[key] = this.checked;
    var sel = document.getElementById(id('Ag' + key));
    sel.disabled = !this.checked;
    NT.announce(thisq, N, NT.FORCES[key].name + (this.checked ? ' added. Now choose who exerts it.' : ' removed.'));
  });
  var sels = W.querySelectorAll('select');
  for (k=0;k<sels.length;k++) sels[k].addEventListener('change', function(){
    inp(S.cur).agent[this.getAttribute('data-key')] = this.value;
  });
  document.getElementById(id('Check')).addEventListener('click', check);
  document.getElementById(id('Hint')).addEventListener('click', hint);
  document.getElementById(id('Reset')).addEventListener('click', function(){
    S.inputs[S.cur] = { checked:{}, agent:{} }; S.bad[S.cur] = {}; S.msg[S.cur] = null; render();
    NT.announce(thisq, N, 'Choices cleared.');
  });
}
function setFb(html, tone){
  var fb = document.getElementById(id('Fb'));
  fb.className = 'ntfb' + (tone ? ' ntfb' + tone : '');
  fb.innerHTML = NT.vecify(html);
}

/* ---------- checking ---------- */
function check(){
  var i = S.cur, Sit = NT.SITS[i], I = inp(i), issues = [], bad = {}, slotUsed = {};
  sh.sits[i].tries[0]++;
  NT.FORCE_ORDER.forEach(function(key){
    if (!I.checked[key]) return;
    var F = NT.FORCES[key], slot = slotFor(i, key);
    if (!F.real){ issues.push('<b>' + F.name + ':</b> ' + F.why); bad[key] = 1; return; }
    if (!slot){
      var a = Sit.absent[key];
      issues.push('<b>' + F.name + ':</b> ' + (a ? a : 'Nothing in this situation exerts this force. Ask: what would be doing the pushing or pulling?'));
      bad[key] = 1; return;
    }
    if (slotUsed[slot.slot]){
      issues.push('<b>' + F.name + ' and ' + NT.FORCES[slotUsed[slot.slot]].name + '</b> describe the same pull. Keep only one of them.');
      bad[key] = 1; return;
    }
    slotUsed[slot.slot] = key;
    var ag = I.agent[key];
    if (!ag) { issues.push('<b>' + F.name + ':</b> choose the agent that exerts it.'); bad[key] = 1; }
    else if (slot.agents.indexOf(ag) < 0){
      issues.push('<b>' + F.name + ':</b> ' + (ag === 'self'
        ? 'an object cannot push or pull on itself. Which other object exerts this force?'
        : 'check the agent. ' + (key === 'grav' ? 'Gravity is a long-range pull by a planet.' : 'Which object is actually in contact and doing this pushing or pulling?')));
      bad[key] = 1;
    }
  });
  var missing = Sit.forces.filter(function(f){ return !slotUsed[f.slot]; });
  missing.forEach(function(f){ issues.push('<b>A force is missing.</b> ' + MISSING_HINT[f.keys[0]]); });

  S.bad[i] = bad;
  if (issues.length === 0){
    Sit.forces.forEach(function(f){ sh.sits[i].keys[f.slot] = slotUsed[f.slot]; });
    sh.sits[i].done[0] = true;
    S.msg[i] = null;
    NT.report(thisq);
    render();
    showSuccess(true);
    return;
  }
  var html = '<span class="ntfbhead">Not yet \u2014 ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix:</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  S.msg[i] = { html:html, tone:'bad' };
  render();
  NT.announce(thisq, N, 'Not yet. ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix. ' + issues[0]);
}
function hint(){
  var Sit = NT.SITS[S.cur], n = Sit.forces.length;
  var msg = 'Work outward from the object. First the one long-range force: what pulls on everything near Earth? Then go around the object\u2019s edge and list everything that <b>touches</b> it \u2014 each contact can push, pull, or rub. This situation has <b>' + n + '</b> forces in total.';
  setFb(msg, 'info');
  NT.announce(thisq, N, msg);
}
function showSuccess(say){
  var i = S.cur, Sit = NT.SITS[i];
  var list = Sit.forces.map(function(f){
    var k = NT.slotKey(thisq, i, f.slot);
    return NT.symH(k, true) + ' (' + NT.FORCES[k].name.toLowerCase() + ', by ' + NT.agentText(f.agents[0]).toLowerCase() + ')';
  }).join(', ');
  setFb('<span class="ntfbhead">Correct.</span> ' + Sit.wrap1 + '<div class="ntwrapnote">Your forces: ' + list + '.</div>' + NT.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next'));
  if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say) {
    NT.announce(thisq, N, 'Correct. ' + Sit.wrap1);
    if (NT.allDone(thisq, N)) completeBanner(true);
  }
}
function completeBanner(focus){
  NT.showStageComplete(thisq, N, 'You identified the forces in all five situations. Next, you will write Newton\u2019s second law as a vector equation for each one.');
  if (focus) { var b = document.getElementById(id('Cont')); if (b) b.focus(); }
}
function goTo(i){
  S.cur = i; render(); NT.focusHeading(thisq, N);
  NT.announce(thisq, N, 'Situation ' + (i+1) + ': ' + NT.SITS[i].title + '. ' + NT.SITS[i].desc);
}

NT.mount(thisq, N, 'ntRoot' + thisq, {
  label:'Newton\u2019s second law tutorial, stage 1: identify the forces',
  subtitle:'Five situations, from simplest to most complex. For each one, decide which forces act on the object and what exerts them.',
  render:render,
  onTab:goTo
});
setTimeout(function(){ NT.announce(thisq, N, 'Stage 1 ready. Situation ' + (S.cur+1) + ': ' + NT.SITS[S.cur].title + '. Tick the forces that act on the object.'); }, 300);
})();
