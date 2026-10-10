/* posgraph-st1.js \u2014 Stage 1: Constant velocity, graph + motion diagram. Requires posgraph-core.js */
(function(){ 'use strict';
function go(){ window.PosGraph.mount({
  stage: 1, mode: 'explore', title: 'Position graphs for constant velocity',
  scenarios: [
    { label: 'Moving right', phases: [{ x: -30, v: 8, a: 0 }] },
    { label: 'Moving left', phases: [{ x: 50, v: -6, a: 0 }] },
    { label: 'At rest', phases: [{ x: 20, v: 0, a: 0 }] },
    { label: 'Moving right, slower', phases: [{ x: -30, v: 4, a: 0 }] },
    { label: 'Different start', phases: [{ x: 0, v: 4, a: 0 }] }
  ],
  text:
    '<h4>Two pictures of the same motion</h4>' +
    '<p>A motion diagram shows <em>where</em> an object is at equal time intervals. A <strong>position graph</strong> (x versus t) shows the same information, but spreads it out in time: each image in the motion diagram becomes one dot on the graph. Press <b>Play</b> and watch both being built together.</p>' +
    '<p>For constant velocity the images are equally spaced, and the graph is a <strong class="pgkeyword">straight line</strong>. <strong class="pgkeyword">The slope of the position graph is the velocity.</strong> A line rising to the right means positive velocity, a falling line means negative velocity, and a horizontal line means the object is at rest. A steeper line means a larger speed. Turn on the <b>Slope tool</b> to see the slope at the current time.</p>' +
    '<p>The value of the graph at t = 0 is the <strong>initial position</strong> x<sub>i</sub>. Compare \u201cMoving right, slower\u201d with \u201cDifferent start\u201d: same slope, different starting point.</p>',
  questions: [
    { id: 'q1', prompt: 'The slope of a position (x versus t) graph tells you the object\u2019s:',
      choices: ['Position', 'Velocity', { t: 'Acceleration', fb: 'Acceleration is shown by how the slope changes (curvature), which you will see in stage 2.' }, 'Distance from the origin'],
      correct: 1, explain: 'Slope = change in position \u00f7 change in time = velocity.' },
    { id: 'q2', prompt: 'A horizontal line on a position graph means the object is:',
      choices: ['At rest', { t: 'Moving at constant velocity to the right', fb: 'A horizontal line has zero slope. What velocity is that?' }, 'Speeding up', 'At the origin'],
      correct: 0, explain: 'Zero slope means zero velocity: the position does not change.' },
    { id: 'q3', prompt: 'Compare \u201cMoving right\u201d and \u201cMoving right, slower\u201d. On the graph, the faster object has:',
      choices: ['The steeper line', { t: 'The higher line', fb: 'Height on the graph is position, not speed. Compare the slopes.' }, 'The longer line'],
      correct: 0, explain: 'A steeper slope means a larger change in position each second, so a larger speed.' },
    { id: 'q4', prompt: 'The value of the graph at t = 0 gives the:',
      choices: ['Initial position', 'Initial velocity', 'Acceleration'],
      correct: 0, explain: 'At t = 0 the graph shows where the motion starts, x<sub>i</sub>.' }
  ],
  ready: 'Stage 1 ready. Choose a motion and press Play to build its motion diagram and position graph together.'
}); }
if (window.PosGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
