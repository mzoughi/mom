/* posgraph-st5.js \u2014 Stage 5: Three-phase graph. Requires posgraph-core.js */
(function(){ 'use strict';
function go(){ window.PosGraph.mount({
  stage: 5, mode: 'match', title: 'A three-phase position graph', showTargetDiagram: false, targetFull: true,
  targets: [
    { label: 'Target 1', times: [0, 4, 6], phases: [
      { x: -30, v: 0, a: 2.5 }, { x: -10, v: 10, a: 0 }, { x: 10, v: 10, a: -2.5 } ] },
    { label: 'Target 2', times: [0, 3, 7], phases: [
      { x: 40, v: 0, a: 0 }, { x: 40, v: 0, a: -2.5 }, { x: 20, v: -10, a: 0 } ] }
  ],
  intro:
    '<p>The target motion now has three phases, separated by the dashed lines on the graph. Each phase has its own constant acceleration. For each phase, set the position x<sub>i</sub> and velocity v<sub>i</sub> at the <em>start of that phase</em>, and the acceleration a during it. Press <b>Play</b> to try your values, then <b>Check match</b>.</p>',
  text:
    '<h4>Working phase by phase</h4>' +
    '<p>Read each phase separately. Is that piece of the graph straight or curved? Rising or falling? Getting steeper or flatter?</p>' +
    '<p><strong class="pgkeyword">Each phase starts where the previous one ends.</strong> The position at the start of phase 2 is the position at the end of phase 1, and because the velocity changes smoothly, the starting velocity of phase 2 is the final velocity of phase 1 (v = v<sub>i</sub> + a \u0394t). The graph positions at the phase boundaries fall on gridlines to help you.</p>' +
    '<p>If your values are inconsistent, your graph will show a jump (a change in position with no time passing, which is impossible) or a sharp corner (a sudden change in velocity).</p>',
  ready: 'Stage 5 ready. The target graph has three phases. Set the sliders for each phase and press Play.'
}); }
if (window.PosGraph) go(); else document.addEventListener('DOMContentLoaded', go);
})();
