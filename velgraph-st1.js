/* velgraph-st1.js \u2014 Stage 1: Constant velocity, velocity graph + motion diagram. Requires velgraph-core.js */
(function(){ 'use strict';
function go(){ window.VelGraph.mount({
  stage: 1, mode: 'explore', title: 'Velocity graphs for constant velocity',
  scenarios: [
    { label: 'Moving right', x0: -30, phases: [{ v: 8, a: 0 }] },
    { label: 'Moving left', x0: 50, phases: [{ v: -6, a: 0 }] },
    { label: 'At rest', x0: 20, phases: [{ v: 0, a: 0 }] },
    { label: 'Moving right, slower', x0: -30, phases: [{ v: 4, a: 0 }] },
    { label: 'Different start', x0: 0, phases: [{ v: 4, a: 0 }] }
  ],
  text:
    '<h4>Reading a velocity graph</h4>' +
    '<p>A <strong>velocity graph</strong> (v versus t) shows how fast and in which direction the object moves at each instant. Each image in the motion diagram matches one dot on the graph, at the velocity the object had at that moment. Press <b>Play</b> and watch both being built together.</p>' +
    '<p><strong class="vgkeyword">The height of the graph is the velocity.</strong> Above the t axis the object moves toward +x; below the axis it moves toward \u2212x; on the axis it is at rest. For constant velocity the motion diagram has equal spacing and the velocity graph is a <strong class="vgkeyword">horizontal line</strong>. Be careful: on a velocity graph a horizontal line means constant velocity, not \u201cat rest\u201d as on a position graph.</p>' +
    '<p>Turn on the <b>Area tool</b>. <strong class="vgkeyword">The area between the graph and the t axis is the displacement \u0394x.</strong> Area above the axis counts as positive and area below as negative. Now compare \u201cMoving right, slower\u201d with \u201cDifferent start\u201d: the velocity graphs are identical, because a velocity graph cannot show where the motion starts.</p>',
  questions: [
    { id: 'q1', prompt: 'A horizontal line above the t axis on a velocity graph means the object is:',
      choices: [{ t: 'At rest', fb: 'That is true for a horizontal line on a position graph. Here the height is the velocity.' }, 'Moving toward +x at constant velocity', 'Speeding up', 'Slowing down'],
      correct: 1, explain: 'The velocity is constant (horizontal line) and positive (above the axis).' },
    { id: 'q2', prompt: 'A velocity graph lies below the t axis. The object is:',
      choices: ['Moving toward \u2212x', { t: 'Slowing down', fb: 'Being below the axis tells you the direction, not whether the speed changes.' }, 'At a negative position', 'At rest'],
      correct: 0, explain: 'Below the axis means negative velocity, which is motion toward \u2212x.' },
    { id: 'q3', prompt: 'The area between a velocity graph and the t axis, from 0 to t, gives the:',
      choices: ['Displacement', 'Acceleration', 'Final velocity', { t: 'Starting position', fb: 'Compare \u201cMoving right, slower\u201d and \u201cDifferent start\u201d: same area, different starting positions.' }],
      correct: 0, explain: 'Velocity \u00d7 time is displacement, so the area equals \u0394x.' },
    { id: 'q4', prompt: '\u201cMoving right, slower\u201d and \u201cDifferent start\u201d have identical velocity graphs. What does that tell you?',
      choices: ['A velocity graph does not show the starting position', { t: 'The two objects are at the same place', fb: 'Look at their motion diagrams: they start at different places.' }, 'Both objects are at rest'],
      correct: 0, explain: 'Same velocity at every instant gives the same graph, wherever the object starts.' }
  ],
  ready: 'Stage 1 ready. Choose a motion and press Play to build its motion diagram and velocity graph together.'
}); }
if (window.VelGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
