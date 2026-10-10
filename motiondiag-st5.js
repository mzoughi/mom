/* motiondiag-st5.js \u2014 Stage 5: Negative direction. Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 5, title: 'Speeding up and slowing down in the negative direction', dim: 1, stepDt: 1, ghostDt: 1,
  panels: [
    { name: 'Object 1', color: 1, type: '1d', x0: 60, v0: 0, a: -2, tEnd: 10,
      desc: 'x\u2080 = +60 m, v\u2080 = 0, a = \u22122.00 m/s\u00b2' },
    { name: 'Object 2', color: 2, type: '1d', x0: 60, v0: -20, a: 2, tEnd: 10,
      desc: 'x\u2080 = +60 m, v\u2080 = \u221220 m/s, a = +2.00 m/s\u00b2' }
  ],
  options: [
    { label: 'Speeding up', panels: [0] },
    { label: 'Slowing down', panels: [1] },
    { label: 'Both', panels: [0, 1] }
  ],
  text:
    '<h4>Negative acceleration does not always mean slowing down</h4>' +
    '<p>When an object speeds up or slows down, its velocity is changing. The rate at which velocity changes is the <strong>acceleration</strong>. The sign of the acceleration is a common source of confusion: unlike velocity, the sign of the acceleration does not tell you which way the object moves, and on its own it does not tell you whether the object speeds up or slows down.</p>' +
    '<p><strong class="mdkey">If v and a have the same sign, the object is speeding up. If they have opposite signs, it is slowing down.</strong></p>' +
    '<p>This leads to results that may seem surprising. In the first diagram the object has a <em>negative</em> acceleration but is speeding up. In the second, the object has a <em>positive</em> acceleration but is slowing down. Both happen because the velocity is negative: the object moves to the left.</p>',
  questions: [
    { id: 'q1', prompt: 'An object has v = \u221220 m/s and a = \u22122 m/s\u00b2. It is:',
      choices: ['Speeding up', { t: 'Slowing down', fb: 'A negative acceleration does not always mean slowing down. Compare the signs of v and a.' }, 'Moving at constant speed'],
      correct: 0, explain: 'v and a are both negative (same sign), so the object speeds up while moving left.' },
    { id: 'q2', prompt: 'An object has v = \u221212 m/s and a = +3 m/s\u00b2. It is:',
      choices: [{ t: 'Speeding up', fb: 'A positive acceleration does not always mean speeding up. Compare the signs of v and a.' }, 'Slowing down', 'Moving at constant speed'],
      correct: 1, explain: 'v and a have opposite signs, so the object slows down.' },
    { id: 'q3', prompt: 'Which rule always works for motion along a line?',
      choices: [{ t: 'Positive acceleration means speeding up', fb: 'Object 2 in this stage has positive acceleration and is slowing down.' },
                { t: 'Negative acceleration means slowing down', fb: 'Object 1 in this stage has negative acceleration and is speeding up.' },
                'Speeding up when v and a have the same sign; slowing down when they have opposite signs',
                { t: 'Speeding up whenever the object moves to the right', fb: 'Object 2 in stage 4 moved right and slowed down.' }],
      correct: 2, explain: 'Only the comparison of the two signs decides it, in either direction.' }
  ],
  ready: 'Stage 5 ready. Both objects start at the right and move left. Press Play and compare the signs of v and a.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
