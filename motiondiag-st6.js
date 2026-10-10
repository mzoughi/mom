/* motiondiag-st6.js \u2014 Stage 6: Slowing down, stopping, turning around. Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 6, title: 'Slowing down, stopping, and turning around', dim: 1, lanes: true, stepDt: 1, ghostDt: 1,
  panels: [
    { name: 'Object 1', color: 1, type: '1d', x0: -40, v0: 10, a: -2, tEnd: 10,
      desc: 'x\u2080 = \u221240 m, v\u2080 = +10 m/s, a = \u22122.00 m/s\u00b2, runs 10 s' },
    { name: 'Object 2', color: 2, type: '1d', x0: -40, v0: 20, a: -2, tEnd: 10,
      desc: 'x\u2080 = \u221240 m, v\u2080 = +20 m/s, a = \u22122.00 m/s\u00b2, runs 10 s' },
    { name: 'Object 3', color: 3, type: '1d', x0: -40, v0: 20, a: -2, tEnd: 14,
      desc: 'same as Object 2, but runs 14 s' }
  ],
  options: [
    { label: 'Turns around', panels: [0] },
    { label: 'Slows to a stop', panels: [1] },
    { label: 'Given more time', panels: [2] },
    { label: 'All 3', panels: [0, 1, 2] }
  ],
  text:
    '<h4>Zero velocity is not zero acceleration</h4>' +
    '<p>In some cases an object starts by slowing down, stops for an instant, and then speeds up in the opposite direction. Choose \u201cTurns around\u201d to see this. On the way back the object passes over its earlier positions, so its ghost images overlap. Turn on <b>Ghost lanes</b> to lift the ghost images above the axis: images before the turnaround go in the lower lane and images after it in the upper lane. The object itself stays on the axis, and small dots on the axis still mark where each image was taken.</p>' +
    '<p>Step to the moment the object stops (t = 5 s). Its velocity is zero, but <strong class="mdkey">its acceleration is still \u22122 m/s\u00b2.</strong> The acceleration never switched off; it is what turns the object around. <strong class="mdkey">Zero velocity does not mean zero acceleration.</strong></p>' +
    '<p>If we increase the initial velocity v\u2080 (\u201cSlows to a stop\u201d), the object only just stops at the end of the 10 s. Let the same motion run longer (\u201cGiven more time\u201d) and the object slows to a stop, reverses direction, and speeds up in the negative direction.</p>',
  questions: [
    { id: 'q1', prompt: 'At the instant Object 1 stops (t = 5 s), its acceleration is:',
      choices: [{ t: 'Zero', fb: 'Step to t = 5 s and read a. The velocity is zero, but it is still changing.' }, '\u22122 m/s\u00b2',
                { t: '+2 m/s\u00b2', fb: 'The acceleration is constant during the whole motion. Read a at any time.' }, 'Undefined'],
      correct: 1, explain: 'The acceleration stays \u22122 m/s\u00b2 the whole time, including the instant v = 0.' },
    { id: 'q2', prompt: 'After the turnaround (t > 5 s), Object 1 is:',
      choices: [{ t: 'Slowing down while moving right', fb: 'Check the velocity readout after t = 5 s. Which way is it moving now?' },
                'Speeding up while moving left', 'Moving left at constant speed', 'At rest'],
      correct: 1, explain: 'Now v < 0 and a < 0. Same signs, so it speeds up toward \u2212x.' }
  ],
  ready: 'Stage 6 ready. Choose a case and press Play, or step one second at a time to find the turnaround.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
