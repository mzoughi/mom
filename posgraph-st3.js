/* posgraph-st3.js \u2014 Stage 3: Match the motion (target diagram + graph). Requires posgraph-core.js */
(function(){ 'use strict';
function go(){ window.PosGraph.mount({
  stage: 3, mode: 'match', title: 'Matching motion', showTargetDiagram: true, targetFull: false,
  targets: [
    { label: 'Target 1', times: [0], phases: [{ x: -30, v: 10, a: 0 }] },
    { label: 'Target 2', times: [0], phases: [{ x: -40, v: 0, a: 2 }] },
    { label: 'Target 3', times: [0], phases: [{ x: -20, v: 16, a: -2 }] }
  ],
  intro:
    '<p>1. Press <b>Play</b> to view the target motion and its graph.</p>' +
    '<p>2. Set the sliders to the starting position x<sub>i</sub>, starting velocity v<sub>i</sub> and acceleration a that you think fit, then press <b>Play</b> to try them out.</p>' +
    '<p>3. Repeat until the graphs and motion diagrams match, then press <b>Check match</b>.</p>',
  text:
    '<h4>Reading the motion</h4>' +
    '<p>Start with x<sub>i</sub>: where is the target at t = 0? Then look at the spacing of the target\u2019s images and the slope of its graph near t = 0 to estimate v<sub>i</sub>. Finally, decide whether the graph is straight (a = 0) or bends upward or downward, and how strongly.</p>' +
    '<p>The data table lists the target\u2019s position every second as it plays. For constant acceleration, the velocity at any time is v = v<sub>i</sub> + a t, and the turning point (if any) is where v = 0.</p>',
  ready: 'Stage 3 ready. Press Play to watch target 1, then set the sliders to match it.'
}); }
if (window.PosGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
