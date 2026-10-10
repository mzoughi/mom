/* velgraph-st3.js \u2014 Stage 3: Match the motion (target diagram + velocity graph). Requires velgraph-core.js */
(function(){ 'use strict';
function go(){ window.VelGraph.mount({
  stage: 3, mode: 'match', title: 'Matching motion', showTargetDiagram: true, targetFull: false, xSlider: true,
  targets: [
    { label: 'Target 1', x0: -30, times: [0], phases: [{ v: 10, a: 0 }] },
    { label: 'Target 2', x0: -40, times: [0], phases: [{ v: 0, a: 2 }] },
    { label: 'Target 3', x0: -20, times: [0], phases: [{ v: 16, a: -2 }] }
  ],
  intro:
    '<p>1. Press <b>Play</b> to view the target motion and its velocity graph.</p>' +
    '<p>2. Set the sliders to the starting position x<sub>i</sub>, starting velocity v<sub>i</sub> and acceleration a that you think fit, then press <b>Play</b> to try them out.</p>' +
    '<p>3. Repeat until the graphs and motion diagrams match, then press <b>Check match</b>.</p>',
  text:
    '<h4>What each picture tells you</h4>' +
    '<p>The velocity graph gives you two of the three parameters: <strong class="vgkeyword">v<sub>i</sub> is the height of the graph at t = 0, and a is its slope.</strong> It cannot give you x<sub>i</sub>: for that, look at where the target\u2019s motion diagram starts.</p>' +
    '<p>The data table lists the target\u2019s velocity every second as it plays.</p>',
  ready: 'Stage 3 ready. Press Play to watch target 1, then set the sliders to match it.'
}); }
if (window.VelGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
