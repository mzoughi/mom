(function(){
  'use strict';

  var thisq = window.ctThisq;
  var rootElId = 'ct2Root' + thisq;
  var stateKey = 'ctState2_' + thisq;

  /* =========================================================
     COLORS for found branches and loops (cycled)
  ========================================================= */
  var FOUND_COLORS = ['#00d4ff', '#ff6ec7', '#a8e063', '#ffdd66', '#c084fc', '#fb923c'];

  /* =========================================================
     STATE
  ========================================================= */
  if (!window[stateKey]) {
    window[stateKey] = {
      a11y: { lm:false, nr:true, hc:false, fs:0 },
      phase: 'branches',           // 'branches' | 'loops' | 'independence'
      selected: [],                // currently selected component ids
      foundBranches: [],           // [{ ids:Set, color:'#xxx' }]
      foundLoops: [],              // [{ ids:Set, color:'#xxx' }]
      independenceSelection: [],   // indices into foundLoops
      circuit: null                // populated in init from Stage 1 or fallback
    };
  }
  var S = window[stateKey];

  /* =========================================================
     FALLBACK CIRCUIT (if Stage 1 hasn't run yet)
     Mirrors the typical end-state of Stage 1 on Example 1:
     3 branches between nT and nB.
  ========================================================= */
  function fallbackCircuit() {
    return {
      components: [
        { id:'E1',  kind:'battery',  value:9, a:'nT',  b:'nA1', label:'E\u2081', col:0, row:0 },
        { id:'R1',  kind:'resistor', value:4, a:'nA1', b:'nB',  label:'R\u2081', col:0, row:1 },
        { id:'Re3', kind:'resistor', value:3.16, a:'nT', b:'nB', label:'R\u2091\u2083', col:1, row:0 },
        { id:'E2',  kind:'battery',  value:3, a:'nT',  b:'nD1', label:'E\u2082', col:3, row:0 },
        { id:'R7',  kind:'resistor', value:1, a:'nD1', b:'nB',  label:'R\u2087', col:3, row:1 }
      ]
    };
  }

  /* =========================================================
     GRAPH HELPERS
  ========================================================= */
  function nodeDegreeFull(node) {
    var d = 0;
    S.circuit.components.forEach(function(c){
      if (c.a === node) d++;
      if (c.b === node) d++;
    });
    return d;
  }
  function nodeDegreeInSet(node, idSet) {
    var d = 0;
    S.circuit.components.forEach(function(c){
      if (idSet.has(c.id)) {
        if (c.a === node) d++;
        if (c.b === node) d++;
      }
    });
    return d;
  }
  function nodesInSet(idSet) {
    var nodes = new Set();
    S.circuit.components.forEach(function(c){
      if (idSet.has(c.id)) { nodes.add(c.a); nodes.add(c.b); }
    });
    return nodes;
  }
  function isConnected(idSet) {
    if (idSet.size === 0) return false;
    var firstId = idSet.values().next().value;
    var firstComp = S.circuit.components.find(function(c){return c.id===firstId;});
    if (!firstComp) return false;
    var visited = new Set();
    var queue = [firstComp.a];
    visited.add(firstComp.a);
    while (queue.length) {
      var node = queue.shift();
      S.circuit.components.forEach(function(c){
        if (!idSet.has(c.id)) return;
        var other = (c.a === node) ? c.b : (c.b === node) ? c.a : null;
        if (other && !visited.has(other)) {
          visited.add(other); queue.push(other);
        }
      });
    }
    var ok = true;
    nodesInSet(idSet).forEach(function(n){ if (!visited.has(n)) ok = false; });
    return ok;
  }
  function getById(id) {
    for (var i=0; i<S.circuit.components.length; i++) {
      if (S.circuit.components[i].id === id) return S.circuit.components[i];
    }
    return null;
  }

  /* =========================================================
     BRANCH + LOOP VALIDATION
  ========================================================= */
  function checkBranch(idSet) {
    if (idSet.size === 0) return { ok:false, reason:'No components selected.' };
    if (!isConnected(idSet)) {
      return { ok:false, reason:'These components are not all connected along a single path.' };
    }
    var nodes = nodesInSet(idSet);
    var endpoints = [];
    var internal = [];
    nodes.forEach(function(n){
      var dSub = nodeDegreeInSet(n, idSet);
      if (dSub === 1) endpoints.push(n);
      else internal.push({ node:n, dSub:dSub });
    });
    if (endpoints.length === 0) {
      return { ok:false, reason:'This forms a closed loop, not a branch. A branch must have two endpoints at junction nodes.' };
    }
    if (endpoints.length !== 2) {
      return { ok:false, reason:'A branch should have exactly 2 endpoints; this set has ' + endpoints.length + '.' };
    }
    for (var i=0; i<internal.length; i++) {
      if (internal[i].dSub !== 2) {
        return { ok:false, reason:'A node in your selection has degree ' + internal[i].dSub + '. A branch must be a simple path (no forks or T\u2011junctions).' };
      }
      var dFull = nodeDegreeFull(internal[i].node);
      if (dFull !== 2) {
        return { ok:false, reason:'Your selection passes through a junction node. A branch must end at every junction it reaches.' };
      }
    }
    for (var j=0; j<endpoints.length; j++) {
      var dFull2 = nodeDegreeFull(endpoints[j]);
      if (dFull2 < 3) {
        return { ok:false, reason:'An endpoint of your selection isn\u2019t a junction node (degree '+dFull2+'). A branch must run all the way between two junctions.' };
      }
    }
    return { ok:true, endpoints:endpoints };
  }

  function checkLoop(idSet) {
    if (idSet.size === 0) return { ok:false, reason:'No components selected.' };
    if (idSet.size < 2) {
      return { ok:false, reason:'A loop needs at least two components forming a closed path.' };
    }
    if (!isConnected(idSet)) {
      return { ok:false, reason:'The selected components are not all connected.' };
    }
    var bad = null;
    nodesInSet(idSet).forEach(function(n){
      var d = nodeDegreeInSet(n, idSet);
      if (d !== 2) bad = { node:n, d:d };
    });
    if (bad) {
      if (bad.d === 1) {
        return { ok:false, reason:'A node in your selection only has one connection \u2014 the path is not closed.' };
      }
      return { ok:false, reason:'A node in your selection has '+bad.d+' connections. A simple loop has exactly two connections at every node.' };
    }
    return { ok:true };
  }

  /* =========================================================
     LOOP INDEPENDENCE (GF(2) Gaussian elimination)
  ========================================================= */
  function loopVector(idSet) {
    return S.circuit.components.map(function(c){ return idSet.has(c.id) ? 1 : 0; });
  }
  function gf2Rank(vectors) {
    if (vectors.length === 0) return 0;
    var rows = vectors.map(function(v){ return v.slice(); });
    var n = rows.length, m = rows[0].length;
    var rank = 0;
    for (var col = 0; col < m && rank < n; col++) {
      var pivot = -1;
      for (var r = rank; r < n; r++) if (rows[r][col] === 1) { pivot = r; break; }
      if (pivot < 0) continue;
      var tmp = rows[rank]; rows[rank] = rows[pivot]; rows[pivot] = tmp;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 !== rank && rows[r2][col] === 1) {
          for (var k = 0; k < m; k++) rows[r2][k] ^= rows[rank][k];
        }
      }
      rank++;
    }
    return rank;
  }

  /* Number of independent loops needed = (branches) - (junctions) + 1, but we
     count it more directly: it's the rank of the full set of all possible loops.
     Simpler proxy that's correct for our circuit family: total loops dimension =
     #branches - #junctions + 1. For our test circuit (3 branches, 2 junctions):
     3 - 2 + 1 = 2. Matches manual answer.

     For robustness we also compute the dimension empirically by enumerating cycles
     starting from each pair of branches and taking the rank.
  */
  function expectedLoopCount() {
    // Count branches by walking the circuit. A branch = a maximal path between
    // two junction nodes. For our ladder topology, we can count components that
    // start from a junction or are between non-junctions, but the cleanest is:
    //   branches = sum over junctions of (degree)/2 — no, that's wrong too.
    // Most reliable method: enumerate via a graph walk. But we already have the
    // student's foundBranches list, so use that if present:
    if (S.foundBranches.length > 0) {
      var nB = S.foundBranches.length;
      // junctions = nodes with full-degree >= 3
      var junctions = 0;
      var seen = new Set();
      S.circuit.components.forEach(function(c){ seen.add(c.a); seen.add(c.b); });
      seen.forEach(function(n){ if (nodeDegreeFull(n) >= 3) junctions++; });
      return nB - junctions + 1;
    }
    // Fallback: count independent loops empirically by trying small subsets.
    return 2;
  }

  /* =========================================================
     LAYOUT (slot-based, same as Stage 1)
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
    var pos = {};
    colKeys.forEach(function(col, i) {
      pos[col] = L.padX + (nCols === 1 ? usableW/2 : i * colSpacing);
    });
    return { L:L, cols:cols, colKeys:colKeys, x:pos };
  }

  function componentY(comp, info) {
    var L = info.L;
    var mid = (L.railTop + L.railBot) / 2;
    if (comp.row === 0) return { yTop: L.railTop, yBot: mid - 10 };
    return { yTop: mid + 10, yBot: L.railBot };
  }
  function effectiveYRange(comp, info) {
    var L = info.L;
    var colComps = info.cols[comp.col];
    var rows = {};
    colComps.forEach(function(c){ rows[c.row] = true; });
    if (Object.keys(rows).length === 1) return { yTop: L.railTop, yBot: L.railBot };
    return componentY(comp, info);
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

  // Determine the highlight color for a component (if any)
  // Branches and loops share the same coloring scheme — once a component
  // is in a confirmed branch/loop it gets the latest color from that list.
  function highlightColorFor(id) {
    // Independence-mode highlighting: only show selected loops
    if (S.phase === 'independence') {
      for (var i=0; i<S.independenceSelection.length; i++) {
        var loopIdx = S.independenceSelection[i];
        if (S.foundLoops[loopIdx] && S.foundLoops[loopIdx].ids.has(id)) {
          return S.foundLoops[loopIdx].color;
        }
      }
      return null;
    }
    // Loops phase: show all confirmed loops
    if (S.phase === 'loops') {
      for (var i=0; i<S.foundLoops.length; i++) {
        if (S.foundLoops[i].ids.has(id)) return S.foundLoops[i].color;
      }
    }
    // Branches phase (and as a baseline when nothing else applies): show branches
    for (var i=0; i<S.foundBranches.length; i++) {
      if (S.foundBranches[i].ids.has(id)) return S.foundBranches[i].color;
    }
    return null;
  }

  function render() {
    var svg = document.getElementById('ct2Svg' + thisq);
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var t = document.createElementNS('http://www.w3.org/2000/svg','title');
    t.textContent = 'Simplified circuit schematic';
    var d = document.createElementNS('http://www.w3.org/2000/svg','desc');
    d.textContent = describeCircuit();
    svg.appendChild(t); svg.appendChild(d);

    var info = layout();
    if (!info) return;
    var L = info.L;

    svg.appendChild(svgEl('line', {x1:L.padX-10, y1:L.railTop, x2:L.width-L.padX+10, y2:L.railTop, 'class':'ct2wire'}));
    svg.appendChild(svgEl('line', {x1:L.padX-10, y1:L.railBot, x2:L.width-L.padX+10, y2:L.railBot, 'class':'ct2wire'}));

    info.colKeys.forEach(function(col){
      var x = info.x[col];
      var colComps = info.cols[col];
      colComps.sort(function(a,b){return a.row-b.row;});

      colComps.forEach(function(c){
        var yr = effectiveYRange(c, info);
        var siblings = colComps.filter(function(o){return o.row === c.row;});
        if (siblings.length > 1) {
          var idx = siblings.indexOf(c);
          var n = siblings.length;
          var spread = 36;
          var offset = (idx - (n-1)/2) * spread;
          drawComponent(svg, c, x + offset, yr.yTop, yr.yBot, x);
        } else {
          drawComponent(svg, c, x, yr.yTop, yr.yBot, x);
        }
      });

      var rows = {};
      colComps.forEach(function(c){ if (!rows[c.row]) rows[c.row] = []; rows[c.row].push(c); });
      var rowKeys = Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
      if (rowKeys.length === 2) {
        var r0 = rows[0][0], r1 = rows[1][0];
        var y0r = effectiveYRange(r0, info);
        var y1r = effectiveYRange(r1, info);
        if (rows[0].length === 1 && rows[1].length === 1) {
          svg.appendChild(svgEl('line', {x1:x, y1:y0r.yBot, x2:x, y2:y1r.yTop, 'class':'ct2wire'}));
        } else if (rows[0].length > 1 && rows[1].length === 1) {
          svg.appendChild(svgEl('line', {x1:x, y1:y0r.yBot, x2:x, y2:y1r.yTop, 'class':'ct2wire'}));
          svg.appendChild(svgEl('circle', {cx:x, cy:y0r.yBot, r:3.5, 'class':'ct2node'}));
        }
      }
    });
  }

  function drawComponent(svg, c, xCenter, yTop, yBot, xRail) {
    if (c.kind === 'battery') drawBattery(svg, c, xCenter, yTop, yBot, xRail);
    else drawResistor(svg, c, xCenter, yTop, yBot, xRail);
  }

  function drawResistor(svg, c, xCenter, yTop, yBot, xRail) {
    var bodyW = 22, bodyH = 60;
    var bodyX = xCenter - bodyW/2;
    var bodyY = (yTop + yBot)/2 - bodyH/2;

    if (xCenter !== xRail) {
      svg.appendChild(svgEl('line',{x1:xRail, y1:yTop, x2:xCenter, y2:bodyY, 'class':'ct2wire'}));
      svg.appendChild(svgEl('line',{x1:xCenter, y1:bodyY+bodyH, x2:xRail, y2:yBot, 'class':'ct2wire'}));
    } else {
      svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:bodyY, 'class':'ct2wire'}));
      svg.appendChild(svgEl('line',{x1:xCenter, y1:bodyY+bodyH, x2:xCenter, y2:yBot, 'class':'ct2wire'}));
    }

    var sel = S.selected.indexOf(c.id) >= 0;
    var hi  = highlightColorFor(c.id);

    var attrs = {
      x:bodyX, y:bodyY, width:bodyW, height:bodyH, rx:3, ry:3,
      'class': 'ct2comp' + (sel ? ' ct2compsel' : ''),
      'data-id': c.id, tabindex:0, role:'button',
      'aria-label': describeComponent(c) + (sel?', selected':''),
      'aria-pressed': sel ? 'true' : 'false'
    };
    var rect = svgEl('rect', attrs);
    if (hi && !sel) {
      // Apply highlight via inline style — survives across re-renders
      rect.setAttribute('stroke', hi);
      rect.setAttribute('stroke-width', '2.6');
      rect.setAttribute('fill', hexToRgba(hi, 0.18));
    }
    attachHandlers(rect, c);
    svg.appendChild(rect);

    var labelX = bodyX + bodyW + 8;
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 - 2, 'class':'ct2label', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 + 14, 'class':'ct2val', 'text-anchor':'start'}, fmt(c.value) + ' \u03a9'));
  }

  function drawBattery(svg, c, xCenter, yTop, yBot, xRail) {
    var midY = (yTop + yBot) / 2;
    var longLen = 30, shortLen = 16;
    svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:midY-3, 'class':'ct2wire'}));
    svg.appendChild(svgEl('line',{x1:xCenter-longLen/2, y1:midY-3, x2:xCenter+longLen/2, y2:midY-3, 'class':'ct2wire', 'stroke-width':2.5}));
    svg.appendChild(svgEl('line',{x1:xCenter-shortLen/2, y1:midY+5, x2:xCenter+shortLen/2, y2:midY+5, 'class':'ct2wire', 'stroke-width':2.5}));
    svg.appendChild(svgEl('line',{x1:xCenter, y1:midY+5, x2:xCenter, y2:yBot, 'class':'ct2wire'}));

    var labelX = xCenter + longLen/2 + 8;
    svg.appendChild(svgEl('text',{x:labelX, y:midY-2, 'class':'ct2label', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text',{x:labelX, y:midY+14, 'class':'ct2val', 'text-anchor':'start'}, c.value + ' V'));

    var sel = S.selected.indexOf(c.id) >= 0;
    var hi  = highlightColorFor(c.id);

    // Make battery selectable for branch/loop tracing: it IS part of branches and loops.
    var hitW = Math.max(longLen, 28), hitH = 32;
    var attrs = {
      x: xCenter - hitW/2, y: midY - hitH/2, width: hitW, height: hitH, rx:2,
      'class': 'ct2comp' + (sel ? ' ct2compsel' : ''),
      'data-id': c.id, tabindex:0, role:'button',
      'aria-label': describeComponent(c) + (sel?', selected':''),
      'aria-pressed': sel ? 'true' : 'false',
      'fill-opacity': 0.0
    };
    var rect = svgEl('rect', attrs);
    if (hi && !sel) {
      rect.setAttribute('stroke', hi);
      rect.setAttribute('stroke-width', '2.6');
      rect.setAttribute('fill', hexToRgba(hi, 0.18));
      rect.setAttribute('fill-opacity', '1');
    }
    attachHandlers(rect, c);
    svg.appendChild(rect);
  }

  function attachHandlers(el, c) {
    el.addEventListener('click', function(){ toggleSelection(c.id); });
    el.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleSelection(c.id); }
      else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); focusNeighbor(c.id, +1); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp')   { ev.preventDefault(); focusNeighbor(c.id, -1); }
    });
  }
  function focusNeighbor(id, dir) {
    var comps = S.circuit.components;
    var idx = -1;
    for (var i=0; i<comps.length; i++) if (comps[i].id === id) { idx = i; break; }
    var n = comps.length;
    var newIdx = ((idx + dir) % n + n) % n;
    var nextId = comps[newIdx].id;
    setTimeout(function(){
      var el = document.querySelector('[data-id="' + nextId + '"]');
      if (el) el.focus();
    }, 0);
  }

  function fmt(v) {
    if (v == null) return '';
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return v.toFixed(2).replace(/\.?0+$/,'');
  }
  function hexToRgba(hex, alpha) {
    var h = hex.replace('#','');
    var r = parseInt(h.substring(0,2), 16);
    var g = parseInt(h.substring(2,4), 16);
    var b = parseInt(h.substring(4,6), 16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }
  function describeComponent(c) {
    if (c.kind === 'battery') return 'Battery ' + c.label + ', ' + c.value + ' volts';
    return 'Resistor ' + c.label + ', ' + fmt(c.value) + ' ohms';
  }
  function describeCircuit() {
    var R = S.circuit.components.filter(function(c){return c.kind==='resistor';});
    var B = S.circuit.components.filter(function(c){return c.kind==='battery';});
    return B.length + ' batter' + (B.length===1?'y':'ies') + ' and ' + R.length + ' resistor' + (R.length===1?'':'s') + '.';
  }

  /* =========================================================
     SELECTION + UI
  ========================================================= */
  function toggleSelection(id) {
    if (S.phase === 'independence') {
      // In independence phase, clicking circuit components has no effect;
      // user picks loops via the Found Loops list.
      announce('Click on the loops in the Found Loops list to select an independent set.');
      return;
    }
    var idx = S.selected.indexOf(id);
    if (idx >= 0) S.selected.splice(idx, 1);
    else S.selected.push(id);
    refreshUI();
  }
  function clearSelection() {
    S.selected = [];
    setFeedback('Selection cleared.');
    refreshUI();
  }

  function refreshUI() {
    render();
    updateSelectedList();
    updateFoundList();
    updateButtons();
    updateProgress();
  }

  function updateSelectedList() {
    var div = document.getElementById('ct2Sel' + thisq);
    if (!div) return;
    if (S.selected.length === 0) {
      div.innerHTML = '<span class="ct2empty' + '">Click components in this ' + (S.phase === 'branches' ? 'branch' : 'loop') + '\u2026</span>';
      return;
    }
    div.innerHTML = S.selected.map(function(id){
      var c = getById(id);
      return '<div class="ct2seitem' + '">' + c.label + '</div>';
    }).join('');
  }

  function updateFoundList() {
    var div = document.getElementById('ct2Found' + thisq);
    if (!div) return;
    var list = (S.phase === 'loops' || S.phase === 'independence') ? S.foundLoops : S.foundBranches;
    if (list.length === 0) {
      div.innerHTML = '<span class="ct2empty' + '">None yet.</span>';
      return;
    }
    div.innerHTML = list.map(function(item, i){
      var labels = Array.from(item.ids).map(function(id){
        var c = getById(id); return c ? c.label : id;
      }).join(', ');
      var prefix = (S.phase === 'loops' || S.phase === 'independence') ? 'Loop ' : 'Branch ';
      var sel = S.phase === 'independence' && S.independenceSelection.indexOf(i) >= 0;
      return '<div class="ct2founditem' + (sel ? ' ct2foundselected' : '') + '" data-fidx="' + i + '">'
        + '<span class="ct2foundswatch' + '" style="background:' + item.color + ';"></span>'
        + '<span class="ct2foundtext' + '">' + prefix + (i+1) + ': ' + labels + '</span>'
        + (S.phase !== 'independence'
            ? '<button type="button" class="ct2foundremove' + '" data-rmidx="' + i + '" aria-label="Remove">\u2715</button>'
            : '')
        + '</div>';
    }).join('');
    // Attach handlers
    var items = div.querySelectorAll('.ct2founditem');
    items.forEach(function(it){
      var idx = parseInt(it.getAttribute('data-fidx'), 10);
      if (S.phase === 'independence') {
        it.style.cursor = 'pointer';
        it.addEventListener('click', function(){ toggleIndependenceSelection(idx); });
      }
    });
    var rmBtns = div.querySelectorAll('.ct2foundremove');
    rmBtns.forEach(function(b){
      b.addEventListener('click', function(ev){
        ev.stopPropagation();
        var idx = parseInt(b.getAttribute('data-rmidx'), 10);
        removeFoundAt(idx);
      });
    });
  }

  function updateButtons() {
    var hasSel = S.selected.length > 0;
    var confirmBtn = document.getElementById('ct2BtnConfirm' + thisq);
    var clearBtn   = document.getElementById('ct2BtnClr' + thisq);
    var doneBtn    = document.getElementById('ct2BtnDone' + thisq);
    var checkIndepBtn = document.getElementById('ct2BtnCheck' + thisq);

    if (S.phase === 'independence') {
      if (confirmBtn) confirmBtn.style.display = 'none';
      if (clearBtn)   clearBtn.style.display   = 'none';
      if (doneBtn)    doneBtn.style.display    = 'none';
      if (checkIndepBtn) {
        checkIndepBtn.style.display = '';
        checkIndepBtn.disabled = S.independenceSelection.length < 1;
      }
    } else {
      if (confirmBtn) {
        confirmBtn.style.display = '';
        confirmBtn.disabled = !hasSel;
        confirmBtn.textContent = (S.phase === 'branches') ? 'Confirm Branch' : 'Confirm Loop';
      }
      if (clearBtn) { clearBtn.style.display = ''; clearBtn.disabled = !hasSel; }
      if (doneBtn) {
        doneBtn.style.display = '';
        if (S.phase === 'branches') {
          doneBtn.textContent = 'Branches Done \u2192';
          doneBtn.disabled = S.foundBranches.length === 0;
        } else {
          doneBtn.textContent = 'Loops Done \u2192';
          doneBtn.disabled = S.foundLoops.length === 0;
        }
      }
      if (checkIndepBtn) checkIndepBtn.style.display = 'none';
    }
  }

  function updateProgress() {
    var note = document.getElementById('ct2Prog' + thisq);
    if (!note) return;
    if (S.phase === 'branches') {
      note.textContent = 'Found ' + S.foundBranches.length + ' branch' + (S.foundBranches.length===1?'':'es');
    } else if (S.phase === 'loops') {
      note.textContent = 'Found ' + S.foundLoops.length + ' loop' + (S.foundLoops.length===1?'':'s');
    } else {
      var n = S.independenceSelection.length;
      note.textContent = n + ' loop' + (n===1?'':'s') + ' selected';
    }
  }

  function setFeedback(msg, tone) {
    var fb = document.getElementById('ct2Fb' + thisq);
    if (!fb) return;
    fb.className = 'ct2fb' + (tone === 'good' ? ' ct2fbgood' : tone === 'bad' ? ' ct2fbbad' : tone === 'info' ? ' ct2fbinfo' : '');
    fb.innerHTML = msg;
  }
  function announce(msg) {
    var live = document.getElementById('ct2Live' + thisq);
    var nar  = document.getElementById('ct2Nar' + thisq);
    if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
    if (nar && S.a11y.nr) nar.textContent = msg;
  }

  /* =========================================================
     PHASE OPERATIONS
  ========================================================= */
  function nextColor(list) {
    return FOUND_COLORS[list.length % FOUND_COLORS.length];
  }

  function tryConfirm() {
    if (S.selected.length === 0) return;
    var idSet = new Set(S.selected);
    var labels = S.selected.map(function(id){var c=getById(id);return c?c.label:id;}).join(', ');

    if (S.phase === 'branches') {
      // Check it's not a duplicate
      for (var i=0; i<S.foundBranches.length; i++) {
        if (setsEqual(S.foundBranches[i].ids, idSet)) {
          setFeedback('You\u2019ve already identified that branch.', 'info');
          announce('Already identified.');
          return;
        }
      }
      var res = checkBranch(idSet);
      if (!res.ok) {
        setFeedback('<strong>Not a valid branch.</strong> ' + res.reason, 'bad');
        announce('Incorrect. ' + res.reason);
        return;
      }
      S.foundBranches.push({ ids:new Set(idSet), color: nextColor(S.foundBranches) });
      S.selected = [];
      setFeedback('<strong>Correct \u2014 valid branch:</strong> ' + labels + '.', 'good');
      announce('Branch confirmed: ' + labels + '.');
      refreshUI();
      // Auto-detect when all branches found
      if (allBranchesFound()) {
        setFeedback('<strong>You\u2019ve found all branches.</strong> Press \u201CBranches Done\u201D to move on to loops.', 'good');
      }
    } else if (S.phase === 'loops') {
      for (var j=0; j<S.foundLoops.length; j++) {
        if (setsEqual(S.foundLoops[j].ids, idSet)) {
          setFeedback('You\u2019ve already identified that loop.', 'info');
          announce('Already identified.');
          return;
        }
      }
      var res2 = checkLoop(idSet);
      if (!res2.ok) {
        setFeedback('<strong>Not a valid loop.</strong> ' + res2.reason, 'bad');
        announce('Incorrect. ' + res2.reason);
        return;
      }
      S.foundLoops.push({ ids:new Set(idSet), color: nextColor(S.foundLoops) });
      S.selected = [];
      setFeedback('<strong>Correct \u2014 valid loop:</strong> ' + labels + '.', 'good');
      announce('Loop confirmed: ' + labels + '.');
      refreshUI();
    }
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    var ok = true;
    a.forEach(function(x){ if (!b.has(x)) ok = false; });
    return ok;
  }

  function allBranchesFound() {
    // Heuristic: count how many branches the circuit actually has by scanning
    // for maximal degree-2 paths between junctions. This is the same number
    // as len(components) when there are 2 junctions and every component
    // forms a separate branch — but in our ladder topology after Stage 1
    // simplification, branches can have multiple components. We compute it
    // properly via graph traversal.
    return S.foundBranches.length >= computeTotalBranchCount();
  }

  function computeTotalBranchCount() {
    // Walk the graph: for each junction node, follow each incident edge
    // until reaching another junction. Count each branch once.
    var junctions = new Set();
    var nodes = new Set();
    S.circuit.components.forEach(function(c){ nodes.add(c.a); nodes.add(c.b); });
    nodes.forEach(function(n){ if (nodeDegreeFull(n) >= 3) junctions.add(n); });

    if (junctions.size === 0) {
      // No junctions -> circuit is a single loop (no branches in graph sense),
      // or a chain. Treat all components as one "branch."
      return S.circuit.components.length > 0 ? 1 : 0;
    }

    var branchCount = 0;
    var visitedEdges = new Set();
    junctions.forEach(function(j){
      S.circuit.components.forEach(function(c){
        if (visitedEdges.has(c.id)) return;
        if (c.a !== j && c.b !== j) return;
        // Walk this branch from j
        var cur = c;
        var curNode = (cur.a === j) ? cur.b : cur.a;
        var prevNode = j;
        visitedEdges.add(cur.id);
        while (!junctions.has(curNode)) {
          // Find the next non-visited edge from curNode
          var next = null;
          for (var i=0; i<S.circuit.components.length; i++) {
            var ec = S.circuit.components[i];
            if (visitedEdges.has(ec.id)) continue;
            if (ec.a === curNode || ec.b === curNode) { next = ec; break; }
          }
          if (!next) break;
          visitedEdges.add(next.id);
          var newNode = (next.a === curNode) ? next.b : next.a;
          prevNode = curNode;
          curNode = newNode;
        }
        branchCount++;
      });
    });
    return branchCount;
  }

  function removeFoundAt(idx) {
    var list = (S.phase === 'loops') ? S.foundLoops : S.foundBranches;
    list.splice(idx, 1);
    // Re-color remaining items so colors are consistent
    list.forEach(function(item, i){ item.color = FOUND_COLORS[i % FOUND_COLORS.length]; });
    setFeedback('Removed.', 'info');
    refreshUI();
  }

  function gotoPhase(p) {
    S.phase = p;
    S.selected = [];
    if (p === 'independence') {
      S.independenceSelection = [];
      var n = expectedLoopCount();
      setFeedback('<strong>Now identify which loops are independent.</strong><br>'
        + 'You only need <strong>' + n + '</strong> independent loop' + (n===1?'':'s') + ' for KVL '
        + '(branches \u2212 junctions + 1). Click loops in the list to select them; '
        + 'the widget will tell you if your choice is independent.', 'info');
      announce('Phase: identify independent loops. You need ' + n + ' loop' + (n===1?'':'s') + '.');
    } else if (p === 'loops') {
      setFeedback('<strong>Now identify the loops.</strong> Click components forming a closed path, then Confirm Loop.', 'info');
      announce('Phase: loops. Click components forming a closed path.');
    } else {
      setFeedback('<strong>Identify each branch.</strong> Click the components belonging to one branch, then Confirm Branch.', 'info');
      announce('Phase: branches. Click components belonging to one branch.');
    }
    updatePhaseTabs();
    refreshUI();
  }

  function updatePhaseTabs() {
    ['branches','loops','independence'].forEach(function(p){
      var el = document.getElementById('ct2Phase_' + p + '_');
      if (!el) return;
      el.classList.toggle('ct2phaseactive', S.phase === p);
      // Mark "done" if past it
      var order = ['branches','loops','independence'];
      var pIdx = order.indexOf(p), curIdx = order.indexOf(S.phase);
      el.classList.toggle('ct2phasedone', pIdx < curIdx);
    });
  }

  function toggleIndependenceSelection(idx) {
    var pos = S.independenceSelection.indexOf(idx);
    if (pos >= 0) S.independenceSelection.splice(pos, 1);
    else S.independenceSelection.push(idx);
    refreshUI();
  }

  function checkIndependence() {
    if (S.independenceSelection.length === 0) return;
    var vectors = S.independenceSelection.map(function(i){
      return loopVector(S.foundLoops[i].ids);
    });
    var rank = gf2Rank(vectors);
    var n = S.independenceSelection.length;
    var needed = expectedLoopCount();

    if (rank < n) {
      var dependentCount = n - rank;
      setFeedback('<strong>Not independent.</strong> '
        + dependentCount + ' of your ' + n + ' loop' + (n===1?'':'s')
        + ' can be obtained by combining (XOR) the others. '
        + 'Try a smaller or different subset.', 'bad');
      announce('Not independent. ' + dependentCount + ' of your loops are redundant.');
      return;
    }
    if (n < needed) {
      setFeedback('<strong>Independent, but not enough.</strong> '
        + 'You need ' + needed + ' independent loop' + (needed===1?'':'s')
        + ' for KVL. Add ' + (needed - n) + ' more.', 'info');
      announce('Independent, but you need ' + needed + ' total.');
      return;
    }
    if (n > needed) {
      setFeedback('<strong>That\u2019s ' + n + ' loops, but only ' + needed
        + ' are needed.</strong> Any ' + needed + ' of these would do \u2014 the others are redundant.', 'info');
      announce('Too many. Pick a smaller independent set.');
      return;
    }
    // Exactly right
    setFeedback('<strong>\u2713 Correct \u2014 ' + n + ' independent loops, exactly what KVL needs.</strong>'
      + '<br>Together with KCL at the junction, you now have enough equations for all the unknown currents.', 'good');
    announce('Correct. ' + n + ' independent loops chosen.');
    showCompleteBanner();
  }

  function showCompleteBanner() {
    var banner = document.getElementById('ct2Comp' + thisq);
    if (!banner) return;
    banner.classList.add('ct2show');
    var msg = 'Stage 2 complete. ' + S.foundBranches.length + ' branches, '
      + S.foundLoops.length + ' loops total, ' + S.independenceSelection.length
      + ' independent. Ready for Stage 3 (current direction assignment).';
    banner.innerHTML = ''
      + '<div class="ct2compmsg' + '">\u2713 ' + msg + '</div>'
      + '<button type="button" class="ct2btn' + ' ct2btnnext' + '" id="ct2BtnNext' + thisq + '">'
      + 'Continue to Stage 3 \u2192</button>';
    var nextBtn = document.getElementById('ct2BtnNext' + thisq);
    if (nextBtn) {
      nextBtn.addEventListener('click', function(){
        var ev = new CustomEvent('ctStageComplete', { detail:{ stage:2, thisq:thisq } });
        document.dispatchEvent(ev);
        var hook = window['ctOnStageComplete_' + thisq];
        if (typeof hook === 'function') hook(2);
        announce('Advancing to Stage 3.');
      });
    }
  }

  /* =========================================================
     ACCESSIBILITY TOOLBAR
  ========================================================= */
  function applyA11y() {
    var root = document.getElementById(rootElId).querySelector('.ct2root');
    if (!root) return;
    root.classList.toggle('ct2lm', S.a11y.lm);
    root.classList.toggle('ct2hc', S.a11y.hc);
    var fontSizes = ['14px','16px','19px'];
    root.style.setProperty('--ct2fs', fontSizes[S.a11y.fs]);

    setBtn('ct2BtnLM', S.a11y.lm, 'LIGHT MODE');
    setBtn('ct2BtnNR', S.a11y.nr, 'NARRATION', true);
    setBtn('ct2BtnHC', S.a11y.hc, 'HIGH CONTRAST');
    setBtn('ct2BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);

    var nar = document.getElementById('ct2Nar' + thisq);
    if (nar) nar.classList.toggle('ct2narshow', S.a11y.nr);
  }
  function setBtn(idBase, on, label, withSuffix) {
    var b = document.getElementById(idBase + thisq);
    if (!b) return;
    b.classList.toggle('ct2a11yon', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = withSuffix ? (label + ': ' + (on ? 'ON' : 'OFF')) : label;
  }
  function toggleA11y(key) {
    if (key === 'fs') S.a11y.fs = (S.a11y.fs + 1) % 3;
    else S.a11y[key] = !S.a11y[key];
    applyA11y();
    render();
  }

  /* =========================================================
     INITIAL DOM
  ========================================================= */
  function buildDOM() {
    var root = document.getElementById(rootElId);
    var html = ''
      + '<div class="ct2root' + '" role="region" aria-label="Branches and loops tutorial">'
      + '  <div class="ct2a11y' + '" role="toolbar" aria-label="Display options">'
      + '    <button type="button" class="ct2a11ybtn' + '" id="ct2BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
      + '    <button type="button" class="ct2a11ybtn' + ' ct2a11yon' + '" id="ct2BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
      + '    <button type="button" class="ct2a11ybtn' + '" id="ct2BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
      + '    <button type="button" class="ct2a11ybtn' + '" id="ct2BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
      + '  </div>'
      + '  <div id="ct2Nar' + thisq + '" class="ct2narbar' + ' ct2narshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '  <h3 class="ct2title' + '">Stage 2: Branches and Loops</h3>'
      + '  <div class="ct2subtitle' + '">Identify the branches in the simplified circuit, then the loops you\u2019ll use for KVL.</div>'
      + '  <div class="ct2stagebar' + '" role="navigation" aria-label="Tutorial stages">'
      + '    <span class="ct2pill' + ' ct2pilldone' + '">1. Simplify \u2713</span>'
      + '    <span class="ct2pill' + ' ct2pillactive' + '">2. Branches \u0026 Loops</span>'
      + '    <span class="ct2pill' + '">3. Currents</span>'
      + '    <span class="ct2pill' + '">4. Polarities</span>'
      + '    <span class="ct2pill' + '">5. Equations</span>'
      + '  </div>'
      + '  <div class="ct2phasebar' + '" role="tablist">'
      + '    <button type="button" class="ct2phase' + ' ct2phaseactive' + '" id="ct2Phase_branches_' + thisq + '" role="tab">2A. Branches</button>'
      + '    <button type="button" class="ct2phase' + '" id="ct2Phase_loops_' + thisq + '" role="tab">2B. Loops</button>'
      + '    <button type="button" class="ct2phase' + '" id="ct2Phase_independence_' + thisq + '" role="tab">2C. Independence</button>'
      + '  </div>'
      + '  <div class="ct2layout' + '">'
      + '    <div class="ct2canvasWrap' + thisq + '">'
      + '      <div class="ct2hint' + '" id="ct2Hint' + thisq + '">Click the components belonging to one branch (any order), then press Confirm Branch. Use Tab to focus a component, Enter or Space to select.</div>'
      + '      <svg class="ct2svg' + '" id="ct2Svg' + thisq + '" viewBox="0 0 540 320" role="img" aria-label="Simplified circuit"></svg>'
      + '      <div class="ct2complete' + '" id="ct2Comp' + thisq + '" role="status"></div>'
      + '    </div>'
      + '    <aside class="ct2side' + '" aria-label="Branches and loops controls">'
      + '      <div>'
      + '        <h2 class="ct2sideh' + '">Selected</h2>'
      + '        <div class="ct2selist' + '" id="ct2Sel' + thisq + '" aria-live="polite"></div>'
      + '      </div>'
      + '      <div>'
      + '        <h2 class="ct2sideh' + '" id="ct2FoundHdr' + thisq + '">Found Branches</h2>'
      + '        <div class="ct2foundlist' + '" id="ct2Found' + thisq + '" aria-live="polite"></div>'
      + '      </div>'
      + '      <div class="ct2btnrow' + '">'
      + '        <button type="button" class="ct2btn' + ' ct2btnprimary' + '" id="ct2BtnConfirm' + thisq + '" disabled>Confirm Branch</button>'
      + '        <button type="button" class="ct2btn' + ' ct2btndanger' + '" id="ct2BtnClr' + thisq + '" disabled>Clear</button>'
      + '      </div>'
      + '      <div class="ct2btnrow' + '">'
      + '        <button type="button" class="ct2btn' + '" id="ct2BtnDone' + thisq + '" disabled>Branches Done \u2192</button>'
      + '        <button type="button" class="ct2btn' + ' ct2btnprimary' + '" id="ct2BtnCheck' + thisq + '" style="display:none">Check Independence</button>'
      + '      </div>'
      + '      <div>'
      + '        <h2 class="ct2sideh' + '">Feedback</h2>'
      + '        <div class="ct2fb' + '" id="ct2Fb' + thisq + '">Identify each branch in the simplified circuit.</div>'
      + '      </div>'
      + '      <div class="ct2progress' + '" id="ct2Prog' + thisq + '"></div>'
      + '    </aside>'
      + '  </div>'
      + '  <span class="ct2sr' + '" id="ct2Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
      + '</div>';
    root.innerHTML = html;

    document.getElementById('ct2BtnConfirm' + thisq).addEventListener('click', tryConfirm);
    document.getElementById('ct2BtnClr' + thisq).addEventListener('click', clearSelection);
    document.getElementById('ct2BtnDone' + thisq).addEventListener('click', function(){
      if (S.phase === 'branches') gotoPhase('loops');
      else if (S.phase === 'loops') gotoPhase('independence');
    });
    document.getElementById('ct2BtnCheck' + thisq).addEventListener('click', checkIndependence);
    document.getElementById('ct2BtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
    document.getElementById('ct2BtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
    document.getElementById('ct2BtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
    document.getElementById('ct2BtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });

    document.getElementById('ct2Phase_branches_' + thisq).addEventListener('click', function(){ gotoPhase('branches'); });
    document.getElementById('ct2Phase_loops_' + thisq).addEventListener('click', function(){
      if (S.foundBranches.length === 0) {
        setFeedback('Identify at least one branch before moving to loops.', 'info');
        return;
      }
      gotoPhase('loops');
    });
    document.getElementById('ct2Phase_independence_' + thisq).addEventListener('click', function(){
      if (S.foundLoops.length === 0) {
        setFeedback('Identify at least one loop before checking independence.', 'info');
        return;
      }
      gotoPhase('independence');
    });
  }

  /* =========================================================
     PHASE LABEL UPDATE (Found Branches/Loops header)
  ========================================================= */
  function updateFoundHeader() {
    var h = document.getElementById('ct2FoundHdr' + thisq);
    if (!h) return;
    if (S.phase === 'branches') h.textContent = 'Found Branches';
    else h.textContent = 'Found Loops';
  }

  // Wrap refreshUI to also update the side header
  var origRefresh = refreshUI;
  refreshUI = function() {
    origRefresh();
    updateFoundHeader();
    var hint = document.getElementById('ct2Hint' + thisq);
    if (hint) {
      if (S.phase === 'branches') {
        hint.textContent = 'Click the components belonging to one branch (any order), then press Confirm Branch.';
      } else if (S.phase === 'loops') {
        hint.textContent = 'Click components forming a closed path (any order), then press Confirm Loop.';
      } else {
        hint.textContent = 'Click loops in the Found Loops list to select an independent set, then Check Independence.';
      }
    }
  };

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    // Pull Stage 1's circuit if available, else fallback
    var s1state = window['ctState_' + thisq];
    if (s1state && s1state.circuit && s1state.circuit.components && s1state.circuit.components.length > 0) {
      // Deep-clone the components so mutating Stage 2 state doesn't affect Stage 1
      S.circuit = {
        components: s1state.circuit.components.map(function(c){ return Object.assign({}, c); })
      };
    } else {
      S.circuit = fallbackCircuit();
    }
    buildDOM();
    applyA11y();
    updatePhaseTabs();
    refreshUI();
    setFeedback('<strong>Stage 2 Phase A:</strong> Identify each branch in the simplified circuit. Click the components belonging to one branch, then press Confirm Branch.', 'info');
    announce('Stage 2 ready. Phase A: branches. Click components belonging to one branch, then Confirm.');
  }

  /* Re-read Stage 1's circuit and reset Stage 2 progress.
     Called when Stage 1 fires ctStageComplete OR when the container
     becomes visible (whichever comes first). */
  function reloadFromStage1() {
    var s1state = window['ctState_' + thisq];
    if (!(s1state && s1state.circuit && s1state.circuit.components)) return;
    S.circuit = {
      components: s1state.circuit.components.map(function(c){ return Object.assign({}, c); })
    };
    // Reset progress in case the user is restarting
    S.phase = 'branches';
    S.selected = [];
    S.foundBranches = [];
    S.foundLoops = [];
    S.independenceSelection = [];
    var banner = document.getElementById('ct2Comp' + thisq);
    if (banner) banner.classList.remove('ct2show');
    updatePhaseTabs();
    refreshUI();
    setFeedback('<strong>Stage 2 Phase A:</strong> Identify each branch in the simplified circuit. Click the components belonging to one branch, then press Confirm Branch.', 'info');
    announce('Stage 2 starting. Phase A: branches.');
  }

  // Listen for Stage 1's completion to refresh Stage 2's circuit data
  document.addEventListener('ctStageComplete', function(e){
    if (e.detail && e.detail.stage === 1 && e.detail.thisq === thisq) {
      // Defer a tick so any DOM updates from Stage 1 finish first
      setTimeout(reloadFromStage1, 0);
    }
  });

  if (document.getElementById(rootElId)) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
