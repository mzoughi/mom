/* velgraph-st4.js \u2014 Stage 4: Match the velocity graph (no target diagram). Requires velgraph-core.js */
(function(){ 'use strict';
function go(){ window.VelGraph.mount({
  stage: 4, mode: 'match', title: 'Matching the velocity graph', showTargetDiagram: false, targetFull: true, xSlider: true,
  targets: [
    { label: 'Target 1', x0: 50, times: [0], phases: [{ v: -8, a: 0 }], given: 'start' },
    { label: 'Target 2', x0: -20, times: [0], phases: [{ v: -6, a: 2 }], given: 'end' },
    { label: 'Target 3', x0: 60, times: [0], phases: [{ v: -5, a: -1 }], given: 'end' }
  ],
  intro:
    '<p>Only the target\u2019s velocity graph is shown now. Because a velocity graph cannot show where the motion starts, each target comes with one piece of position information. Find x<sub>i</sub>, v<sub>i</sub> and a, press <b>Play</b> to try them out, then press <b>Check match</b>.</p>',
  text:
    '<h4>Using slope and area</h4>' +
    '<p>Read <strong class="vgkeyword">v<sub>i</sub></strong> from the height of the graph at t = 0 and <strong class="vgkeyword">a</strong> from its slope: pick two points on gridlines and divide the change in v by the change in t.</p>' +
    '<p>When you are given the <em>final</em> position instead of the starting one, use the area. <strong class="vgkeyword">The area between the graph and the t axis from 0 to 10 s is the displacement \u0394x</strong> (area below the axis counts as negative), so x<sub>i</sub> = x<sub>final</sub> \u2212 \u0394x. The area under a straight-line graph is made of rectangles and triangles, or you can use \u0394x = v<sub>i</sub> t + \u00bd a t\u00b2.</p>' +
    '<p>Turn on the <b>Area tool</b> to check your own displacement as your motion plays.</p>',
  ready: 'Stage 4 ready. Only the target velocity graph is shown. Use the given position, the slope and the area to find the parameters.'
}); }
if (window.VelGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
