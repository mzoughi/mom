/* posgraph-st2.js \u2014 Stage 2: Changing velocity (curved graphs). Requires posgraph-core.js */
(function(){ 'use strict';
function go(){ window.PosGraph.mount({
  stage: 2, mode: 'explore', title: 'Position graphs for changing velocity',
  scenarios: [
    { label: 'Speeding up', phases: [{ x: -40, v: 0, a: 2 }] },
    { label: 'Slowing down', phases: [{ x: -40, v: 20, a: -2 }] },
    { label: 'Speeding up, moving left', phases: [{ x: 60, v: 0, a: -2 }] },
    { label: 'Slowing down, moving left', phases: [{ x: 60, v: -20, a: 2 }] },
    { label: 'Turning around', phases: [{ x: -30, v: 15, a: -3 }] }
  ],
  text:
    '<h4>Curved graphs mean changing velocity</h4>' +
    '<p>When the velocity changes, the spacing in the motion diagram changes and the position graph <strong class="pgkeyword">curves</strong>, because its slope changes. Use the <b>Slope tool</b> and step through the motion to watch the slope change.</p>' +
    '<p><strong class="pgkeyword">A graph that bends upward means positive acceleration; a graph that bends downward means negative acceleration.</strong> As with the motion diagrams, the sign of the acceleration alone does not tell you whether the object speeds up: look at the steepness. If the graph gets steeper, the object is speeding up; if it flattens out, it is slowing down.</p>' +
    '<p>In \u201cTurning around\u201d, the graph reaches a highest point. There the slope is zero, so the object is momentarily at rest, and the acceleration is still \u22123 m/s\u00b2.</p>',
  questions: [
    { id: 'q1', prompt: 'A position graph that bends upward (like a cup) means the acceleration is:',
      choices: ['Positive', 'Negative', 'Zero'], correct: 0, hint: 'Compare \u201cSpeeding up\u201d and \u201cSlowing down, moving left\u201d. Both bend upward. Read a.',
      explain: 'Bending upward means the slope keeps increasing, so the velocity increases: a > 0.' },
    { id: 'q2', prompt: 'At the highest point of the \u201cTurning around\u201d graph, the velocity is:',
      choices: ['Zero', { t: 'At its largest value', fb: 'Turn on the Slope tool at the top of the curve. How steep is it there?' }, '\u22123 m/s'],
      correct: 0, explain: 'The tangent is horizontal at the top, so the slope (velocity) is zero for an instant.' },
    { id: 'q3', prompt: 'In \u201cSpeeding up, moving left\u201d, the graph bends downward and gets steeper. The object is:',
      choices: ['Speeding up', { t: 'Slowing down', fb: 'A downward bend means negative acceleration, but steepness is what tells you the speed.' }, 'Moving at constant speed'],
      correct: 0, explain: 'The graph gets steeper, so the speed increases. v and a are both negative.' },
    { id: 'q4', prompt: 'A motion diagram with equally spaced images goes with a position graph that is:',
      choices: ['A straight line', 'A curve bending upward', 'A curve bending downward'],
      correct: 0, explain: 'Equal spacing means constant velocity, which is a constant slope: a straight line.' }
  ],
  ready: 'Stage 2 ready. Choose a motion and press Play. Watch how the spacing and the curve change together.'
}); }
if (window.PosGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
