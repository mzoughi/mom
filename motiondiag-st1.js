/* motiondiag-st1.js \u2014 Stage 1: Motion diagrams (constant velocity). Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 1, title: 'Motion diagrams', dim: 1, stepDt: 0.5, ghostDt: 0.5,
  panels: [
    { name: 'Object', color: 1, type: '1d', x0: -25, v0: 10, a: 0, tEnd: 8.5,
      desc: 'starts at x\u2080 = \u221225 m and moves with v = +10 m/s, a = 0' }
  ],
  options: [ { label: 'Constant velocity', panels: [0] } ],
  text:
    '<h4>What a motion diagram shows</h4>' +
    '<p>When you study motion in one dimension (along a straight line), a good place to begin is the <strong>motion diagram</strong>. A motion diagram is like a composite photograph: it shows an object\u2019s position at a series of <strong class="mdkey">equally spaced time intervals</strong>. Each faded circle is a \u201cghost image\u201d of where the object was at one instant; the solid circle is where it is now.</p>' +
    '<p>Press <b>Play</b> to build a motion diagram for an object moving to the right at constant velocity. Use <b>Step</b> to advance one time interval (0.5 s) at a time, and open the <b>Data table</b> to read the spacing between images.</p>' +
    '<p>The spacing never changes: in every 0.5 s interval the object covers the same 5 m. <strong class="mdkey">Equal spacing means constant velocity.</strong> Simple as it looks, the motion diagram is a powerful tool for analyzing motion.</p>',
  questions: [
    { id: 'q1', prompt: 'The images in this diagram are equally spaced. What does that tell you about the motion?',
      choices: ['The object is at rest', 'The object moves with constant velocity', 'The object is speeding up', 'The object is slowing down'],
      correct: 1, hint: 'Open the data table and look at the spacing column. Is the spacing changing?',
      explain: 'Equal distances in equal time intervals mean the velocity does not change.' },
    { id: 'q2', prompt: 'Images are recorded every 0.5 s and are 5 m apart. What is the object\u2019s speed?',
      choices: [ { t: '2.5 m/s', fb: 'That is 5 m \u00d7 0.5 s. Speed is distance divided by time.' },
                 { t: '5 m/s', fb: 'That is the distance between images, which are 0.5 s apart, not 1 s.' },
                 '10 m/s',
                 { t: '20 m/s', fb: 'Check the arithmetic: 5 m \u00f7 0.5 s.' } ],
      correct: 2, explain: 'Speed = distance \u00f7 time = 5 m \u00f7 0.5 s = 10 m/s, which matches the readout.' }
  ],
  ready: 'Stage 1 ready. Press Play to build a motion diagram for an object moving at constant velocity.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
