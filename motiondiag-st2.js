/* motiondiag-st2.js \u2014 Stage 2: Positive and negative directions. Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 2, title: 'Positive and negative directions', dim: 1, stepDt: 1, ghostDt: 1,
  panels: [
    { name: 'Object 1', color: 1, type: '1d', x0: -40, v0: 15, a: 0, tEnd: 6.6,
      desc: 'starts at x\u2080 = \u221240 m, v = +15 m/s' },
    { name: 'Object 2', color: 2, type: '1d', x0: 60, v0: -15, a: 0, tEnd: 6.6,
      desc: 'starts at x\u2080 = +60 m, v = \u221215 m/s' }
  ],
  options: [
    { label: 'Positive velocity', panels: [0] },
    { label: 'Negative velocity', panels: [1] },
    { label: 'Both', panels: [0, 1] }
  ],
  text:
    '<h4>Direction and the sign of velocity</h4>' +
    '<p>If all one-dimensional motion were to the right there would be little more to say, but objects can move to the right or to the left. Mathematically we give the direction of motion with a <strong>sign</strong>: <strong class="mdkey">positive velocity means motion toward +x (to the right), and negative velocity means motion toward \u2212x (to the left).</strong></p>' +
    '<p>Choose \u201cPositive velocity\u201d and \u201cNegative velocity\u201d to see each case, then \u201cBoth\u201d to compare them. The velocity arrow (v) always points in the direction of motion.</p>' +
    '<p>Both objects have the same <em>speed</em>, 15 m/s. Speed is the size of the velocity and is never negative; the sign of the velocity carries only the direction.</p>',
  questions: [
    { id: 'q1', prompt: 'An object has velocity v = \u221215 m/s. Which way is it moving?',
      choices: ['Toward +x (to the right)', 'Toward \u2212x (to the left)',
                { t: 'It is slowing down', fb: 'The sign of velocity says nothing about slowing down. It only gives the direction of motion.' },
                'It is not moving'],
      correct: 1, explain: 'A negative velocity means the object moves in the negative x direction.' },
    { id: 'q2', prompt: 'Object 1 has v = +15 m/s and Object 2 has v = \u221215 m/s. How do their speeds compare?',
      choices: ['Object 1 is faster', { t: 'Object 2 is faster', fb: 'A negative velocity does not mean a larger or smaller speed. Compare the sizes, ignoring the signs.' }, 'They have the same speed'],
      correct: 2, hint: 'Speed is the size of the velocity, ignoring its sign.',
      explain: 'Speed is the magnitude of velocity, so both move at 15 m/s.' }
  ],
  ready: 'Stage 2 ready. Choose positive velocity, negative velocity, or both, then press Play.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
