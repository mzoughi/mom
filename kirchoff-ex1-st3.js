(function(){
  'use strict';

  var thisq = window.ctThisq;
  var rootElId = 'ct3Root' + thisq;
  var stateKey = 'ctState3_' + thisq;

  /* =========================================================
     STATE
  ========================================================= */
  if (!window[stateKey]) {
    window[stateKey] = {
      a11y: { lm:false, nr:true, hc:false, fs:0 },
      circuit: null,           // copy of Stage 1's simplified circuit
      branches: [],            // [{ id, label('I1'), color, ids:Set,
                               //    locked:bool, direction: 'forward'|'reverse'|null,
                               //    fromNode, toNode  (when direction set) }]
      hasError: false
    };
  }
  var S = window[stateKey];

  /* =========================================================
     INIT FROM PRIOR STAGES
  ========================================================= */
  function loadFromPriorStages() {
    var s1 = window['ctState_' + thisq];
    var s2 = window['ctState2_' + thisq];

    if (!(s1 && s1.circuit && s1.circuit.components && s1.circuit.components.length > 0)) {
      return { ok:false, reason:'Stage 1 has not been completed yet.' };
    }
    if (!(s2 && s2.foundBranches && s2.foundBranches.length > 0)) {
      return { ok:false, reason:'Complete Stage 2 first \u2014 the branches must be identified before assigning current directions.' };
    }

    // Copy circuit
    S.circuit = {
      components: s1.circuit.components.map(function(c){ return Object.assign({}, c); })
    };

    // Build branches list. Each Stage 2 entry: { ids:Set, color }
    // We need to derive endpoints (fromNode/toNode) and label them I1, I2, ...
    // Order branches left-to-right by minimum column index of their components.
    var sortedB = s2.foundBranches.slice().map(function(b, i){
      var comps = S.circuit.components.filter(function(c){ return b.ids.has(c.id); });
      var minCol = Math.min.apply(null, comps.map(function(c){ return c.col != null ? c.col : 99; }));
      return { src:b, comps:comps, minCol:minCol, origIdx:i };
    }).sort(function(a,b){
      if (a.minCol !== b.minCol) return a.minCol - b.minCol;
      return a.origIdx - b.origIdx;
    });

    S.branches = sortedB.map(function(item, i) {
      var endpoints = findBranchEndpoints(item.comps);
      // Determine if this branch contains a battery, and if so, what the
      // CONVENTIONAL-correct direction is (so we can validate the student's choice later).
      // Conventional current in the external circuit flows TOWARD the positive
      // terminal of the battery (outside the battery, current returns into +).
      // Wait, actually: conventional current flows OUT of + terminal externally,
      // around the external loop, and INTO the - terminal. Inside this single
      // branch, the battery's + terminal IS one of the endpoints (a junction node);
      // the external path of this branch runs from the - terminal (internal node)
      // through the resistor(s) to the OTHER junction node. Then conventional
      // current flows: out of + (= junction we'll call EpPos) -> through the
      // EXTERNAL circuit (other branches) -> back into the OTHER endpoint (EpNeg)
      // -> through the resistor(s) of this branch UPWARD -> into the - terminal
      // -> through the battery internally to + -> back out at EpPos.
      //
      // So WITHIN this branch, conventional current flows from EpNeg toward EpPos.
      // EpPos is the endpoint connected to the battery's + terminal (bat.a).
      var bat = item.comps.find(function(c){ return c.kind === 'battery'; });
      var correctFromNode = null, correctToNode = null;
      if (bat) {
        // Find which endpoint is on the "positive side" of the battery.
        // Walk from bat.a (positive terminal node) outward, NOT through the battery itself.
        // Since bat.a may itself be an endpoint (a junction), the walk terminates immediately
        // at bat.a. That endpoint is the one ATTACHED to + -> conventional current flows
        // INTO this endpoint from outside the branch, and IN THIS BRANCH it flows
        // from the OTHER endpoint TOWARD this endpoint.
        var posSideEndpoint = traceBranchFrom(item.comps, bat.a, bat.id, endpoints);
        if (posSideEndpoint) {
          correctToNode = posSideEndpoint;                                  // toward +
          correctFromNode = (correctToNode === endpoints[0]) ? endpoints[1] : endpoints[0];
        }
      }
      return {
        id: 'B' + i,
        label: 'I' + subscript(i+1),
        color: item.src.color,
        ids: new Set(item.src.ids),
        comps: item.comps,
        endpoints: endpoints,
        // No more pre-set/locked behavior. All branches start unset.
        // For battery branches we keep correctFromNode/correctToNode so we can
        // validate the student's choice when they click.
        locked: false,
        direction: null,
        fromNode: null,
        toNode: null,
        hasBattery: !!bat,
        battery: bat || null,
        correctFromNode: correctFromNode,
        correctToNode: correctToNode
      };
    });

    return { ok:true };
  }

  function subscript(n) {
    var subs = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
    return String(n).split('').map(function(ch){ return subs[+ch]; }).join('');
  }

  function findBranchEndpoints(comps) {
    var deg = {};
    comps.forEach(function(c){ deg[c.a] = (deg[c.a]||0)+1; deg[c.b] = (deg[c.b]||0)+1; });
    var eps = [];
    Object.keys(deg).forEach(function(n){ if (deg[n] === 1) eps.push(n); });
    return eps;
  }

  /* Walk through a branch starting from a node, following components, until reaching
     an endpoint. Used to figure out which endpoint a battery's positive terminal "leads to".
     We start from `startNode`, take the component identified by `startCompId`'s OTHER terminal
     as the next node, then keep walking. */
  function traceBranchFrom(comps, startNode, startCompId, endpoints) {
    // The startNode is one terminal of startComp. We want to walk AWAY from startCompId,
    // i.e. start from startNode and find any other component (not startCompId) that touches it.
    var visited = new Set();
    visited.add(startCompId);
    var cur = startNode;
    while (endpoints.indexOf(cur) < 0) {
      var nextComp = comps.find(function(c){
        return !visited.has(c.id) && (c.a === cur || c.b === cur);
      });
      if (!nextComp) return null;
      visited.add(nextComp.id);
      cur = (nextComp.a === cur) ? nextComp.b : nextComp.a;
    }
    return cur;
  }

  /* =========================================================
     LAYOUT (slot-based, identical to Stages 1-2)
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
    colKeys.forEach(function(col, i){
      pos[col] = L.padX + (nCols === 1 ? usableW/2 : i * colSpacing);
    });
    return { L:L, cols:cols, colKeys:colKeys, x:pos };
  }

  function componentY(comp, info) {
    var L = info.L, mid = (L.railTop + L.railBot) / 2;
    if (comp.row === 0) return { yTop: L.railTop, yBot: mid - 10 };
    return { yTop: mid + 10, yBot: L.railBot };
  }
  function effectiveYRange(comp, info) {
    var L = info.L;
    var rows = {};
    info.cols[comp.col].forEach(function(c){ rows[c.row] = true; });
    if (Object.keys(rows).length === 1) return { yTop: L.railTop, yBot: L.railBot };
    return componentY(comp, info);
  }

  /* For each branch, compute its rendering geometry: the two click zones
     (toward each endpoint) and the spot where the current arrow goes. */
  function branchGeometry(branch, info) {
    var L = info.L;
    // For Example 1 (vertical ladder), every branch lives in one column.
    var firstComp = branch.comps[0];
    var col = firstComp.col;
    var x = info.x[col];

    // Compute the vertical extent: from railTop to railBot (since branches in our
    // ladder always run from top rail to bottom rail).
    var yMin = L.railTop, yMax = L.railBot;
    var mid = (yMin + yMax) / 2;

    // For batteries, x might be the column x; for parallel pairs none of which exist
    // in branches anymore (they were merged in Stage 1).
    return {
      orientation: 'vertical',
      x: x,
      yMin: yMin,
      yMax: yMax,
      // Click zones: top half (yMin to mid) and bottom half (mid to yMax)
      topZone: { x: x - 28, y: yMin - 4, w: 56, h: mid - yMin + 4 },
      botZone: { x: x - 28, y: mid, w: 56, h: yMax - mid + 4 },
      // Map endpoint -> "top" or "bottom"
      endpointSide: endpointSideForVertical(branch)
    };
  }

  /* For a vertical branch, determine which endpoint is at the top and which is at the bottom. */
  function endpointSideForVertical(branch) {
    // In our ladder topology, top-rail nodes are nT (or its successors after merges).
    // Actually the canonical names are nT for top and nB for bottom in Example 1's
    // simplified circuit. We can determine which is "top" by checking component rows:
    // any component in the branch with row=0 has its "top" terminal at the top rail.
    // More robust: pick the topmost component, find which of its two nodes is the
    // top-rail node (the one not shared with another component in the branch).
    //
    // Simplest: the endpoint that's ALSO a node of a row-0 component.
    var rowZeroComps = branch.comps.filter(function(c){ return c.row === 0; });
    if (rowZeroComps.length === 0) {
      // fallback: assume endpoints[0] is top
      return { top: branch.endpoints[0], bottom: branch.endpoints[1] };
    }
    // The top-rail endpoint must touch a row-0 component AND be in branch.endpoints.
    var topEp = null, bottomEp = null;
    branch.endpoints.forEach(function(ep){
      var onRow0 = rowZeroComps.some(function(c){ return c.a === ep || c.b === ep; });
      if (onRow0) topEp = ep;
      else bottomEp = ep;
    });
    if (!topEp || !bottomEp) {
      // both endpoints touch row-0 components (i.e. branch has ONLY a row-0 component).
      // Use node-name heuristic: nT is top.
      branch.endpoints.forEach(function(ep){
        if (/^nT/.test(ep)) topEp = ep;
        else bottomEp = ep;
      });
    }
    return { top: topEp || branch.endpoints[0], bottom: bottomEp || branch.endpoints[1] };
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
    var svg = document.getElementById('ct3Svg' + thisq);
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    t.textContent = 'Simplified circuit with branch currents';
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    d.textContent = describeCircuit();
    svg.appendChild(t); svg.appendChild(d);

    var info = layout();
    if (!info) return;
    var L = info.L;

    svg.appendChild(svgEl('line', {x1:L.padX-10, y1:L.railTop, x2:L.width-L.padX+10, y2:L.railTop, 'class':'ct3wire'}));
    svg.appendChild(svgEl('line', {x1:L.padX-10, y1:L.railBot, x2:L.width-L.padX+10, y2:L.railBot, 'class':'ct3wire'}));

    info.colKeys.forEach(function(col){
      var x = info.x[col];
      var colComps = info.cols[col];
      colComps.sort(function(a,b){return a.row-b.row;});
      colComps.forEach(function(c){
        var yr = effectiveYRange(c, info);
        drawComponent(svg, c, x, yr.yTop, yr.yBot, x);
      });
      // connecting wire between rows
      var rows = {};
      colComps.forEach(function(c){ if(!rows[c.row]) rows[c.row]=[]; rows[c.row].push(c); });
      var rowKeys = Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
      if (rowKeys.length === 2) {
        var r0 = rows[0][0], r1 = rows[1][0];
        var y0r = effectiveYRange(r0, info), y1r = effectiveYRange(r1, info);
        if (rows[0].length === 1 && rows[1].length === 1) {
          svg.appendChild(svgEl('line', {x1:x, y1:y0r.yBot, x2:x, y2:y1r.yTop, 'class':'ct3wire'}));
        }
      }
    });

    // Now overlay each branch's interactive zones and current arrow
    S.branches.forEach(function(b){ drawBranchOverlay(svg, b, info); });
  }

  function drawComponent(svg, c, xCenter, yTop, yBot, xRail) {
    if (c.kind === 'battery') drawBattery(svg, c, xCenter, yTop, yBot);
    else drawResistor(svg, c, xCenter, yTop, yBot);
  }

  function drawResistor(svg, c, xCenter, yTop, yBot) {
    var bodyW = 22, bodyH = 60;
    var bodyX = xCenter - bodyW/2;
    var bodyY = (yTop + yBot)/2 - bodyH/2;
    svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:bodyY, 'class':'ct3wire'}));
    svg.appendChild(svgEl('line',{x1:xCenter, y1:bodyY+bodyH, x2:xCenter, y2:yBot, 'class':'ct3wire'}));
    svg.appendChild(svgEl('rect', {
      x:bodyX, y:bodyY, width:bodyW, height:bodyH, rx:3, ry:3,
      'class':'ct3comp'
    }));
    var labelX = bodyX + bodyW + 8;
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 - 2, 'class':'ct3label', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 + 14, 'class':'ct3val', 'text-anchor':'start'}, fmt(c.value) + ' \u03a9'));
  }

  function drawBattery(svg, c, xCenter, yTop, yBot) {
    var midY = (yTop + yBot) / 2;
    // Top terminal of battery (the one drawn at yTop) corresponds to c.a (positive)
    // since in Stage 1 we render long-plate at top for nT-anchored batteries.
    // To be orientation-agnostic in future examples, we should determine which terminal
    // is "up" based on c.a position. For Example 1, c.a is always nT (top rail).
    var aIsTop = isNodeAtTop(c.a, c.b, yTop, yBot);
    var longLen = 30, shortLen = 16;
    if (aIsTop) {
      // long plate on top
      svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:midY-3, 'class':'ct3wire'}));
      svg.appendChild(svgEl('line',{x1:xCenter-longLen/2, y1:midY-3, x2:xCenter+longLen/2, y2:midY-3, 'class':'ct3wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter-shortLen/2, y1:midY+5, x2:xCenter+shortLen/2, y2:midY+5, 'class':'ct3wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter, y1:midY+5, x2:xCenter, y2:yBot, 'class':'ct3wire'}));
    } else {
      // long plate on bottom
      svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:midY-5, 'class':'ct3wire'}));
      svg.appendChild(svgEl('line',{x1:xCenter-shortLen/2, y1:midY-5, x2:xCenter+shortLen/2, y2:midY-5, 'class':'ct3wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter-longLen/2, y1:midY+3, x2:xCenter+longLen/2, y2:midY+3, 'class':'ct3wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter, y1:midY+3, x2:xCenter, y2:yBot, 'class':'ct3wire'}));
    }
    var labelX = xCenter + longLen/2 + 8;
    svg.appendChild(svgEl('text',{x:labelX, y:midY-2, 'class':'ct3label', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text',{x:labelX, y:midY+14, 'class':'ct3val', 'text-anchor':'start'}, c.value + ' V'));
  }

  /* For our ladder, the "top" rail node is whichever endpoint of an outermost
     component points at yTop. We have to inspect the layout to be sure. */
  function isNodeAtTop(nodeA, nodeB, yTop, yBot) {
    // In Example 1, top rail nodes start with 'nT' or have position info.
    // For now use a name-based heuristic that's reliable for our circuit:
    if (/^nT/.test(nodeA)) return true;
    if (/^nT/.test(nodeB)) return false;
    // Fallback: just say A is top
    return true;
  }

  /* =========================================================
     BRANCH OVERLAYS (click zones + arrows)
  ========================================================= */
  function drawBranchOverlay(svg, branch, info) {
    var geom = branchGeometry(branch, info);
    var L = info.L;

    // 1. Click zones — always drawn now (no branches are auto-locked).
    var topRect = svgEl('rect', {
      x: geom.topZone.x, y: geom.topZone.y, width: geom.topZone.w, height: geom.topZone.h,
      'class': 'ct3zone',
      tabindex: 0, role: 'button',
      'data-bid': branch.id, 'data-side': 'top',
      'aria-label': 'Set ' + branch.label + ' direction toward top'
    });
    attachZoneHandlers(topRect, branch, 'top');
    svg.appendChild(topRect);

    var botRect = svgEl('rect', {
      x: geom.botZone.x, y: geom.botZone.y, width: geom.botZone.w, height: geom.botZone.h,
      'class': 'ct3zone',
      tabindex: 0, role: 'button',
      'data-bid': branch.id, 'data-side': 'bottom',
      'aria-label': 'Set ' + branch.label + ' direction toward bottom'
    });
    attachZoneHandlers(botRect, branch, 'bottom');
    svg.appendChild(botRect);

    // 2. Current arrow (if direction is set)
    if (branch.direction) {
      drawCurrentArrow(svg, branch, geom, info);
    } else {
      drawDirectionPlaceholder(svg, branch, geom);
    }
  }

  function drawCurrentArrow(svg, branch, geom, info) {
    var L = info.L;
    var pointsToTop = (branch.toNode === geom.endpointSide.top);
    var x = geom.x;
    var arrowX = x - 22;
    var mid = (L.railTop + L.railBot) / 2;
    var headLen = 7, headHalfW = 5;
    var shaftLen = 36;
    var arrowY1, arrowY2; // y1 = tail, y2 = head
    if (pointsToTop) {
      arrowY1 = mid + shaftLen/2;
      arrowY2 = mid - shaftLen/2;
    } else {
      arrowY1 = mid - shaftLen/2;
      arrowY2 = mid + shaftLen/2;
    }

    var color = branch.color || '#00d4ff';

    var head = svgEl('polygon', {
      points: arrowX + ',' + arrowY2 + ' ' + (arrowX-headHalfW) + ',' + (arrowY2 + (pointsToTop?headLen:-headLen)) + ' ' + (arrowX+headHalfW) + ',' + (arrowY2 + (pointsToTop?headLen:-headLen)),
      'class': 'ct3arrowhead',
      fill: color
    });
    var shaft = svgEl('line', {
      x1: arrowX, y1: arrowY1,
      x2: arrowX, y2: arrowY2 + (pointsToTop ? headLen*0.6 : -headLen*0.6),
      'class': 'ct3arrow',
      stroke: color
    });
    svg.appendChild(shaft);
    svg.appendChild(head);

    var labelY = pointsToTop ? arrowY1 + 14 : arrowY1 - 6;
    var labelText = svgEl('text', {
      x: arrowX, y: labelY, 'class': 'ct3currlabel', 'text-anchor': 'middle',
      fill: color
    }, branch.label);
    svg.appendChild(labelText);
  }

  function drawDirectionPlaceholder(svg, branch, geom) {
    var x = geom.x - 22;
    var y = (geom.yMin + geom.yMax) / 2;
    var marker = svgEl('text', {
      x: x, y: y + 4, 'class': 'ct3currlabel', 'text-anchor': 'middle',
      fill: branch.color || '#7a8aaa'
    }, branch.label + ' = ?');
    svg.appendChild(marker);
  }

  function attachZoneHandlers(el, branch, side) {
    el.addEventListener('click', function(){ setDirectionFromClick(branch, side); });
    el.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setDirectionFromClick(branch, side); }
    });
  }

  function setDirectionFromClick(branch, side) {
    var info = layout();
    var geom = branchGeometry(branch, info);
    var clickedTowardEp = (side === 'top') ? geom.endpointSide.top : geom.endpointSide.bottom;
    var otherEp = (side === 'top') ? geom.endpointSide.bottom : geom.endpointSide.top;

    // Toggle: if the branch's current direction already points to the clicked side, unset.
    if (branch.direction && branch.toNode === clickedTowardEp) {
      branch.direction = null;
      branch.fromNode = null;
      branch.toNode = null;
      setFeedback('Direction cleared for ' + flatLabel(branch.label) + '.', 'info');
      announce('Direction cleared for ' + flatLabel(branch.label) + '.');
      refreshUI();
      return;
    }

    var dirWord = (side === 'top') ? 'upward' : 'downward';

    // For battery branches, validate against the conventional rule.
    // Conventional current flows OUT of the positive terminal externally,
    // which means WITHIN this branch it flows TOWARD the positive-side endpoint.
    if (branch.hasBattery && branch.correctToNode) {
      if (clickedTowardEp !== branch.correctToNode) {
        // Wrong direction. Don't apply it; explain why.
        var batLabel = branch.battery ? branch.battery.label : 'the battery';
        setFeedback(
          '<strong>Not the conventional direction.</strong> '
          + 'For a branch containing a battery (' + batLabel + '), conventional current flows '
          + 'OUT of the positive (long-plate) terminal externally, which means within this '
          + 'branch it flows toward the endpoint connected to the positive terminal. '
          + 'Try clicking the other half.',
          'bad');
        announce('Incorrect. Conventional current must flow out of the positive terminal of '
          + (branch.battery ? flatLabel(branch.battery.label) : 'the battery') + '.');
        return;
      }
      // Correct direction
      branch.direction = 'set';
      branch.fromNode = otherEp;
      branch.toNode = clickedTowardEp;
      setFeedback(
        '<strong>Correct \u2014 ' + flatLabel(branch.label) + ' set ' + dirWord + '.</strong> '
        + 'Conventional current flows out of the positive terminal of '
        + (branch.battery ? branch.battery.label : 'the battery') + '.',
        'good');
      announce(flatLabel(branch.label) + ' set ' + dirWord + '. Correct conventional direction.');
      refreshUI();
      return;
    }

    // Resistor-only branch: any direction is acceptable.
    branch.direction = 'set';
    branch.fromNode = otherEp;
    branch.toNode = clickedTowardEp;
    setFeedback(
      'Set ' + flatLabel(branch.label) + ' pointing ' + dirWord + '. '
      + '(For a resistor-only branch you\u2019re free to choose either direction; '
      + 'if your guess is wrong, the math in Stage 5 will produce a negative current.)',
      'good');
    announce(flatLabel(branch.label) + ' set ' + dirWord + '.');
    refreshUI();
  }

  function flatLabel(lab) {
    // Convert "I₁" -> "I 1" for narration
    return lab.replace(/[\u2080-\u2089]/g, function(ch){ return ' ' + (ch.charCodeAt(0) - 0x2080); });
  }

  /* =========================================================
     SIDE PANEL
  ========================================================= */
  function refreshUI() {
    render();
    updateBranchList();
    updateButtons();
    updateProgress();
  }

  function updateBranchList() {
    var div = document.getElementById('ct3List' + thisq);
    if (!div) return;
    if (S.branches.length === 0) {
      div.innerHTML = '<span style="color:#7a8aaa;font-style:italic;">No branches.</span>';
      return;
    }
    div.innerHTML = S.branches.map(function(b){
      var statusCls, statusText;
      if (b.direction) { statusCls = 'ct3statset'; statusText = 'Set'; }
      else { statusCls = 'ct3statunset'; statusText = 'Unset'; }
      var compLabels = b.comps.map(function(c){return c.label;}).join(', ');
      var note = b.hasBattery ? ' <span style="color:#7a8aaa;font-size:10px;">(battery)</span>' : '';
      return '<div class="ct3branch'+'">'
        + '<span class="ct3branchswatch'+'" style="background:'+b.color+';"></span>'
        + '<span class="ct3branchlabel'+'">'+b.label+': '+compLabels+note+'</span>'
        + '<span class="ct3branchstatus'+' '+statusCls+'">'+statusText+'</span>'
        + '</div>';
    }).join('');
  }

  function updateButtons() {
    var btn = document.getElementById('ct3BtnReset' + thisq);
    if (btn) btn.disabled = !S.branches.some(function(b){ return b.direction; });
  }

  function updateProgress() {
    var note = document.getElementById('ct3Prog' + thisq);
    if (!note) return;
    var unset = S.branches.filter(function(b){ return !b.direction; });
    if (unset.length === 0) {
      note.textContent = 'All ' + S.branches.length + ' branch currents assigned.';
      checkComplete();
    } else {
      note.textContent = unset.length + ' branch' + (unset.length===1?'':'es') + ' still need direction';
    }
  }

  function checkComplete() {
    var allSet = S.branches.length > 0 && S.branches.every(function(b){ return !!b.direction; });
    if (!allSet) return;
    var banner = document.getElementById('ct3Comp' + thisq);
    if (!banner) return;
    if (banner.classList.contains('ct3show')) return; // already shown
    banner.classList.add('ct3show');
    var msg = 'All branch currents assigned. Each resistor has a current direction; each battery branch follows the convention that current exits the positive terminal externally.';
    banner.innerHTML = ''
      + '<div class="ct3compmsg' + '">\u2713 ' + msg + '</div>'
      + '<button type="button" class="ct3btn' + ' ct3btnnext' + '" id="ct3BtnNext' + thisq + '">'
      + 'Continue to Stage 4 \u2192</button>';
    var nextBtn = document.getElementById('ct3BtnNext' + thisq);
    if (nextBtn) {
      nextBtn.addEventListener('click', function(){
        var ev = new CustomEvent('ctStageComplete', { detail:{ stage:3, thisq:thisq } });
        document.dispatchEvent(ev);
        var hook = window['ctOnStageComplete_' + thisq];
        if (typeof hook === 'function') hook(3);
        announce('Advancing to Stage 4: polarity assignment.');
      });
    }
    announce(msg);
  }

  function resetUserDirections() {
    S.branches.forEach(function(b){
      b.direction = null; b.fromNode = null; b.toNode = null;
    });
    var banner = document.getElementById('ct3Comp' + thisq);
    if (banner) banner.classList.remove('ct3show');
    setFeedback('All directions cleared.', 'info');
    announce('All directions cleared.');
    refreshUI();
  }

  function setFeedback(msg, tone) {
    var fb = document.getElementById('ct3Fb' + thisq);
    if (!fb) return;
    fb.className = 'ct3fb' + (tone === 'good' ? ' ct3fbgood' : tone === 'bad' ? ' ct3fbbad' : tone === 'info' ? ' ct3fbinfo' : '');
    fb.innerHTML = msg;
  }
  function announce(msg) {
    var live = document.getElementById('ct3Live' + thisq);
    var nar  = document.getElementById('ct3Nar' + thisq);
    if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
    if (nar && S.a11y.nr) nar.textContent = msg;
  }

  function fmt(v) {
    if (v == null) return '';
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return v.toFixed(2).replace(/\.?0+$/,'');
  }
  function describeCircuit() {
    return 'Simplified circuit with ' + S.branches.length + ' branches.';
  }

  /* =========================================================
     ACCESSIBILITY TOOLBAR
  ========================================================= */
  function applyA11y() {
    var root = document.getElementById(rootElId).querySelector('.ct3root');
    if (!root) return;
    root.classList.toggle('ct3lm', S.a11y.lm);
    root.classList.toggle('ct3hc', S.a11y.hc);
    var fontSizes = ['14px','16px','19px'];
    root.style.setProperty('--ct3fs', fontSizes[S.a11y.fs]);

    setBtn('ct3BtnLM', S.a11y.lm, 'LIGHT MODE');
    setBtn('ct3BtnNR', S.a11y.nr, 'NARRATION', true);
    setBtn('ct3BtnHC', S.a11y.hc, 'HIGH CONTRAST');
    setBtn('ct3BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);

    var nar = document.getElementById('ct3Nar' + thisq);
    if (nar) nar.classList.toggle('ct3narshow', S.a11y.nr);
  }
  function setBtn(idBase, on, label, withSuffix) {
    var b = document.getElementById(idBase + thisq);
    if (!b) return;
    b.classList.toggle('ct3a11yon', on);
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
     DOM
  ========================================================= */
  function buildDOM() {
    var root = document.getElementById(rootElId);
    var html = ''
      + '<div class="ct3root' + '" role="region" aria-label="Current direction tutorial">'
      + '  <div class="ct3a11y' + '" role="toolbar" aria-label="Display options">'
      + '    <button type="button" class="ct3a11ybtn' + '" id="ct3BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
      + '    <button type="button" class="ct3a11ybtn' + ' ct3a11yon' + '" id="ct3BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
      + '    <button type="button" class="ct3a11ybtn' + '" id="ct3BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
      + '    <button type="button" class="ct3a11ybtn' + '" id="ct3BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
      + '  </div>'
      + '  <div id="ct3Nar' + thisq + '" class="ct3narbar' + ' ct3narshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '  <h3 class="ct3title' + '">Stage 3: Current Directions</h3>'
      + '  <div class="ct3subtitle' + '">Assign a current direction to each branch. For branches with a battery, you must use the conventional direction (out of the positive terminal externally).</div>'
      + '  <div class="ct3stagebar' + '" role="navigation" aria-label="Tutorial stages">'
      + '    <span class="ct3pill' + ' ct3pilldone' + '">1. Simplify \u2713</span>'
      + '    <span class="ct3pill' + ' ct3pilldone' + '">2. Branches \u0026 Loops \u2713</span>'
      + '    <span class="ct3pill' + ' ct3pillactive' + '">3. Currents</span>'
      + '    <span class="ct3pill' + '">4. Polarities</span>'
      + '    <span class="ct3pill' + '">5. Equations</span>'
      + '  </div>'
      + '  <div class="ct3layout' + '">'
      + '    <div class="ct3canvasWrap' + thisq + '">'
      + '      <div class="ct3hint' + '">For each branch, click the half toward which the current should flow. For branches with a battery, the conventional direction is out of the positive (long-plate) terminal externally. Click the same half again to clear.</div>'
      + '      <svg class="ct3svg' + '" id="ct3Svg' + thisq + '" viewBox="0 0 540 320" role="img" aria-label="Simplified circuit"></svg>'
      + '      <div class="ct3complete' + '" id="ct3Comp' + thisq + '" role="status"></div>'
      + '    </div>'
      + '    <aside class="ct3side' + '">'
      + '      <div>'
      + '        <h2 class="ct3sideh' + '">Branch Currents</h2>'
      + '        <div class="ct3branchlist' + '" id="ct3List' + thisq + '" aria-live="polite"></div>'
      + '      </div>'
      + '      <div>'
      + '        <h2 class="ct3sideh' + '">Feedback</h2>'
      + '        <div class="ct3fb' + '" id="ct3Fb' + thisq + '">Click a branch (the half toward which the current should flow) to set its direction. Branches with a battery must follow the conventional direction.</div>'
      + '      </div>'
      + '      <div class="ct3btnrow' + '">'
      + '        <button type="button" class="ct3btn' + '" id="ct3BtnReset' + thisq + '" disabled>Clear All Directions</button>'
      + '      </div>'
      + '      <div class="ct3progress' + '" id="ct3Prog' + thisq + '"></div>'
      + '    </aside>'
      + '  </div>'
      + '  <span class="ct3sr' + '" id="ct3Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
      + '</div>';
    root.innerHTML = html;

    document.getElementById('ct3BtnReset' + thisq).addEventListener('click', resetUserDirections);
    document.getElementById('ct3BtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
    document.getElementById('ct3BtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
    document.getElementById('ct3BtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
    document.getElementById('ct3BtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
  }

  function buildErrorDOM(reason) {
    var root = document.getElementById(rootElId);
    root.innerHTML = ''
      + '<div class="ct3root' + '">'
      + '  <h3 class="ct3title' + '">Stage 3: Current Directions</h3>'
      + '  <div class="ct3error' + '">'
      + '    <strong>Cannot start Stage 3.</strong><br>' + reason
      + '  </div>'
      + '</div>';
  }

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    var res = loadFromPriorStages();
    if (!res.ok) {
      S.hasError = true;
      buildErrorDOM(res.reason);
      return;
    }
    S.hasError = false;
    buildDOM();
    applyA11y();
    refreshUI();

    var unsetCount = S.branches.filter(function(b){ return !b.direction; }).length;
    var batCount = S.branches.filter(function(b){ return b.hasBattery; }).length;
    var msg = 'Stage 3 ready. Choose a current direction for each of ' + S.branches.length + ' branches.';
    if (batCount > 0) {
      msg += ' ' + batCount + ' branch' + (batCount===1?'':'es') + ' contain a battery and must use the conventional direction (out of the positive terminal).';
    }
    announce(msg);
  }

  function reload() {
    // Clear current state and re-init
    S.branches = [];
    S.circuit = null;
    S.hasError = false;
    init();
  }

  // Listen for Stage 2's completion to refresh
  document.addEventListener('ctStageComplete', function(e){
    if (e.detail && e.detail.stage === 2 && e.detail.thisq === thisq) {
      setTimeout(reload, 0);
    }
  });

  if (document.getElementById(rootElId)) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
