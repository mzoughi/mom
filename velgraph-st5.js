/* velgraph-st5.js \u2014 Stage 5: Three-phase velocity graph. Requires velgraph-core.js */
(function(){ 'use strict';
function go(){ window.VelGraph.mount({
  stage: 5, mode: 'match', title: 'A three-phase velocity graph', showTargetDiagram: false, targetFull: true, xSlider: false,
  targets: [
    { label: 'Target 1', x0: -30, times: [0, 4, 6], given: 'start', phases: [
      { v: 0, a: 2.5 }, { v: 10, a: 0 }, { v: 10, a: -2.5 } ] },
    { label: 'Target 2', x0: 40, times: [0, 3, 7], given: 'start', phases: [
      { v: -5, a: 0 }, { v: -5, a: 2.5 }, { v: 5, a: -5 } ] }
  ],
  intro:
    '<p>The target motion now has three phases, separated by the dashed lines on the graph. Each phase has its own constant acceleration. The starting position is given, and the position carries over from one phase to the next automatically. For each phase, set the velocity v<sub>i</sub> at the <em>start of that phase</em> and the acceleration a during it. Press <b>Play</b> to try your values, then <b>Check match</b>.</p>',
  text:
    '<h4>Working phase by phase</h4>' +
    '<p>For each phase, read the height of the graph at the start of the phase (v<sub>i</sub>) and its slope (a). A horizontal piece means a = 0.</p>' +
    '<p><strong class="vgkeyword">Each phase starts at the velocity the previous phase ends with</strong>, because velocity cannot change instantly. If your values break this rule, your velocity graph will show a jump.</p>' +
    '<p>Watch your motion diagram too. In target 2 the graph crosses the t axis twice; check that your object turns around at those times. Turn on the <b>Area tool</b> to see how the displacement builds up phase by phase.</p>',
  ready: 'Stage 5 ready. The target velocity graph has three phases. Set the sliders for each phase and press Play.'
}); }
if (window.VelGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
