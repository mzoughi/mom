(function(){
  'use strict';

  var thisq = window.ctThisq;
  var rootElId = 'ct4Root' + thisq;
  var stateKey = 'ctState4_' + thisq;

  /* =========================================================
     STATE
  ========================================================= */
  if (!window[stateKey]) {
    window[stateKey] = {
      a11y: { lm:false, nr:true, hc:false, fs:0 },
      circuit: null,
      branches: null,        // copy of Stage 3's branches with directions
      // For each resistor: { id, label, branchIdx, correctHV, userHV, color }
      // correctHV = node name of the high-V end (computed from current direction)
      // userHV    = node name the user clicked (or null if unset)
      resistors: [],
      hasError: false,
      hasShownBatteryNote: false  // Hint pedagogy: "for batteries, polarity is built-in"
    };
  }
  var S = window[stateKey];

  /* =========================================================
     INIT FROM PRIOR STAGES
  ========================================================= */
  function loadFromPriorStages() {
    var s1 = window['ctState_' + thisq];
    var s3 = window['ctState3_' + thisq];

    if (!(s1 && s1.circuit && s1.circuit.components && s1.circuit.components.length > 0)) {
      return { ok:false, reason:'Stage 1 has not been completed yet.' };
    }
    if (!(s3 && s3.branches && s3.branches.length > 0)) {
      return { ok:false, reason:'Complete Stage 3 first \u2014 each branch needs a current direction before resistor polarities can be marked.' };
    }
    var allDirected = s3.branches.every(function(b){ return b.direction === 'set' && b.fromNode && b.toNode; });
    if (!allDirected) {
      return { ok:false, reason:'Complete Stage 3 first \u2014 some branches still need a current direction.' };
    }

    S.circuit = {
      components: s1.circuit.components.map(function(c){ return Object.assign({}, c); })
    };
    S.branches = s3.branches.map(function(b){
      return {
        id: b.id, label: b.label, color: b.color,
        ids: new Set(b.ids),
        comps: S.circuit.components.filter(function(c){ return b.ids.has(c.id); }),
        fromNode: b.fromNode, toNode: b.toNode,
        endpoints: b.endpoints
      };
    });

    // Build the resistors list, computing the correct high-V terminal for each
    S.resistors = [];
    S.branches.forEach(function(branch, bIdx){
      var path = orderBranchPath(branch.comps, branch.fromNode, branch.toNode);
      if (!path) return;
      branch.comps.forEach(function(c){
        if (c.kind !== 'resistor') return;
        var step = path.find(function(s){ return s.comp.id === c.id; });
        if (!step) return;
        S.resistors.push({
          id: c.id,
          label: c.label,
          branchIdx: bIdx,
          color: branch.color,
          correctHV: step.enterNode,
          userHV: null
        });
      });
    });
    return { ok:true };
  }

  // Walk a branch from fromNode to toNode, returning the ordered list of components
  function orderBranchPath(comps, fromNode, toNode) {
    var visited = new Set();
    var path = [];
    var cur = fromNode;
    while (cur !== toNode) {
      var next = null;
      for (var i=0; i<comps.length; i++) {
        var c = comps[i];
        if (visited.has(c.id)) continue;
        if (c.a === cur || c.b === cur) { next = c; break; }
      }
      if (!next) return null;
      visited.add(next.id);
      var exitNode = (next.a === cur) ? next.b : next.a;
      path.push({ comp: next, enterNode: cur, exitNode: exitNode });
      cur = exitNode;
    }
    return path;
  }

  /* =========================================================
     LAYOUT (slot-based, identical to prior stages)
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

  /* For each branch, compute geometry (used for current arrows) and
     for each resistor, the click zones at top half / bottom half. */
  function branchGeometry(branch, info) {
    var L = info.L;
    var firstComp = branch.comps[0];
    var col = firstComp.col;
    var x = info.x[col];
    var yMin = L.railTop, yMax = L.railBot;
    var mid = (yMin + yMax) / 2;
    return {
      x:x, yMin:yMin, yMax:yMax,
      endpointSide: endpointSideForVertical(branch)
    };
  }
  function endpointSideForVertical(branch) {
    var rowZeroComps = branch.comps.filter(function(c){ return c.row === 0; });
    var topEp = null, bottomEp = null;
    branch.endpoints.forEach(function(ep){
      var onRow0 = rowZeroComps.some(function(c){ return c.a === ep || c.b === ep; });
      if (onRow0) topEp = ep;
      else bottomEp = ep;
    });
    if (!topEp || !bottomEp) {
      branch.endpoints.forEach(function(ep){
        if (/^nT/.test(ep)) topEp = ep;
        else bottomEp = ep;
      });
    }
    return { top: topEp || branch.endpoints[0], bottom: bottomEp || branch.endpoints[1] };
  }

  /* For a resistor body, determine click zones for its two terminals. */
  function resistorTerminalZones(comp, info) {
    var L = info.L;
    var x = info.x[comp.col];
    var yr = effectiveYRange(comp, info);
    var bodyW = 22, bodyH = 60;
    var bodyX = x - bodyW/2;
    var bodyY = (yr.yTop + yr.yBot)/2 - bodyH/2;

    // Upper zone covers from yr.yTop down to the body midpoint.
    // Lower zone covers from body midpoint to yr.yBot.
    var midY = bodyY + bodyH/2;
    return {
      upper: { x: bodyX - 8, y: yr.yTop, w: bodyW + 16, h: midY - yr.yTop },
      lower: { x: bodyX - 8, y: midY, w: bodyW + 16, h: yr.yBot - midY },
      // Map "upper" / "lower" to actual node names. The terminal at yr.yTop
      // corresponds to one of comp.a/comp.b; we need to pick correctly.
      upperNode: nodeAtY(comp, 'top', info),
      lowerNode: nodeAtY(comp, 'bottom', info),
      bodyX: bodyX, bodyY: bodyY, bodyW: bodyW, bodyH: bodyH
    };
  }

  /* Determine which node is at the top vs bottom of a vertical resistor. */
  function nodeAtY(comp, which, info) {
    // For our ladder, resistors in row 0 have c.a or c.b on the top rail (nT).
    // Resistors in row 1 have a node on the bottom rail (nB) at the bottom.
    // For a single-row component (occupying both row slots), one terminal is at
    // top rail and the other at bottom rail.
    //
    // Simplest reliable rule for Example 1:
    //   - top rail node names start with 'nT'
    //   - bottom rail node names: 'nB' (without trailing digits) or anything else.
    //   - mid-column node names like 'nA1', 'nB1' etc are mid-rail for two-row branches.
    //
    // For row 0: top is the rail node, bottom is the mid node.
    // For row 1: top is the mid node, bottom is the rail node.
    // For a component spanning both rows: top is whichever node sounds like 'nT*',
    //   bottom is the other.
    var rows = {};
    info.cols[comp.col].forEach(function(c){ rows[c.row] = true; });
    var spansBothRows = (Object.keys(rows).length === 1);

    if (spansBothRows) {
      if (/^nT/.test(comp.a)) return which === 'top' ? comp.a : comp.b;
      if (/^nT/.test(comp.b)) return which === 'top' ? comp.b : comp.a;
      // fallback
      return which === 'top' ? comp.a : comp.b;
    }
    if (comp.row === 0) {
      // top = rail node (nT*), bottom = mid node
      var topNode = /^nT/.test(comp.a) ? comp.a : comp.b;
      var botNode = (topNode === comp.a) ? comp.b : comp.a;
      return which === 'top' ? topNode : botNode;
    }
    // row 1: top = mid node, bottom = rail node (nB*)
    var botNode2 = /^nB(?!1|2|3|4)/.test(comp.a) ? comp.a : (/^nB(?!1|2|3|4)/.test(comp.b) ? comp.b : null);
    if (!botNode2) {
      // Fallback: just say c.b is bottom for row 1
      botNode2 = comp.b;
    }
    var topNode2 = (botNode2 === comp.a) ? comp.b : comp.a;
    return which === 'top' ? topNode2 : botNode2;
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
    var svg = document.getElementById('ct4Svg' + thisq);
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    t.textContent = 'Simplified circuit with currents and resistor polarities';
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    d.textContent = describeCircuit();
    svg.appendChild(t); svg.appendChild(d);

    var info = layout();
    if (!info) return;
    var L = info.L;

    // Rails
    svg.appendChild(svgEl('line', {x1:L.padX-10, y1:L.railTop, x2:L.width-L.padX+10, y2:L.railTop, 'class':'ct4wire'}));
    svg.appendChild(svgEl('line', {x1:L.padX-10, y1:L.railBot, x2:L.width-L.padX+10, y2:L.railBot, 'class':'ct4wire'}));

    info.colKeys.forEach(function(col){
      var x = info.x[col];
      var colComps = info.cols[col];
      colComps.sort(function(a,b){return a.row-b.row;});
      colComps.forEach(function(c){
        var yr = effectiveYRange(c, info);
        drawComponent(svg, c, x, yr.yTop, yr.yBot);
      });
      var rows = {};
      colComps.forEach(function(c){ if(!rows[c.row]) rows[c.row]=[]; rows[c.row].push(c); });
      var rowKeys = Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
      if (rowKeys.length === 2) {
        var r0 = rows[0][0], r1 = rows[1][0];
        var y0r = effectiveYRange(r0, info), y1r = effectiveYRange(r1, info);
        if (rows[0].length === 1 && rows[1].length === 1) {
          svg.appendChild(svgEl('line', {x1:x, y1:y0r.yBot, x2:x, y2:y1r.yTop, 'class':'ct4wire'}));
        }
      }
    });

    // Draw current arrows from Stage 3 (carryover)
    S.branches.forEach(function(b){ drawCurrentArrow(svg, b, info); });

    // Draw resistor click zones + + symbols
    S.resistors.forEach(function(r){ drawResistorOverlay(svg, r, info); });
  }

  function drawComponent(svg, c, xCenter, yTop, yBot) {
    if (c.kind === 'battery') drawBattery(svg, c, xCenter, yTop, yBot);
    else drawResistor(svg, c, xCenter, yTop, yBot);
  }
  function drawResistor(svg, c, xCenter, yTop, yBot) {
    var bodyW = 22, bodyH = 60;
    var bodyX = xCenter - bodyW/2;
    var bodyY = (yTop + yBot)/2 - bodyH/2;
    svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:bodyY, 'class':'ct4wire'}));
    svg.appendChild(svgEl('line',{x1:xCenter, y1:bodyY+bodyH, x2:xCenter, y2:yBot, 'class':'ct4wire'}));
    svg.appendChild(svgEl('rect', {
      x:bodyX, y:bodyY, width:bodyW, height:bodyH, rx:3, ry:3,
      'class':'ct4comp'
    }));
    var labelX = bodyX + bodyW + 8;
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 - 2, 'class':'ct4label', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text', {x:labelX, y:bodyY + bodyH/2 + 14, 'class':'ct4val', 'text-anchor':'start'}, fmt(c.value) + ' \u03a9'));
  }
  function drawBattery(svg, c, xCenter, yTop, yBot) {
    var midY = (yTop + yBot) / 2;
    var aIsTop = /^nT/.test(c.a);
    var longLen = 30, shortLen = 16;
    if (aIsTop) {
      svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:midY-3, 'class':'ct4wire'}));
      svg.appendChild(svgEl('line',{x1:xCenter-longLen/2, y1:midY-3, x2:xCenter+longLen/2, y2:midY-3, 'class':'ct4wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter-shortLen/2, y1:midY+5, x2:xCenter+shortLen/2, y2:midY+5, 'class':'ct4wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter, y1:midY+5, x2:xCenter, y2:yBot, 'class':'ct4wire'}));
    } else {
      svg.appendChild(svgEl('line',{x1:xCenter, y1:yTop, x2:xCenter, y2:midY-5, 'class':'ct4wire'}));
      svg.appendChild(svgEl('line',{x1:xCenter-shortLen/2, y1:midY-5, x2:xCenter+shortLen/2, y2:midY-5, 'class':'ct4wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter-longLen/2, y1:midY+3, x2:xCenter+longLen/2, y2:midY+3, 'class':'ct4wire', 'stroke-width':2.5}));
      svg.appendChild(svgEl('line',{x1:xCenter, y1:midY+3, x2:xCenter, y2:yBot, 'class':'ct4wire'}));
    }
    var labelX = xCenter + longLen/2 + 8;
    svg.appendChild(svgEl('text',{x:labelX, y:midY-2, 'class':'ct4label', 'text-anchor':'start'}, c.label));
    svg.appendChild(svgEl('text',{x:labelX, y:midY+14, 'class':'ct4val', 'text-anchor':'start'}, c.value + ' V'));
  }

  function drawCurrentArrow(svg, branch, info) {
    var geom = branchGeometry(branch, info);
    var L = info.L;
    var pointsToTop = (branch.toNode === geom.endpointSide.top);
    var x = geom.x;
    var arrowX = x - 22;
    var mid = (L.railTop + L.railBot) / 2;
    var headLen = 7, headHalfW = 5;
    var shaftLen = 36;
    var arrowY1, arrowY2;
    if (pointsToTop) { arrowY1 = mid + shaftLen/2; arrowY2 = mid - shaftLen/2; }
    else             { arrowY1 = mid - shaftLen/2; arrowY2 = mid + shaftLen/2; }
    var color = branch.color || '#00d4ff';
    var head = svgEl('polygon', {
      points: arrowX+','+arrowY2+' '+(arrowX-headHalfW)+','+(arrowY2+(pointsToTop?headLen:-headLen))+' '+(arrowX+headHalfW)+','+(arrowY2+(pointsToTop?headLen:-headLen)),
      'class': 'ct4arrowhead', fill: color
    });
    var shaft = svgEl('line', {
      x1: arrowX, y1: arrowY1, x2: arrowX, y2: arrowY2 + (pointsToTop?headLen*0.6:-headLen*0.6),
      'class': 'ct4arrow', stroke: color
    });
    svg.appendChild(shaft); svg.appendChild(head);
    var labelY = pointsToTop ? arrowY1 + 14 : arrowY1 - 6;
    svg.appendChild(svgEl('text', {
      x: arrowX, y: labelY, 'class': 'ct4currlabel', 'text-anchor': 'middle', fill: color
    }, branch.label));
  }

  function drawResistorOverlay(svg, rEntry, info) {
    var comp = S.circuit.components.find(function(c){ return c.id === rEntry.id; });
    if (!comp) return;
    var zones = resistorTerminalZones(comp, info);

    // Upper click zone
    var upper = svgEl('rect', {
      x: zones.upper.x, y: zones.upper.y, width: zones.upper.w, height: zones.upper.h,
      'class': 'ct4zone',
      tabindex: 0, role: 'button',
      'data-rid': rEntry.id, 'data-which': 'upper',
      'aria-label': 'Mark top end of ' + comp.label + ' as high voltage'
    });
    attachZoneHandlers(upper, rEntry, 'upper');
    svg.appendChild(upper);

    var lower = svgEl('rect', {
      x: zones.lower.x, y: zones.lower.y, width: zones.lower.w, height: zones.lower.h,
      'class': 'ct4zone',
      tabindex: 0, role: 'button',
      'data-rid': rEntry.id, 'data-which': 'lower',
      'aria-label': 'Mark bottom end of ' + comp.label + ' as high voltage'
    });
    attachZoneHandlers(lower, rEntry, 'lower');
    svg.appendChild(lower);

    // Draw "+" if userHV is set (and correct)
    if (rEntry.userHV) {
      var plusY;
      var plusX = zones.bodyX + zones.bodyW + 28; // to the right of label
      // Find which side of the body the user marked
      var atTop = (rEntry.userHV === zones.upperNode);
      if (atTop) {
        plusY = zones.bodyY - 4;
      } else {
        plusY = zones.bodyY + zones.bodyH + 14;
      }
      // Place the + symbol on the wire-side of the resistor body, near the marked terminal
      var bodyCenterX = zones.bodyX + zones.bodyW / 2;
      var symX = zones.bodyX - 12; // to the LEFT of the body so it doesn't collide with labels
      var symY = atTop ? (zones.bodyY + 4) : (zones.bodyY + zones.bodyH - 4);
      // Use fontsize 18 baseline; nudge so it sits next to the terminal lead
      svg.appendChild(svgEl('text', {
        x: symX, y: symY, 'class': 'ct4plus'
      }, '+'));
    }
  }

  function attachZoneHandlers(el, rEntry, which) {
    el.addEventListener('click', function(){ markHighV(rEntry, which); });
    el.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        markHighV(rEntry, which);
      }
    });
  }

  /* =========================================================
     CLICK HANDLER
  ========================================================= */
  function markHighV(rEntry, which) {
    var comp = S.circuit.components.find(function(c){ return c.id === rEntry.id; });
    var info = layout();
    var zones = resistorTerminalZones(comp, info);
    var clickedNode = (which === 'upper') ? zones.upperNode : zones.lowerNode;

    // Toggle: if user clicks the same end again, clear.
    if (rEntry.userHV === clickedNode) {
      rEntry.userHV = null;
      setFeedback('Polarity cleared for ' + comp.label + '.', 'info');
      announce('Polarity cleared for ' + comp.label + '.');
      refreshUI();
      return;
    }

    if (clickedNode !== rEntry.correctHV) {
      // Wrong end. Don't apply.
      var branch = S.branches[rEntry.branchIdx];
      setFeedback(
        '<strong>Not the high-voltage end.</strong> '
        + 'In ' + comp.label + ', conventional current enters from the '
        + (rEntry.correctHV === zones.upperNode ? 'top' : 'bottom')
        + ' (where ' + branch.label + ' flows in). The terminal where current ENTERS '
        + 'the resistor is at higher potential. Try clicking the other end.',
        'bad');
      announce('Incorrect. The high-voltage end is where current enters the resistor.');
      return;
    }

    // Correct
    rEntry.userHV = clickedNode;
    var sideWord = (which === 'upper') ? 'top' : 'bottom';
    setFeedback(
      '<strong>Correct \u2014 ' + comp.label + ' high-V end is at the ' + sideWord + '.</strong> '
      + 'Conventional current enters here, so this terminal is at higher potential. '
      + 'Through a resistor, V drops in the direction of current flow (V = IR).',
      'good');
    announce(comp.label + ' high-V end set at the ' + sideWord + '.');
    refreshUI();
  }

  /* =========================================================
     UI
  ========================================================= */
  function refreshUI() {
    render();
    updateList();
    updateButtons();
    updateProgress();
  }

  function updateList() {
    var div = document.getElementById('ct4List' + thisq);
    if (!div) return;
    if (S.resistors.length === 0) {
      div.innerHTML = '<span style="color:#7a8aaa;font-style:italic;">No resistors.</span>';
      return;
    }
    div.innerHTML = S.resistors.map(function(r){
      var statusCls = r.userHV ? 'ct4statset' : 'ct4statunset';
      var statusText = r.userHV ? 'Marked' : 'Unset';
      return '<div class="ct4item'+'">'
        + '<span class="ct4itemlabel'+'">'+r.label+'</span>'
        + '<span class="ct4itemstatus'+' '+statusCls+'">'+statusText+'</span>'
        + '</div>';
    }).join('');
  }
  function updateButtons() {
    var btn = document.getElementById('ct4BtnReset' + thisq);
    if (btn) btn.disabled = !S.resistors.some(function(r){ return r.userHV; });
  }
  function updateProgress() {
    var note = document.getElementById('ct4Prog' + thisq);
    if (!note) return;
    var unset = S.resistors.filter(function(r){ return !r.userHV; });
    if (unset.length === 0) {
      note.textContent = 'All ' + S.resistors.length + ' resistor polarities marked.';
      checkComplete();
    } else {
      note.textContent = unset.length + ' resistor' + (unset.length===1?'':'s') + ' still unmarked';
    }
  }

  function checkComplete() {
    var allSet = S.resistors.length > 0 && S.resistors.every(function(r){ return !!r.userHV; });
    if (!allSet) return;
    var banner = document.getElementById('ct4Comp' + thisq);
    if (!banner) return;
    if (banner.classList.contains('ct4show')) return;
    banner.classList.add('ct4show');
    var msg = 'All resistor polarities marked. The high-voltage end of each resistor is where its branch current enters. (Battery polarities are inherent: the long plate is the positive terminal.)';
    banner.innerHTML = ''
      + '<div class="ct4compmsg' + '">\u2713 ' + msg + '</div>'
      + '<button type="button" class="ct4btn' + ' ct4btnnext' + '" id="ct4BtnNext' + thisq + '">'
      + 'Continue to Stage 5 \u2192</button>';
    var nextBtn = document.getElementById('ct4BtnNext' + thisq);
    if (nextBtn) {
      nextBtn.addEventListener('click', function(){
        var ev = new CustomEvent('ctStageComplete', { detail:{ stage:4, thisq:thisq } });
        document.dispatchEvent(ev);
        var hook = window['ctOnStageComplete_' + thisq];
        if (typeof hook === 'function') hook(4);
        announce('Advancing to Stage 5: writing equations.');
      });
    }
    announce(msg);
  }

  function resetMarkings() {
    S.resistors.forEach(function(r){ r.userHV = null; });
    var banner = document.getElementById('ct4Comp' + thisq);
    if (banner) banner.classList.remove('ct4show');
    setFeedback('All polarity marks cleared.', 'info');
    announce('All polarity marks cleared.');
    refreshUI();
  }

  function setFeedback(msg, tone) {
    var fb = document.getElementById('ct4Fb' + thisq);
    if (!fb) return;
    fb.className = 'ct4fb' + (tone === 'good' ? ' ct4fbgood' : tone === 'bad' ? ' ct4fbbad' : tone === 'info' ? ' ct4fbinfo' : '');
    fb.innerHTML = msg;
  }
  function announce(msg) {
    var live = document.getElementById('ct4Live' + thisq);
    var nar  = document.getElementById('ct4Nar' + thisq);
    if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
    if (nar && S.a11y.nr) nar.textContent = msg;
  }

  function fmt(v) {
    if (v == null) return '';
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    return v.toFixed(2).replace(/\.?0+$/,'');
  }
  function describeCircuit() {
    return S.circuit.components.length + ' components, ' + S.resistors.length + ' resistors to mark.';
  }

  /* =========================================================
     ACCESSIBILITY
  ========================================================= */
  function applyA11y() {
    var root = document.getElementById(rootElId).querySelector('.ct4root');
    if (!root) return;
    root.classList.toggle('ct4lm', S.a11y.lm);
    root.classList.toggle('ct4hc', S.a11y.hc);
    var fontSizes = ['14px','16px','19px'];
    root.style.setProperty('--ct4fs', fontSizes[S.a11y.fs]);
    setBtn('ct4BtnLM', S.a11y.lm, 'LIGHT MODE');
    setBtn('ct4BtnNR', S.a11y.nr, 'NARRATION', true);
    setBtn('ct4BtnHC', S.a11y.hc, 'HIGH CONTRAST');
    setBtn('ct4BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
    var nar = document.getElementById('ct4Nar' + thisq);
    if (nar) nar.classList.toggle('ct4narshow', S.a11y.nr);
  }
  function setBtn(idBase, on, label, withSuffix) {
    var b = document.getElementById(idBase + thisq);
    if (!b) return;
    b.classList.toggle('ct4a11yon', on);
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
      + '<div class="ct4root' + '" role="region" aria-label="Resistor polarity tutorial">'
      + '  <div class="ct4a11y' + '" role="toolbar" aria-label="Display options">'
      + '    <button type="button" class="ct4a11ybtn' + '" id="ct4BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
      + '    <button type="button" class="ct4a11ybtn' + ' ct4a11yon' + '" id="ct4BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
      + '    <button type="button" class="ct4a11ybtn' + '" id="ct4BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
      + '    <button type="button" class="ct4a11ybtn' + '" id="ct4BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
      + '  </div>'
      + '  <div id="ct4Nar' + thisq + '" class="ct4narbar' + ' ct4narshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
      + '  <h3 class="ct4title' + '">Stage 4: Resistor Polarities</h3>'
      + '  <div class="ct4subtitle' + '">Mark the high-voltage end of each resistor by clicking the terminal where the current enters. Battery polarities are already shown by the long (+) and short (\u2212) plates.</div>'
      + '  <div class="ct4stagebar' + '" role="navigation" aria-label="Tutorial stages">'
      + '    <span class="ct4pill' + ' ct4pilldone' + '">1. Simplify \u2713</span>'
      + '    <span class="ct4pill' + ' ct4pilldone' + '">2. Branches \u0026 Loops \u2713</span>'
      + '    <span class="ct4pill' + ' ct4pilldone' + '">3. Currents \u2713</span>'
      + '    <span class="ct4pill' + ' ct4pillactive' + '">4. Polarities</span>'
      + '    <span class="ct4pill' + '">5. Equations</span>'
      + '  </div>'
      + '  <div class="ct4layout' + '">'
      + '    <div class="ct4canvasWrap' + thisq + '">'
      + '      <div class="ct4hint' + '">For each resistor, click the half where the branch current enters \u2014 that is the high-voltage end. Click the same end again to clear.</div>'
      + '      <svg class="ct4svg' + '" id="ct4Svg' + thisq + '" viewBox="0 0 540 320" role="img" aria-label="Simplified circuit"></svg>'
      + '      <div class="ct4complete' + '" id="ct4Comp' + thisq + '" role="status"></div>'
      + '    </div>'
      + '    <aside class="ct4side' + '">'
      + '      <div>'
      + '        <h2 class="ct4sideh' + '">Resistors</h2>'
      + '        <div class="ct4list' + '" id="ct4List' + thisq + '" aria-live="polite"></div>'
      + '      </div>'
      + '      <div>'
      + '        <h2 class="ct4sideh' + '">Feedback</h2>'
      + '        <div class="ct4fb' + '" id="ct4Fb' + thisq + '">Click the half of a resistor where the branch current enters to mark it as the high-voltage (+) end.</div>'
      + '      </div>'
      + '      <div class="ct4btnrow' + '">'
      + '        <button type="button" class="ct4btn' + '" id="ct4BtnReset' + thisq + '" disabled>Clear All Marks</button>'
      + '      </div>'
      + '      <div class="ct4progress' + '" id="ct4Prog' + thisq + '"></div>'
      + '    </aside>'
      + '  </div>'
      + '  <span class="ct4sr' + '" id="ct4Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
      + '</div>';
    root.innerHTML = html;

    document.getElementById('ct4BtnReset' + thisq).addEventListener('click', resetMarkings);
    document.getElementById('ct4BtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
    document.getElementById('ct4BtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
    document.getElementById('ct4BtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
    document.getElementById('ct4BtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
  }

  function buildErrorDOM(reason) {
    var root = document.getElementById(rootElId);
    root.innerHTML = ''
      + '<div class="ct4root' + '">'
      + '  <h3 class="ct4title' + '">Stage 4: Resistor Polarities</h3>'
      + '  <div class="ct4error' + '">'
      + '    <strong>Cannot start Stage 4.</strong><br>' + reason
      + '  </div>'
      + '</div>';
  }

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    var res = loadFromPriorStages();
    if (!res.ok) { S.hasError = true; buildErrorDOM(res.reason); return; }
    S.hasError = false;
    buildDOM();
    applyA11y();
    refreshUI();
    var msg = 'Stage 4 ready. Mark the high-voltage end of each of the ' + S.resistors.length + ' resistor' + (S.resistors.length===1?'':'s') + '. The high-V end is where current enters the resistor.';
    announce(msg);
  }

  function reload() {
    S.resistors = []; S.branches = null; S.circuit = null; S.hasError = false;
    init();
  }

  document.addEventListener('ctStageComplete', function(e){
    if (e.detail && e.detail.stage === 3 && e.detail.thisq === thisq) {
      setTimeout(reload, 0);
    }
  });

  if (document.getElementById(rootElId)) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
