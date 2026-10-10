/* motiondiag-st3.js \u2014 Stage 3: Speeding up and slowing down (spacing). Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 3, title: 'Speeding up and slowing down', dim: 1, stepDt: 1, ghostDt: 1,
  panels: [
    { name: 'Object 1', color: 1, type: '1d', x0: -40, v0: 0, a: 2.5, tEnd: 8.9,
      desc: 'starts at rest at x\u2080 = \u221240 m, a = +2.50 m/s\u00b2' },
    { name: 'Object 2', color: 2, type: '1d', x0: -36, v0: 24, a: -3, tEnd: 8,
      desc: 'starts at x\u2080 = \u221236 m with v\u2080 = +24 m/s, a = \u22123.00 m/s\u00b2' }
  ],
  options: [
    { label: 'Speeding up', panels: [0] },
    { label: 'Slowing down', panels: [1] },
    { label: 'Both', panels: [0, 1] }
  ],
  text:
    '<h4>Reading speed changes from the spacing</h4>' +
    '<p>On a motion diagram you can tell at a glance whether an object moves at constant speed, speeds up, or slows down. In stage 1, constant speed produced images with equal spacing. Choose \u201cSpeeding up\u201d and \u201cSlowing down\u201d to see the other two cases.</p>' +
    '<p><strong class="mdkey">When an object speeds up, the spacing between images increases. When it slows down, the spacing decreases.</strong> Check the spacing column in the data table to confirm this with numbers.</p>' +
    '<p>The acceleration arrow (a) shows how the velocity is changing. Watch the velocity arrow grow when a points the same way as v, and shrink when a points opposite to v.</p>',
  questions: [
    { id: 'q1', prompt: 'In a motion diagram, the spacing between successive images gets larger and larger. The object is:',
      choices: ['Speeding up', 'Slowing down', 'Moving at constant speed', { t: 'Moving to the left', fb: 'Spacing tells you about speed, not direction. Growing spacing in either direction means the same thing.' }],
      correct: 0, explain: 'It covers more distance in each equal time interval, so its speed is increasing.' },
    { id: 'q2', prompt: 'Object 2 moves to the right and slows down. Which pair of signs is correct?',
      choices: [ { t: 'v > 0 and a > 0', fb: 'With both positive, the velocity would grow. Here it shrinks.' },
                 'v > 0 and a < 0',
                 { t: 'v < 0 and a > 0', fb: 'Object 2 moves to the right, so v is positive.' },
                 { t: 'v < 0 and a < 0', fb: 'Object 2 moves to the right, so v is positive.' } ],
      correct: 1, explain: 'It moves right (v > 0) and its velocity is decreasing, so the acceleration points left (a < 0).' }
  ],
  ready: 'Stage 3 ready. Choose speeding up, slowing down, or both, then press Play and watch the spacing.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
