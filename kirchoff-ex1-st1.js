(function(){
  'use strict';

  var thisq = window.ctThisq;
  var rootElId = 'ctRoot' + thisq;
  var stateKey = 'ctState_' + thisq;

  /* =========================================================
     PER-INSTANCE STATE
  ========================================================= */
  if (!window[stateKey]) {
    window[stateKey] = {
      a11y: { lm:false, nr:true, hc:false, fs:0 }, // fs: 0=normal, 1=large, 2=xl
      // circuit + selection set in init()
    };
  }
  var S = window[stateKey];

  /* =========================================================
     CIRCUIT MODEL (Example 1 — 4-branch ladder, multi-source)
     Branch A: nT --[E1]-- nA1 --[R1]-- nB
     Branch B: nT --[R2,R3 ‖]-- nB1 --[R4]-- nB
     Branch C: nT --[R5]-- nC1 --[R6]-- nB
     Branch D: nT --[E2]-- nD1 --[R7]-- nB
  ========================================================= */
  function makeInitialCircuit() {
    return {
      nextId: 100,
      // We track which "column" each component lives in for the renderer.
      // Column 0..3 = branches A..D. Components within a branch are stacked.
      components: [
        // Branch A (col 0)
        { id:'E1', kind:'battery',  value:9, a:'nT',  b:'nA1', label:'E\u2081', col:0, row:0 },
        { id:'R1', kind:'resistor', value:4, a:'nA1', b:'nB',  label:'R\u2081', col:0, row:1 },
        // Branch B (col 1) — R2 and R3 share row 0 (parallel pair)
        { id:'R2', kind:'resistor', value:6, a:'nT',  b:'nB1', label:'R\u2082', col:1, row:0, sub:0 },
        { id:'R3', kind:'resistor', value:3, a:'nT',  b:'nB1', label:'R\u2083', col:1, row:0, sub:1 },
        { id:'R4', kind:'resistor', value:2, a:'nB1', b:'nB',  label:'R\u2084', col:1, row:1 },
        // Branch C (col 2)
        { id:'R5', kind:'resistor', value:5, a:'nT',  b:'nC1', label:'R\u2085', col:2, row:0 },
        { id:'R6', kind:'resistor', value:10,a:'nC1', b:'nB',  label:'R\u2086', col:2, row:1 },
        // Branch D (col 3)
        { id:'E2', kind:'battery',  value:3, a:'nT',  b:'nD1', label:'E\u2082', col:3, row:0 },
        { id:'R7', kind:'resistor', value:1, a:'nD1', b:'nB',  label:'R\u2087', col:3, row:1 }
      ],
      mergeCount: 0
    };
  }

  /* =========================================================
     TOPOLOGY HELPERS
  ========================================================= */
  function nodeDegree(circ, node) {
    var d = 0;
    circ.components.forEach(function(c){
      if (c.a === node) d++;
      if (c.b === node) d++;
    });
    return d;
  }
  function getById(id) {
    for (var i=0; i<S.circuit.components.length; i++) {
      if (S.circuit.components[i].id === id) return S.circuit.components[i];
    }
    return null;
  }
  function checkSeries(c1, c2) {
    if (c1.kind !== 'resistor' || c2.kind !== 'resistor') {
      return { ok:false, reason:'Only two resistors can be combined. The battery stays in place.' };
    }
    var shared = null;
    if (c1.a === c2.a || c1.a === c2.b) shared = c1.a;
    if (c1.b === c2.a || c1.b === c2.b) shared = c1.b;
    if (!shared) return { ok:false, reason:'These two resistors do not share a node.' };
    var deg = nodeDegree(S.circuit, shared);
    if (deg !== 2) {
      return { ok:false, reason:'The shared node also connects to other components (degree ' + deg + '). For series, only the two chosen resistors should meet there.' };
    }
    return { ok:true, sharedNode: shared };
  }
  function checkParallel(c1, c2) {
    if (c1.kind !== 'resistor' || c2.kind !== 'resistor') {
      return { ok:false, reason:'Only two resistors can be combined. The battery stays in place.' };
    }
    var s1a = c1.a, s1b = c1.b;
    var same = ((s1a === c2.a && s1b === c2.b) || (s1a === c2.b && s1b === c2.a));
    if (!same) return { ok:false, reason:'These resistors don\u2019t share both endpoints, so they aren\u2019t in parallel.' };
    return { ok:true };
  }

  /* =========================================================
     MERGE OPERATIONS
  ========================================================= */
  function subscript(n) {
    var subs = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
    return String(n).split('').map(function(ch){return subs[+ch];}).join('');
  }
  function newReqLabel() {
    S.circuit.mergeCount++;
    return 'R\u2091' + subscript(S.circuit.mergeCount); // R subscript-e + N
  }
  function fmt(v) {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return v.toFixed(2).replace(/\.?0+$/,'');
  }
  function mergeSeries(c1, c2, sharedNode) {
    var newId = 'R' + (S.circuit.nextId++);
    var newVal = c1.value + c2.value;
    var n1 = c1.a === sharedNode ? c1.b : c1.a;
    var n2 = c2.a === sharedNode ? c2.b : c2.a;
    // The new component takes the "smaller" row of the two it replaces, in the same column.
    // Both inputs must be in the same column for series within a branch.
    var col = c1.col;
    var row = Math.min(c1.row, c2.row);
    S.circuit.components = S.circuit.components.filter(function(c){return c.id!==c1.id&&c.id!==c2.id;});
    S.circuit.components.push({
      id:newId, kind:'resistor', value:newVal, a:n1, b:n2,
      label:newReqLabel(), col:col, row:row
    });
    return { newId:newId, formula: c1.label + ' + ' + c2.label + ' = ' + c1.value + ' + ' + c2.value + ' = ' + fmt(newVal) + ' \u03a9' };
  }
  function mergeParallel(c1, c2) {
    var newId = 'R' + (S.circuit.nextId++);
    var newVal = (c1.value * c2.value) / (c1.value + c2.value);
    var col = c1.col;
    var row = c1.row;
    S.circuit.components = S.circuit.components.filter(function(c){return c.id!==c1.id&&c.id!==c2.id;});
    // Restore row collapse: any other component in the same column with row > original row stays put.
    S.circuit.components.push({
      id:newId, kind:'resistor', value:newVal, a:c1.a, b:c1.b,
      label:newReqLabel(), col:col, row:row
    });
    var formula = '(' + c1.label + ' \u00d7 ' + c2.label + ') / (' + c1.label + ' + ' + c2.label + ')'
                + ' = (' + c1.value + ' \u00d7 ' + c2.value + ') / (' + c1.value + ' + ' + c2.value + ')'
                + ' = ' + fmt(newVal) + ' \u03a9';
    return { newId:newId, formula:formula };
  }

  /* =========================================================
     SLOT-BASED LAYOUT
     - Determine all unique columns currently in use.
     - Determine max rows-per-column.
     - Each column gets an x position; each row a y range.
     - Top rail and bottom rail are simple horizontal lines.
  ========================================================= */
  function layout() {
    var L = { width: 540, height: 320, padX: 50, railTop: 50, railBot: 270 };
    var cols = {};
    S.circuit.components.forEach(function(c){
      if (cols[c.col] === undefined) cols[c.col] = [];
      cols[c.col].push(c);
    });
    var colKeys = Object.keys(cols).map(Number).sort(function(a,b){return a-b;});
    var nCols = colKeys.length;
    if (nCols === 0) return null;

    var usableW = L.width - 2 * L.padX;
    var colSpacing = nCols > 1 ? usableW / (nCols - 1) : 0;
    var pos = {}; // col -> x
    colKeys.forEach(function(col, i) {
      pos[col] = L.padX + (nCols === 1 ? usableW/2 : i * colSpacing);
    });

    return { L:L, cols:cols, colKeys:colKeys, x:pos };
  }

  function componentY(comp, layoutInfo) {
    // Each branch has 2 row slots. Row 0's top reaches the top rail;
    // row 1's bottom reaches the bottom rail. The middle endpoints
    // leave a small gap so we can draw the connecting wire and an
    // optional junction dot between them.
    var L = layoutInfo.L;
    var mid = (L.railTop + L.railBot) / 2;
    if (comp.row === 0) return { yTop: L.railTop, yBot: mid - 10 };
    return { yTop: mid + 10, yBot: L.railBot };
  }

  /* If a column has only one row (e.g. after series merge), the single
     component spans both row slots so the rails are still reached.
     Important: when the component spans the full height, its leads must
     reach the rails exactly — no padding gap. */
  function effectiveYRange(comp, layoutInfo) {
    var L = layoutInfo.L;
    var colComps = layoutInfo.cols[comp.col];
    var rows = {};
    colComps.forEach(function(c){ rows[c.row] = true; });
    if (Object.keys(rows).length === 1) {
      return { yTop: L.railTop, yBot: L.railBot };
    }
    return componentY(comp, layoutInfo);
  }

  /* =========================================================
     RENDER
  ========================================================= */
  function svgEl(tag, attrs, text) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }

  function render() {
    var svg = document.getElementById('ctSvg' + thisq);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    t.textContent = 'Circuit schematic';
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    d.textContent = describeCircuit();
    svg.appendChild(t); svg.appendChild(d);

    var info = layout();
    if (!info) return;
    var L = info.L;

    // Top rail
    svg.appendChild(svgEl('line', {
      x1: L.padX - 10, y1: L.railTop, x2: L.width - L.padX + 10, y2: L.railTop,
      'class': 'ctwire'
    }));
    // Bottom rail
    svg.appendChild(svgEl('line', {
      x1: L.padX - 10, y1: L.railBot, x2: L.width - L.padX + 10, y2: L.railBot,
      'class': 'ctwire'
    }));

    // Draw each column's components and short connecting wires
    info.colKeys.forEach(function(col){
      var x = info.x[col];
      var colComps = info.cols[col];
      // Sort by row so we can connect them
      colComps.sort(function(a,b){return a.row - b.row;});

      // For each component, determine y range
      colComps.forEach(function(c){
        var yr = effectiveYRange(c, info);
        // Detect if this column has a parallel pair (multiple comps with sub field)
        var siblings = colComps.filter(function(o){return o.row === c.row;});
        if (siblings.length > 1) {
          // Parallel offset: spread horizontally around x
          var idx = siblings.indexOf(c);
          var n = siblings.length;
          var spread = 36;
          var offset = (idx - (n-1)/2) * spread;
          drawComponent(svg, c, x + offset, yr.yTop, yr.yBot, x);
        } else {
          drawComponent(svg, c, x, yr.yTop, yr.yBot, x);
        }
      });

      // If column has 2 rows of single components, draw connecting wire between them
      var rows = {};
      colComps.forEach(function(c){ if (!rows[c.row]) rows[c.row] = []; rows[c.row].push(c); });
      var rowKeys = Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
      if (rowKeys.length === 2) {
        // Top row's bottom edge connects to bottom row's top edge
        var r0 = rows[0][0], r1 = rows[1][0];
        var y0r = effectiveYRange(r0, info);
        var y1r = effectiveYRange(r1, info);
        // Internal node sits between them
        var yInternal = (y0r.yBot + y1r.yTop) / 2;
        // Connect ends — but only for non-parallel rows
        if (rows[0].length === 1 && rows[1].length === 1) {
          svg.appendChild(svgEl('line', {
            x1:x, y1:y0r.yBot, x2:x, y2:y1r.yTop,
            'class':'ctwire'
          }));
          // Junction dot at the internal node if it's used by a parallel sub-pair... not in this case
        } else if (rows[0].length > 1 && rows[1].length === 1) {
          // Parallel pair on top, single on bottom: draw a small "fan-in" wire
          svg.appendChild(svgEl('line', {
            x1:x, y1:y0r.yBot, x2:x, y2:y1r.yTop,
            'class':'ctwire'
          }));
          // Junction dot
          svg.appendChild(svgEl('circle', {
            cx:x, cy:y0r.yBot, r:3.5, 'class':'ctnode'
          }));
        }
      }
    });
  }

  function drawComponent(svg, c, xCenter, yTop, yBot, xRail) {
    // All branch components are vertical (top to bottom).
    // For a parallel pair, xCenter is offset from xRail; we draw an angled lead from yTop to xRail and from yBot to xRail.
    if (c.kind === 'battery') {
      drawBattery(svg, c, xCenter, yTop, yBot, xRail);
    } else {
      drawResistor(svg, c, xCenter, yTop, yBot, xRail);
    }
  }

  function drawResistor(svg, c, xCenter, yTop, yBot, xRail) {
    var bodyW = 22, bodyH = 60;
    var bodyX = xCenter - bodyW/2;
    var bodyY = (yTop + yBot)/2 - bodyH/2;

    // leads (rail to body)
    if (xCenter !== xRail) {
      // angled lead at top from (xRail, yTop) to (xCenter, bodyY)
      svg.appendChild(svgEl('line', {x1:xRail, y1:yTop, x2:xCenter, y2:bodyY, 'class':'ctwire'}));
      svg.appendChild(svgEl('line', {x1:xCenter, y1:bodyY+bodyH, x2:xRail, y2:yBot, 'class':'ctwire'}));
    } else {
      svg.appendChild(svgEl('line', {x1:xCenter, y1:yTop, x2:xCenter, y2:bodyY, 'class':'ctwire'}));
      svg.appendChild(svgEl('line', {x1:xCenter, y1:bodyY+bodyH, x2:xCenter, y2:yBot, 'class':'ctwire'}));
    }

    var sel = S.selected.indexOf(c.id) >= 0;
    var rect = svgEl('rect', {
      x:bodyX, y:bodyY, width:bodyW, height:bodyH, rx:3, ry:3,
      'class': 'ctcomp' + (sel ? ' ctcompsel' : ''),
      'data-id': c.id, tabindex:0, role:'button',
      'aria-label': describeComponent(c) + (sel ? ', selected' : ''),
      'aria-pressed': sel ? 'true' : 'false'
    });
    attachHandlers(rect, c);
    svg.appendChild(rect);

    // Labels: to the right of the body
    var labelX = bodyX + bodyW + 8;
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 - 2, 'class':'ctlabel', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 + 14, 'class':'ctval', 'text-anchor':'start'}, fmt(c.value) + ' \u03a9'));
  }

  function drawBattery(svg, c, xCenter, yTop, yBot, xRail) {
    var midY = (yTop + yBot) / 2;
    var longLen = 30, shortLen = 16;

    // top lead from yTop to long plate (long plate is positive — it's the one connected to nT in our setup, so plate is at top)
    // c.a = top node (e.g. nT), c.b = bottom internal node. Positive terminal is c.a (top) since we wired E1: nT->nA1 with nT being positive.
    // Long plate at top, short at bottom.
    svg.appendChild(svgEl('line', {x1:xCenter, y1:yTop, x2:xCenter, y2:midY-3, 'class':'ctwire'}));
    svg.appendChild(svgEl('line', {x1:xCenter-longLen/2, y1:midY-3, x2:xCenter+longLen/2, y2:midY-3, 'class':'ctwire', 'stroke-width':2.5}));
    svg.appendChild(svgEl('line', {x1:xCenter-shortLen/2, y1:midY+5, x2:xCenter+shortLen/2, y2:midY+5, 'class':'ctwire', 'stroke-width':2.5}));
    svg.appendChild(svgEl('line', {x1:xCenter, y1:midY+5, x2:xCenter, y2:yBot, 'class':'ctwire'}));

    // Labels to the right
    var labelX = xCenter + longLen/2 + 8;
    svg.appendChild(svgEl('text', {x:labelX, y:midY-2, 'class':'ctlabel', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text', {x:labelX, y:midY+14, 'class':'ctval', 'text-anchor':'start'}, c.value + ' V'));

    // Battery is not selectable for merging, but we still expose it for screen readers as a non-interactive group
    // We'll add an invisible aria-only element for it.
    var srRect = svgEl('rect', {
      x:xCenter-longLen/2, y:midY-12, width:longLen, height:24, rx:2,
      fill:'transparent', stroke:'transparent',
      tabindex:-1,  // not in tab order
      'aria-hidden':'true'
    });
    svg.appendChild(srRect);
  }

  function attachHandlers(el, c) {
    el.addEventListener('click', function(){ toggleSelection(c.id); });
    el.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        toggleSelection(c.id);
      } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        focusNeighbor(c.id, +1);
      } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        focusNeighbor(c.id, -1);
      }
    });
  }

  function focusNeighbor(id, dir) {
    var resistors = S.circuit.components.filter(function(c){return c.kind==='resistor';});
    if (resistors.length === 0) return;
    var idx = -1;
    for (var i=0; i<resistors.length; i++) if (resistors[i].id === id) { idx = i; break; }
    var n = resistors.length;
    var newIdx = ((idx + dir) % n + n) % n;
    var nextId = resistors[newIdx].id;
    setTimeout(function(){
      var el = document.querySelector('[data-id="' + nextId + '"]');
      if (el) el.focus();
    }, 0);
  }

  function describeComponent(c) {
    if (c.kind === 'battery') return 'Battery ' + c.label + ', ' + c.value + ' volts';
    return 'Resistor ' + c.label + ', ' + fmt(c.value) + ' ohms';
  }
  function describeCircuit() {
    var R = S.circuit.components.filter(function(c){return c.kind==='resistor';});
    var B = S.circuit.components.filter(function(c){return c.kind==='battery';});
    return 'Circuit contains ' + B.length + ' batter' + (B.length===1?'y':'ies') + ' and ' + R.length + ' resistor' + (R.length===1?'':'s') + '.';
  }

  /* =========================================================
     SELECTION + UI
  ========================================================= */
  function toggleSelection(id) {
    var c = getById(id);
    if (!c) return;
    if (c.kind === 'battery') {
      announce('The battery cannot be combined. Select two resistors.');
      setFeedback('The battery cannot be combined with another component. Select two resistors.', 'bad');
      return;
    }
    var idx = S.selected.indexOf(id);
    if (idx >= 0) {
      S.selected.splice(idx, 1);
    } else {
      if (S.selected.length >= 2) S.selected.shift();
      S.selected.push(id);
    }
    refreshUI();
  }
  function refreshUI() {
    render();
    updateSelectedList();
    updateButtons();
    updateProgress();
  }
  function updateSelectedList() {
    var div = document.getElementById('ctSel' + thisq);
    if (S.selected.length === 0) {
      div.innerHTML = '<span class="ctempty' + '">Click two resistors\u2026</span>';
      return;
    }
    div.innerHTML = S.selected.map(function(id){
      var c = getById(id);
      return '<div class="ctseitem' + '">' + c.label + ' = ' + fmt(c.value) + ' \u03a9</div>';
    }).join('');
  }
  function updateButtons() {
    var canTry = S.selected.length === 2;
    document.getElementById('ctBtnSer' + thisq).disabled = !canTry;
    document.getElementById('ctBtnPar' + thisq).disabled = !canTry;
  }
  function updateProgress() {
    var nR = S.circuit.components.filter(function(c){return c.kind==='resistor';}).length;
    var note = document.getElementById('ctProg' + thisq);
    if (note) {
      if (nR > 1) note.textContent = nR + ' resistors remaining';
      else note.textContent = '1 resistor remaining';
    }
  }
  function setFeedback(msg, tone) {
    var fb = document.getElementById('ctFb' + thisq);
    fb.className = 'ctfb' + (tone === 'good' ? ' ctfbgood' : tone === 'bad' ? ' ctfbbad' : '');
    fb.innerHTML = msg;
  }
  function announce(msg) {
    var live = document.getElementById('ctLive' + thisq);
    var nar  = document.getElementById('ctNar' + thisq);
    if (live) {
      live.textContent = '';
      setTimeout(function(){ live.textContent = msg; }, 50);
    }
    if (nar && S.a11y.nr) nar.textContent = msg;
  }

  /* =========================================================
     STAGE 1 OPERATIONS
  ========================================================= */
  function trySeries() {
    if (S.selected.length !== 2) return;
    var c1 = getById(S.selected[0]), c2 = getById(S.selected[1]);
    var res = checkSeries(c1, c2);
    if (!res.ok) {
      setFeedback('<strong>Not in series.</strong> ' + res.reason, 'bad');
      announce('Incorrect. ' + res.reason);
      return;
    }
    var m = mergeSeries(c1, c2, res.sharedNode);
    setFeedback('<strong>Correct \u2014 these are in series.</strong><div class="ctformula' + '">R = ' + m.formula + '</div>', 'good');
    announce('Correct. Series combination of ' + c1.label + ' and ' + c2.label + '. ' + m.formula + '.');
    S.selected = [];
    refreshUI();
    checkComplete();
  }
  function tryParallel() {
    if (S.selected.length !== 2) return;
    var c1 = getById(S.selected[0]), c2 = getById(S.selected[1]);
    var res = checkParallel(c1, c2);
    if (!res.ok) {
      setFeedback('<strong>Not in parallel.</strong> ' + res.reason, 'bad');
      announce('Incorrect. ' + res.reason);
      return;
    }
    var m = mergeParallel(c1, c2);
    setFeedback('<strong>Correct \u2014 these are in parallel.</strong><div class="ctformula' + '">R = ' + m.formula + '</div>', 'good');
    announce('Correct. Parallel combination of ' + c1.label + ' and ' + c2.label + '. Result is ' + fmt((c1.value*c2.value)/(c1.value+c2.value)) + ' ohms.');
    S.selected = [];
    refreshUI();
    checkComplete();
  }
  function clearSelection() {
    S.selected = [];
    setFeedback('Selection cleared. Click two resistors.');
    refreshUI();
  }
  function resetCircuit() {
    S.circuit = makeInitialCircuit();
    S.selected = [];
    document.getElementById('ctComp' + thisq).classList.remove('ctshow');
    setFeedback('Circuit reset. Select two resistors to begin.');
    refreshUI();
  }

  function checkComplete() {
    // Stage 1 is "complete" when no more series or parallel reductions are possible
    // among the resistors. (Battery + resistor combinations don't count.)
    var R = S.circuit.components.filter(function(c){return c.kind==='resistor';});
    var canStillReduce = false;
    for (var i=0; i<R.length && !canStillReduce; i++) {
      for (var j=i+1; j<R.length; j++) {
        if (checkSeries(R[i], R[j]).ok || checkParallel(R[i], R[j]).ok) {
          canStillReduce = true; break;
        }
      }
    }
    if (!canStillReduce) {
      var banner = document.getElementById('ctComp' + thisq);
      banner.classList.add('ctshow');
      var msg = 'Stage 1 complete. ' + R.length + ' resistor' + (R.length===1?'':'s') + ' remain' + (R.length===1?'s':'') + ' along with the battery branches.';
      // Build the banner with a Continue button
      banner.innerHTML = ''
        + '<div class="ctcompmsg' + '">\u2713 ' + msg + '</div>'
        + '<button type="button" class="ctbtn' + ' ctbtnnext' + '" id="ctBtnNext' + thisq + '">'
        + 'Continue to Stage 2 \u2192</button>';
      var nextBtn = document.getElementById('ctBtnNext' + thisq);
      if (nextBtn) {
        nextBtn.addEventListener('click', function(){
          // Emit a custom event so the surrounding tutorial can advance.
          // Also support an inline hook: window.ctOnStageComplete_<thisq>(stage)
          var ev = new CustomEvent('ctStageComplete', { detail: { stage: 1, thisq: thisq } });
          document.dispatchEvent(ev);
          var hook = window['ctOnStageComplete_' + thisq];
          if (typeof hook === 'function') hook(1);
          announce('Advancing to Stage 2: identifying branches and loops.');
        });
      }
      announce(msg + ' Press Continue to advance to Stage 2.');
    }
  }

  /* =========================================================
     ACCESSIBILITY TOOLBAR
  ========================================================= */
  function applyA11y() {
    var root = document.getElementById(rootElId).querySelector('.ctroot');
    if (!root) return;
    root.classList.toggle('ctlm', S.a11y.lm);
    root.classList.toggle('cthc', S.a11y.hc);

    var fontSizes = ['14px','16px','19px'];
    root.style.setProperty('--ctfs', fontSizes[S.a11y.fs]);

    // Update button visual states
    setBtn('ctBtnLM', S.a11y.lm, 'LIGHT MODE');
    setBtn('ctBtnNR', S.a11y.nr, 'NARRATION', true);
    setBtn('ctBtnHC', S.a11y.hc, 'HIGH CONTRAST');
    setBtn('ctBtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);

    // Show/hide narration bar
    var nar = document.getElementById('ctNar' + thisq);
    if (nar) nar.classList.toggle('ctnarshow', S.a11y.nr);
  }
  function setBtn(idBase, on, label, withSuffix) {
    var b = document.getElementById(idBase + thisq);
    if (!b) return;
    b.classList.toggle('cta11yon', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (withSuffix) {
      b.textContent = label + ': ' + (on ? 'ON' : 'OFF');
    } else {
      b.textContent = label;
    }
  }
  function toggleA11y(key) {
    if (key === 'fs') S.a11y.fs = (S.a11y.fs + 1) % 3;
    else S.a11y[key] = !S.a11y[key];
    applyA11y();
    // Re-render so SVG picks up font size if needed (it doesn't change much, but being safe)
    render();
  }

  /* =========================================================
     INITIAL DOM
  ========================================================= */
  function buildDOM() {
    var root = document.getElementById(rootElId);
    var html = ''
      + '<div class="ctroot' + '" role="region" aria-label="Circuit simplification tutorial">'
      + '  <div class="cta11y' + '" role="toolbar" aria-label="Display options">'
      + '    <button type="button" class="cta11ybtn' + '" id="ctBtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
      + '    <button type="button" class="cta11ybtn' + ' cta11yon' + '" id="ctBtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
      + '    <button type="button" class="cta11ybtn' + '" id="ctBtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
      + '    <button type="button" class="cta11ybtn' + '" id="ctBtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
      + '  </div>'
      + '  <div id="ctNar' + thisq + '" class="ctnarbar' + ' ctnarshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '  <h3 class="cttitle' + '">Kirchhoff\u2019s Rules \u2014 Stage 1: Simplification</h3>'
      + '  <div class="ctsubtitle' + '">Combine pairs of resistors that are in series or in parallel until no more reductions are possible.</div>'
      + '  <div class="ctstagebar' + '" role="navigation" aria-label="Tutorial stages">'
      + '    <span class="ctpill' + ' ctpillactive' + '">1. Simplify</span>'
      + '    <span class="ctpill' + '">2. Branches \u0026 Loops</span>'
      + '    <span class="ctpill' + '">3. Currents</span>'
      + '    <span class="ctpill' + '">4. Polarities</span>'
      + '    <span class="ctpill' + '">5. Equations</span>'
      + '  </div>'
      + '  <div class="ctlayout' + '">'
      + '    <div class="ctcanvasWrap' + thisq + '">'
      + '      <div class="cthint' + '">Click two resistors, then choose Series or Parallel. Use Tab to focus a resistor, Enter or Space to select, and arrow keys to move between resistors.</div>'
      + '      <svg class="ctsvg' + '" id="ctSvg' + thisq + '" viewBox="0 0 540 320" role="img" aria-label="Circuit schematic"></svg>'
      + '      <div class="ctcomplete' + '" id="ctComp' + thisq + '" role="status"></div>'
      + '    </div>'
      + '    <aside class="ctside' + '" aria-label="Simplification controls">'
      + '      <div>'
      + '        <h2 class="ctsideh' + '">Selected</h2>'
      + '        <div class="ctselist' + '" id="ctSel' + thisq + '" aria-live="polite"></div>'
      + '      </div>'
      + '      <div>'
      + '        <h2 class="ctsideh' + '">Operation</h2>'
      + '        <div class="ctbtnrow' + '">'
      + '          <button type="button" class="ctbtn' + '" id="ctBtnSer' + thisq + '" disabled>Series</button>'
      + '          <button type="button" class="ctbtn' + '" id="ctBtnPar' + thisq + '" disabled>Parallel</button>'
      + '        </div>'
      + '      </div>'
      + '      <div>'
      + '        <h2 class="ctsideh' + '">Feedback</h2>'
      + '        <div class="ctfb' + '" id="ctFb' + thisq + '">Select two resistors to begin.</div>'
      + '      </div>'
      + '      <div class="ctbtnrow' + '">'
      + '        <button type="button" class="ctbtn' + ' ctbtndanger' + '" id="ctBtnClr' + thisq + '">Clear</button>'
      + '        <button type="button" class="ctbtn' + '" id="ctBtnRst' + thisq + '">Reset Circuit</button>'
      + '      </div>'
      + '      <div class="ctprogress' + '" id="ctProg' + thisq + '"></div>'
      + '    </aside>'
      + '  </div>'
      + '  <span class="ctsr' + '" id="ctLive' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
      + '</div>';
    root.innerHTML = html;

    // Wire up handlers
    document.getElementById('ctBtnSer' + thisq).addEventListener('click', trySeries);
    document.getElementById('ctBtnPar' + thisq).addEventListener('click', tryParallel);
    document.getElementById('ctBtnClr' + thisq).addEventListener('click', clearSelection);
    document.getElementById('ctBtnRst' + thisq).addEventListener('click', resetCircuit);
    document.getElementById('ctBtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
    document.getElementById('ctBtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
    document.getElementById('ctBtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
    document.getElementById('ctBtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
  }

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    if (!S.circuit) S.circuit = makeInitialCircuit();
    if (!S.selected) S.selected = [];
    buildDOM();
    applyA11y();
    refreshUI();
    announce('Stage 1 ready. Click two resistors to combine them in series or parallel.');
  }

  // Wait for DOM if we're loaded too early
  if (document.getElementById(rootElId)) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
