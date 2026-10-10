/* motiondiag-st7.js \u2014 Stage 7: Perpendicular acceleration (2-D). Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 7, title: 'Acceleration perpendicular to velocity', dim: 2, stepDt: 1, ghostDt: 1,
  bounds: { x: [-30, 30], y: [-30, 30] }, vSec: 1.2, aSec2: 3,
  panels: [
    { name: 'Object 1', color: 1, type: 'line', p0: [-25, -22], v0: [2.4, 1.8], a: [0.96, 0.72], tEnd: 8,
      desc: 'a parallel to v, |a| = 1.20 m/s\u00b2' },
    { name: 'Object 2', color: 2, type: 'circle', c: [0, 0], R: 20, th0: -90, v0: 8, at: 0, tEnd: 12,
      desc: 'a perpendicular to v, speed 8 m/s, R = 20 m' }
  ],
  options: [
    { label: 'a parallel to v', panels: [0] },
    { label: 'a perpendicular to v', panels: [1] },
    { label: 'Both', panels: [0, 1] }
  ],
  text:
    '<h4>When acceleration is perpendicular to velocity</h4>' +
    '<p>So far every acceleration pointed along the line of motion, either with the velocity or against it. Acceleration is a vector, and in two dimensions it can point in any direction relative to the velocity. Here we look at the other extreme: <strong>acceleration perpendicular to velocity</strong>.</p>' +
    '<p>Choose \u201ca parallel to v\u201d first. The object moves in a straight line and the spacing between images grows, just like the speeding-up cases on the number line. Now choose \u201ca perpendicular to v\u201d. The images are <strong class="mdkey">equally spaced, so the speed is constant, yet the path bends.</strong> A perpendicular acceleration changes only the <em>direction</em> of the velocity, not its size.</p>' +
    '<p>If the acceleration stays perpendicular to the velocity with a constant size, the object moves in a circle at constant speed, and the acceleration always points toward the center (marked +). Its size is a = v\u00b2/R = (8 m/s)\u00b2 \u00f7 20 m = 3.2 m/s\u00b2. This is <strong>centripetal acceleration</strong>.</p>',
  questions: [
    { id: 'q1', prompt: 'With acceleration perpendicular to velocity, the images around the circle are equally spaced. This means the object:',
      choices: [{ t: 'Is not accelerating', fb: 'Watch the velocity arrow: is it the same vector at every image?' },
                'Has constant speed while the direction of its velocity changes', 'Is speeding up', 'Is slowing down'],
      correct: 1, explain: 'Equal spacing means constant speed; the curving path means the velocity direction changes.' },
    { id: 'q2', prompt: 'Is an object moving in a circle at constant speed accelerating?',
      choices: [{ t: 'No, because its speed is constant', fb: 'Acceleration is any change in the velocity vector, including a change in direction.' },
                'Yes, because the direction of its velocity is changing', 'Only if the circle is small'],
      correct: 1, explain: 'Velocity is a vector. Changing its direction is an acceleration, even at constant speed.' },
    { id: 'q3', prompt: 'For uniform circular motion, the acceleration points:',
      choices: ['Along the velocity', 'Opposite the velocity', 'Toward the center of the circle', 'Away from the center'],
      correct: 2, hint: 'Look at the orange a arrow on Object 2 at several times.',
      explain: 'It points toward the center (centripetal), perpendicular to v at every instant.' }
  ],
  ready: 'Stage 7 ready. This stage is two-dimensional. Choose a case and press Play.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
