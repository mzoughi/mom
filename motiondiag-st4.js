/* motiondiag-st4.js \u2014 Stage 4: Positive direction, signs of v and a. Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 4, title: 'Speeding up and slowing down in the positive direction', dim: 1, stepDt: 1, ghostDt: 1,
  panels: [
    { name: 'Object 1', color: 1, type: '1d', x0: -40, v0: 0, a: 2, tEnd: 10,
      desc: 'x\u2080 = \u221240 m, v\u2080 = 0, a = +2.00 m/s\u00b2' },
    { name: 'Object 2', color: 2, type: '1d', x0: -40, v0: 20, a: -2, tEnd: 10,
      desc: 'x\u2080 = \u221240 m, v\u2080 = +20 m/s, a = \u22122.00 m/s\u00b2' },
    { name: 'Object 3', color: 3, type: '1d', x0: 10, v0: 0, a: 2, tEnd: 7,
      desc: 'x\u2080 = +10 m, v\u2080 = 0, a = +2.00 m/s\u00b2' }
  ],
  options: [
    { label: 'Speeding up', panels: [0] },
    { label: 'Slowing down', panels: [1] },
    { label: 'Both', panels: [0, 1] },
    { label: 'Different start', panels: [0, 2] }
  ],
  text:
    '<h4>The signs of velocity and acceleration</h4>' +
    '<p>Objects can speed up or slow down while moving in the positive direction. In the first diagram the object has a positive acceleration and is speeding up. In the second, the object has a negative acceleration and is slowing down.</p>' +
    '<p>What is important to remember: <strong class="mdkey">to decide whether an object is speeding up or slowing down, you must look at the signs of both the acceleration and the velocity.</strong></p>' +
    '<p>Choose \u201cDifferent start\u201d to compare two objects with the same v\u2080 and a but different starting positions. <strong class="mdkey">The initial position x\u2080 does not affect whether the object speeds up or slows down.</strong> It only determines where the motion starts.</p>',
  questions: [
    { id: 'q1', prompt: 'An object has v = +8 m/s and a = +2 m/s\u00b2. It is:',
      choices: ['Speeding up', 'Slowing down', 'Moving at constant speed'], correct: 0,
      explain: 'v and a have the same sign, so the velocity grows in size.' },
    { id: 'q2', prompt: 'An object has v = +8 m/s and a = \u22122 m/s\u00b2. It is:',
      choices: ['Speeding up', 'Slowing down', 'Moving at constant speed'], correct: 1,
      explain: 'v and a have opposite signs, so the velocity shrinks toward zero.' },
    { id: 'q3', prompt: 'Two objects have the same v\u2080 and a, but one starts at x\u2080 = \u221240 m and the other at x\u2080 = +10 m. How do their motion diagrams differ?',
      choices: ['Only in where the images are located; the spacing pattern is the same',
                { t: 'One speeds up and the other slows down', fb: 'Compare Objects 1 and 3 under \u201cDifferent start\u201d. Do their badges differ?' },
                { t: 'The one starting at positive x\u2080 moves faster', fb: 'Compare the v readouts of Objects 1 and 3 at the same time.' },
                { t: 'They do not differ at all', fb: 'Look again: the two diagrams start at different places.' }],
      correct: 0, explain: 'x\u2080 shifts the whole diagram along the axis but does not change velocity or acceleration.' }
  ],
  ready: 'Stage 4 ready. Choose a case and press Play. Compare the signs of v and a in each readout.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
