/* motiondiag-st8.js \u2014 Stage 8: Tangential + perpendicular acceleration (2-D). Requires motiondiag-core.js */
(function(){ 'use strict';
function go(){ window.MotionDiag.mount({
  stage: 8, title: 'Acceleration with tangential and perpendicular parts', dim: 2, stepDt: 0.5,
  bounds: { x: [-30, 30], y: [-30, 30] }, vSec: 0.6, aSec2: 1.2, showComponents: true,
  panels: [
    { name: 'Object 1', color: 1, type: 'circle', c: [0, 0], R: 20, th0: -90, v0: 3, at: 1.2, tEnd: 8, ghostDt: 1, vSec: 1.5, aSec2: 2.2,
      desc: 'speeding up on a curve, a\u2225 = +1.20 m/s\u00b2, R = 20 m' },
    { name: 'Object 2', color: 2, type: 'circle', c: [0, 0], R: 20, th0: -90, v0: 13, at: -1.5, tEnd: 8, ghostDt: 1, vSec: 1.2, aSec2: 2,
      desc: 'slowing down on a curve, a\u2225 = \u22121.50 m/s\u00b2, R = 20 m' },
    { name: 'Object 3', color: 3, type: 'line', p0: [-25, -20], v0: [12.5, 19.6], a: [0, -9.8], tEnd: 4, ghostDt: 0.5,
      desc: 'projectile, a = 9.8 m/s\u00b2 straight down' }
  ],
  options: [
    { label: 'Speeding up on a curve', panels: [0] },
    { label: 'Slowing down on a curve', panels: [1] },
    { label: 'Projectile', panels: [2] },
    { label: 'All 3', panels: [0, 1, 2] }
  ],
  text:
    '<h4>Splitting the acceleration into two parts</h4>' +
    '<p>In general the acceleration points at some angle to the velocity. It helps to split it into two components, drawn as dashed arrows:</p>' +
    '<p><strong>a\u2225, the tangential component,</strong> lies along the velocity. <strong class="mdkey">a\u2225 changes the speed.</strong> When a\u2225 points along v the object speeds up; when it points against v the object slows down. This is the same sign rule you used on the number line.</p>' +
    '<p><strong>a\u22a5, the perpendicular component,</strong> is at right angles to the velocity. <strong class="mdkey">a\u22a5 changes the direction</strong> and bends the path toward the side it points to.</p>' +
    '<p>So the angle between a and v tells the whole story: less than 90\u00b0 means speeding up while turning, more than 90\u00b0 means slowing down while turning, and exactly 90\u00b0 means turning at constant speed.</p>' +
    '<p>The projectile is a good test. Gravity never changes, but its angle to the velocity does. On the way up, a has a component against v and the projectile slows down; at the top (t = 2 s) a is perpendicular to v; on the way down, a has a component along v and the projectile speeds up. Step through it and watch a\u2225 change sign.</p>',
  questions: [
    { id: 'q1', prompt: 'The angle between a and v is 60\u00b0. The object is:',
      choices: ['Speeding up and turning', { t: 'Slowing down and turning', fb: 'An angle under 90\u00b0 means a has a component along v.' },
                'Turning at constant speed', 'Moving in a straight line at constant speed'],
      correct: 0, explain: 'Under 90\u00b0, a\u2225 points along v (speeds up) and a\u22a5 is not zero (turns).' },
    { id: 'q2', prompt: 'At the top of the projectile\u2019s path, a is perpendicular to v. At that instant the speed is:',
      choices: ['Increasing', 'Decreasing', 'Neither increasing nor decreasing (it is at its minimum)',
                { t: 'Zero', fb: 'Step to t = 2 s. The projectile still moves horizontally at 12.5 m/s.' }],
      correct: 2, explain: 'With a\u2225 = 0 the speed is not changing at that instant; it has stopped decreasing and is about to increase.' },
    { id: 'q3', prompt: 'Which part of the acceleration changes the speed of an object?',
      choices: ['The tangential component a\u2225 (along v)', { t: 'The perpendicular component a\u22a5', fb: 'Stage 7 showed a purely perpendicular acceleration keeping the speed constant.' },
                'Both components equally', 'Neither'],
      correct: 0, explain: 'a\u2225 changes the speed; a\u22a5 changes only the direction.' }
  ],
  ready: 'Stage 8 ready. Dashed arrows show the tangential and perpendicular parts of a. Choose a case and press Play.'
}); }
if (window.MotionDiag) go(); else document.addEventListener('DOMContentLoaded', go);
})();
