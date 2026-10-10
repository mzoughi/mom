/* posgraph-st4.js \u2014 Stage 4: Match the graph (no target diagram). Requires posgraph-core.js */
(function(){ 'use strict';
function go(){ window.PosGraph.mount({
  stage: 4, mode: 'match', title: 'Matching the graph', showTargetDiagram: false, targetFull: true,
  targets: [
    { label: 'Target 1', times: [0], phases: [{ x: 50, v: -8, a: 0 }] },
    { label: 'Target 2', times: [0], phases: [{ x: -10, v: -10, a: 2 }] },
    { label: 'Target 3', times: [0], phases: [{ x: 60, v: -5, a: -1 }] }
  ],
  intro:
    '<p>This time only the target\u2019s position graph is given. Find the starting position x<sub>i</sub>, starting velocity v<sub>i</sub> and acceleration a that produce it, press <b>Play</b> to try them out, and then press <b>Check match</b>.</p>',
  text:
    '<h4>Reading parameters from a graph</h4>' +
    '<p><strong class="pgkeyword">x<sub>i</sub></strong> is where the graph crosses t = 0. <strong class="pgkeyword">v<sub>i</sub></strong> is the slope at t = 0. For a straight line, pick two points on gridlines and divide the change in x by the change in t.</p>' +
    '<p>For a curve, use the turning point if there is one: at the turning point v = 0, so v<sub>i</sub> + a t<sub>turn</sub> = 0. Otherwise read the position at two times and use x = x<sub>i</sub> + v<sub>i</sub> t + \u00bd a t\u00b2 to solve for v<sub>i</sub> and a.</p>' +
    '<p>The data table lists the target\u2019s positions every second, which is useful for these calculations.</p>',
  ready: 'Stage 4 ready. Only the target graph is shown. Read its parameters, set the sliders, and press Play.'
}); }
if (window.PosGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
