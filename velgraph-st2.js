/* velgraph-st2.js \u2014 Stage 2: Changing velocity (sloped velocity graphs). Requires velgraph-core.js */
(function(){ 'use strict';
function go(){ window.VelGraph.mount({
  stage: 2, mode: 'explore', title: 'Velocity graphs for changing velocity',
  scenarios: [
    { label: 'Speeding up', x0: -40, phases: [{ v: 0, a: 2 }] },
    { label: 'Slowing down', x0: -40, phases: [{ v: 20, a: -2 }] },
    { label: 'Speeding up, moving left', x0: 60, phases: [{ v: 0, a: -2 }] },
    { label: 'Slowing down, moving left', x0: 60, phases: [{ v: -20, a: 2 }] },
    { label: 'Turning around', x0: -30, phases: [{ v: 15, a: -3 }] }
  ],
  text:
    '<h4>Slope is acceleration</h4>' +
    '<p>When the velocity changes at a constant rate, the velocity graph is a straight line that is <em>not</em> horizontal. <strong class="vgkeyword">The slope of the velocity graph is the acceleration.</strong> A rising line means positive acceleration; a falling line means negative acceleration. Turn on the <b>Slope tool</b> to read it.</p>' +
    '<p>As before, the sign of the acceleration alone does not tell you whether the object speeds up. On a velocity graph the rule is easy to see: <strong class="vgkeyword">the object speeds up when the graph moves away from the t axis and slows down when it moves toward the axis.</strong></p>' +
    '<p>In \u201cTurning around\u201d the graph crosses the t axis at t = 5 s. At that instant v = 0 and the object reverses direction, while the acceleration stays \u22123 m/s\u00b2. Turn on the <b>Area tool</b>: the area above the axis (moving right) and the area below it (moving left) partly cancel, which is why the object ends up back where it started.</p>',
  questions: [
    { id: 'q1', prompt: 'The slope of a velocity graph gives the:',
      choices: ['Acceleration', { t: 'Velocity', fb: 'The velocity is the height of this graph. The slope is how fast that height changes.' }, 'Displacement', 'Position'],
      correct: 0, explain: 'Slope = change in velocity \u00f7 change in time = acceleration.' },
    { id: 'q2', prompt: 'Where a velocity graph crosses the t axis, the object:',
      choices: ['Is momentarily at rest and reverses direction', { t: 'Has zero acceleration', fb: 'Turn on the Slope tool at the crossing. Is the slope zero there?' }, 'Is back at its starting position'],
      correct: 0, explain: 'v = 0 at the crossing, and the sign of v changes, so the direction reverses.' },
    { id: 'q3', prompt: 'In \u201cSpeeding up, moving left\u201d the graph starts at 0 and goes down below the axis. The object is:',
      choices: ['Speeding up', { t: 'Slowing down', fb: 'The graph moves away from the t axis, so the speed grows.' }, 'Moving at constant speed'],
      correct: 0, explain: 'The graph moves away from the axis, so the speed increases. v and a are both negative.' },
    { id: 'q4', prompt: 'A velocity graph is above the t axis and falling toward it. The object is:',
      choices: ['Speeding up while moving toward +x', 'Slowing down while moving toward +x', 'Slowing down while moving toward \u2212x'],
      correct: 1, explain: 'Above the axis means moving toward +x; heading toward the axis means slowing down.' }
  ],
  ready: 'Stage 2 ready. Choose a motion and press Play. Watch how the spacing and the slope of the velocity graph go together.'
}); }
if (window.VelGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
