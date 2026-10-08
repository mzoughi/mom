/* =====================================================================
   NEWTON'S SECOND LAW TUTORIAL — SHARED CORE  (newton-tut-core.js)
   Loaded once per page, before the four stage files.
   Provides: force catalog, the five situations, scene drawings,
   SVG helpers, shared per-question state and accessibility helpers.
   ===================================================================== */
(function(){
'use strict';
if (window.NTCore) return;          /* already loaded by another question */
var NT = {};

/* ---------------------------------------------------------------------
   FORCE CATALOG  (key -> symbol). real:false = misconception distractor
   --------------------------------------------------------------------- */
NT.FORCES = {
  grav:   { sym:'F', sub:'g',   name:'Gravitational force (weight)', real:true },
  norm:   { sym:'F', sub:'N',   name:'Normal force',                 real:true },
  fric:   { sym:'F', sub:'f',   name:'Friction force',               real:true },
  ten:    { sym:'F', sub:'T',   name:'Tension',                      real:true },
  app:    { sym:'F', sub:'A',   name:'Applied force (push or pull)', real:true },
  drag:   { sym:'F', sub:'D',   name:'Air resistance (drag)',        real:true },
  cent:   { sym:'F', sub:'c',   name:'Centripetal force',            real:false,
            why:'There is no separate centripetal force. \u201CCentripetal\u201D names the inward part of the net force, which is supplied by the real forces (gravity, tension, normal, friction\u2026).' },
  net:    { sym:'F', sub:'net', name:'Net force',                    real:false,
            why:'The net force is the vector sum of the real forces, not one more force acting on the object. Listing it would count every force twice.' },
  motion: { sym:'F', sub:'mot', name:'Force of motion',              real:false,
            why:'A moving object does not carry a \u201Cforce of motion\u201D. Objects keep moving without any force (Newton\u2019s first law); a force needs an agent that pushes or pulls.' }
};
NT.FORCE_ORDER = ['grav','norm','fric','ten','app','drag','cent','net','motion'];

NT.AGENTS = [
  { id:'earth',   t:'Earth' },
  { id:'surface', t:'The surface it touches' },
  { id:'rope',    t:'A rope or string' },
  { id:'person',  t:'A person (hands)' },
  { id:'air',     t:'The air' },
  { id:'self',    t:'The object itself' }
];
NT.agentText = function(id){
  for (var i=0;i<NT.AGENTS.length;i++) if (NT.AGENTS[i].id===id) return NT.AGENTS[i].t;
  return '';
};

/* Right-hand sides used in Stage 4 */
NT.RHS = {
  '0':     { t:'0',          h:'0' },
  '+ma':   { t:'m a',        h:'<i>m a</i>' },
  '-ma':   { t:'\u2212m a',  h:'\u2212<i>m a</i>' },
  '+mg':   { t:'m g',        h:'<i>m g</i>' },
  '+mv2L': { t:'m v\u00B2/L',       h:'<i>m v</i><sup>2</sup>/<i>L</i>' },
  '-mv2L': { t:'\u2212m v\u00B2/L', h:'\u2212<i>m v</i><sup>2</sup>/<i>L</i>' },
  '+mv2R': { t:'m v\u00B2/R',       h:'<i>m v</i><sup>2</sup>/<i>R</i>' },
  '-mv2R': { t:'\u2212m v\u00B2/R', h:'\u2212<i>m v</i><sup>2</sup>/<i>R</i>' },
  '+mat':  { t:'m a_t',       h:'<i>m a</i><sub>t</sub>' },
  '-mat':  { t:'\u2212m a_t', h:'\u2212<i>m a</i><sub>t</sub>' }
};

/* ---------------------------------------------------------------------
   THE FIVE SITUATIONS (simple -> complex)
   forces[].slot   : internal id used by every stage
   forces[].keys   : acceptable catalog keys (first = default label)
   forces[].agents : acceptable agents
   forces[].dir    : direction in degrees from +x (y up) for the FBD
   comp codes      : '0' | '+' | '-' | '+c0' '-s1' ... (sign, cos/sin, angle index)
   --------------------------------------------------------------------- */
NT.SITS = [
/* 1 ---------------------------------------------------------------- */
{
  id:'fall', tab:'Falling ball', title:'A ball falling with air resistance',
  desc:'A ball of mass <i>m</i> has been dropped and is falling straight down. It is still speeding up: it has <b>not</b> reached terminal speed yet. Ignore buoyancy.',
  aria:'Scene: a ball in mid-air with a dashed velocity arrow pointing straight down. Faint streaks above the ball show it is moving downward through the air.',
  forces:[
    { slot:'g', keys:['grav'], agents:['earth'], dir:270, tip:'Gravity always points straight down (270\u00B0).' },
    { slot:'d', keys:['drag'], agents:['air'],   dir:90,  tip:'Drag opposes the velocity. The ball moves down, so drag points straight up (90\u00B0).' }
  ],
  absent:{
    norm:'Nothing solid touches the ball, so there is no normal force.',
    fric:'Friction needs a solid surface sliding (or trying to slide) against the object. The force from the air is air resistance.',
    app:'No one is pushing or pulling the ball now. Once the hand let go, that force ended: forces do not stay with an object after contact stops.',
    ten:'No rope or string is attached to the ball.'
  },
  wrap1:'Two forces: Earth pulls the ball down (a long-range force), and the air pushes up against the motion (a contact force). Nothing else touches the ball.',
  accel:{ correct:'down', rhs:'ma',
    opts:[ {id:'down',t:'Downward'}, {id:'up',t:'Upward, the direction of the drag force'}, {id:'zero',t:'Zero'} ],
    fb:{ up:'The ball speeds up while moving down, so its velocity changes in the downward direction: a\u20D7 points down.',
         zero:'The acceleration is zero only at terminal speed. This ball is still speeding up.' } },
  distract:['neg:d','mag:g','ma','net'],
  wrap2:'Each vector carries its own direction, so the vector equation uses only plus signs. Signs appear later, when you resolve the vectors into components.',
  axes:{ correct:'v',
    opts:[ {id:'v', t:'y-axis vertical, pointing up'},
           {id:'tilt', t:'x and y axes tilted 45\u00B0 from vertical', fb:'Then both forces would have two components each \u2014 extra work for nothing. Put an axis along the line of motion.'} ],
    dirs:[ {n:'x',d:0}, {n:'y',d:90} ], marks:[] },
  angles:{ g:[], d:[] },
  comps:[
    { axis:'y', terms:{ g:'-', d:'+' }, rhsOpts:['0','+ma','-ma','+mg'], rhs:'-ma',
      rfb:{ '+ma':'The acceleration points down, which is the \u2212y direction here, so a<sub>y</sub> = \u2212a.',
            '0':'The forces balance only at terminal speed. This ball is still speeding up.',
            '+mg':'<i>m g</i> is the weight, which is already on the left as F<sub>g</sub>. The right side is mass times acceleration.' } }
  ],
  wrap4:'{d} \u2212 {g} = \u2212<i>m a</i>, so <i>a</i> = <i>g</i> \u2212 F<sub>D</sub>/<i>m</i>: drag makes the acceleration smaller than <i>g</i>. As the ball speeds up, drag grows until F<sub>D</sub> = F<sub>g</sub> and <i>a</i> = 0 (terminal speed).'
},
/* 2 ---------------------------------------------------------------- */
{
  id:'drag', tab:'Dragged crate', title:'A crate dragged by a rope at an angle',
  desc:'A person drags a crate of mass <i>m</i> across a rough, horizontal floor by pulling on a rope at <i>\u03B8</i> = 30\u00B0 above the horizontal. The crate slides to the right and is <b>speeding up</b>.',
  aria:'Scene: a crate on a rough horizontal floor. A rope is attached to its right side and rises up and to the right at an angle theta of 30 degrees above a dashed horizontal reference line. A dashed velocity arrow above the crate points to the right.',
  forces:[
    { slot:'g', keys:['grav'],       agents:['earth'],          dir:270, tip:'Gravity points straight down (270\u00B0).' },
    { slot:'n', keys:['norm'],       agents:['surface'],        dir:90,  tip:'The normal force is perpendicular to the floor: straight up (90\u00B0).' },
    { slot:'f', keys:['fric'],       agents:['surface'],        dir:180, tip:'Kinetic friction opposes the sliding. The crate slides right, so friction points left (180\u00B0).' },
    { slot:'p', keys:['ten','app'],  agents:['rope','person'],  dir:30,  tip:'The rope pulls along its own length: 30\u00B0 above the +x axis.' }
  ],
  absent:{
    drag:'Air resistance on a slowly moving crate is tiny. Leave it out.',
    norm:'', fric:'', ten:'', app:''
  },
  wrap1:'Four forces: gravity (Earth), the normal force and kinetic friction (both from the floor \u2014 they are the two parts of the floor\u2019s contact force), and the pull of the rope.',
  accel:{ correct:'right', rhs:'ma',
    opts:[ {id:'right',t:'To the right, in the direction of motion'}, {id:'rope',t:'Along the rope, 30\u00B0 above horizontal'}, {id:'zero',t:'Zero'}, {id:'left',t:'To the left'} ],
    fb:{ rope:'The crate stays on the floor, so it cannot accelerate upward. Its acceleration is horizontal, along the motion.',
         zero:'The crate is speeding up, so a\u20D7 is not zero.',
         left:'Friction points left, but the crate speeds up to the right, so the net force \u2014 and a\u20D7 \u2014 point right.' } },
  distract:['neg:f','mag:p','ma','net'],
  wrap2:'Notice the friction vector is added, not subtracted: F\u20D7<sub>f</sub> already points left.',
  axes:{ correct:'std',
    opts:[ {id:'std', t:'x horizontal (along the motion), y vertical'},
           {id:'rope', t:'x along the rope (30\u00B0), y perpendicular to the rope', fb:'Then gravity, the normal force, friction and the acceleration would each have two components. Choose an axis along the acceleration.'} ],
    dirs:[ {n:'x',d:0}, {n:'y',d:90} ], marks:[ {a1:0,a2:30,l:'\u03B8'} ] },
  angles:{ g:['\u03B8'], n:['\u03B8'], f:['\u03B8'], p:['\u03B8'] },
  comps:[
    { axis:'x', terms:{ g:'0', n:'0', f:'-', p:'+c0' }, rhsOpts:['0','+ma','-ma'], rhs:'+ma',
      rfb:{ '0':'The crate speeds up along x, so a<sub>x</sub> = +a.', '-ma':'The crate speeds up toward +x, so a<sub>x</sub> is positive.' } },
    { axis:'y', terms:{ g:'-', n:'+', f:'0', p:'+s0' }, rhsOpts:['0','+ma','-ma'], rhs:'0',
      rfb:{ '+ma':'The crate does not move vertically, so a<sub>y</sub> = 0.', '-ma':'The crate does not move vertically, so a<sub>y</sub> = 0.' } }
  ],
  wrap4:'From the y-equation, {n} = {g} \u2212 {p} sin <i>\u03B8</i>. Pulling upward at an angle reduces the normal force, and with it the kinetic friction (<i>F</i><sub>f</sub> = <i>\u03BC</i><sub>k</sub><i>F</i><sub>N</sub>).'
},
/* 3 ---------------------------------------------------------------- */
{
  id:'pend', tab:'Pendulum', title:'A pendulum bob at an angle',
  desc:'A small bob of mass <i>m</i> hangs from a light string of length <i>L</i>. At the instant shown, the string makes <i>\u03B8</i> = 30\u00B0 with the vertical, and the bob is swinging <b>down toward the lowest point</b> with speed <i>v</i>. Ignore air resistance.',
  aria:'Scene: a string hangs from a fixed pivot. The string makes an angle theta of 30 degrees with a dashed vertical line, with the bob to the right of the vertical. A dotted arc shows the bob\u2019s swing. A dashed velocity arrow at the bob points down and to the left along the arc, toward the lowest point.',
  forces:[
    { slot:'g', keys:['grav'], agents:['earth'], dir:270, tip:'Gravity points straight down (270\u00B0).' },
    { slot:'t', keys:['ten'],  agents:['rope'],  dir:120, tip:'Tension pulls along the string toward the pivot: up and to the left, 30\u00B0 from vertical (120\u00B0 from +x).' }
  ],
  absent:{
    app:'Nobody is touching the bob now. If a hand released it, that force ended when contact ended.',
    norm:'Nothing solid supports the bob from below or the side.',
    fric:'There is no surface for the bob to rub against.',
    drag:'Air resistance is to be ignored here.'
  },
  wrap1:'Only two forces act: gravity and the string\u2019s tension. There is no separate \u201Ccentripetal force\u201D \u2014 the inward part of these two forces is what keeps the bob on its circle.',
  accel:{ correct:'both', rhs:'ma',
    opts:[ {id:'pivot',t:'Toward the pivot, along the string'}, {id:'tangent',t:'Along the arc (tangent to the circle)'},
           {id:'both',t:'Partly toward the pivot and partly along the arc'}, {id:'zero',t:'Zero'}, {id:'down',t:'Straight down'} ],
    fb:{ pivot:'There is an inward (centripetal) part v\u00B2/L because the path curves \u2014 but the bob is also speeding up along the arc.',
         tangent:'The bob speeds up along the arc, but its path also curves, which needs an acceleration component toward the pivot.',
         zero:'The velocity changes in direction (the path curves) and in size (the bob speeds up), so a\u20D7 is not zero.',
         down:'Only in free fall is the acceleration straight down. The string pulls too.' } },
  distract:['cent','neg:g','ma','net'],
  wrap2:'Two vectors, one equation. The acceleration has an inward part and an along-the-arc part, and the same two forces produce both.',
  axes:{ correct:'rt',
    opts:[ {id:'rt', t:'r along the string (toward the pivot), t perpendicular to it (toward the lowest point)'},
           {id:'std', t:'x horizontal, y vertical', fb:'That works, but tension and both acceleration parts would then split into x and y pieces. Axes along and across the string match the two parts of the acceleration.'} ],
    dirs:[ {n:'r',d:120}, {n:'t',d:210} ], marks:[ {a1:270,a2:300,l:'\u03B8'} ] },
  angles:{ g:['\u03B8'], t:['\u03B8'] },
  comps:[
    { axis:'r', terms:{ g:'-c0', t:'+' }, rhsOpts:['0','+mv2L','-mv2L','+mat'], rhs:'+mv2L',
      rfb:{ '-mv2L':'Centripetal acceleration points toward the center of the circle \u2014 the pivot \u2014 which is +r.',
            '0':'The path curves, so there is an acceleration toward the pivot of size v\u00B2/L.',
            '+mat':'a<sub>t</sub> lies along the arc, perpendicular to r. Along r the acceleration is the centripetal v\u00B2/L.' } },
    { axis:'t', terms:{ g:'+s0', t:'0' }, rhsOpts:['0','+mat','-mat','+mv2L'], rhs:'+mat',
      rfb:{ '0':'The bob speeds up along the arc, so a<sub>t</sub> is not zero.',
            '-mat':'+t points toward the lowest point, the way the bob is speeding up, so this component is positive.',
            '+mv2L':'v\u00B2/L points toward the pivot (along r), not along the arc.' } }
  ],
  wrap4:'From r: {t} = <i>m g</i> cos <i>\u03B8</i> + <i>m v</i><sup>2</sup>/<i>L</i>. The tension exceeds the radial part of the weight because it must also supply the centripetal acceleration. From t: <i>a</i><sub>t</sub> = <i>g</i> sin <i>\u03B8</i>.'
},
/* 4 ---------------------------------------------------------------- */
{
  id:'ramp', tab:'Ramp push', title:'A box pushed up a ramp',
  desc:'A person pushes a box of mass <i>m</i> up a rough ramp inclined at <i>\u03B8</i> = 25\u00B0. The push is at <i>\u03C6</i> = 10\u00B0 above the horizontal \u2014 between the horizontal and the ramp, so it points slightly <b>into</b> the ramp. The box slides up the ramp at <b>constant speed</b>.',
  aria:'Scene: a ramp rising to the right at angle theta of 25 degrees. A box sits on the ramp. A push rod meets the back of the box at angle phi of 10 degrees above a dashed horizontal line, so it is less steep than the ramp. A dashed velocity arrow above the box points up the ramp.',
  forces:[
    { slot:'g', keys:['grav'], agents:['earth'],   dir:270, tip:'Gravity points straight down (270\u00B0).' },
    { slot:'n', keys:['norm'], agents:['surface'], dir:115, tip:'The normal force is perpendicular to the ramp, tilted 25\u00B0 from vertical: 115\u00B0 from +x.' },
    { slot:'f', keys:['fric'], agents:['surface'], dir:205, tip:'Friction acts along the ramp, opposite the sliding: down the ramp, 205\u00B0 from +x.' },
    { slot:'p', keys:['app'],  agents:['person'],  dir:10,  tip:'The push is 10\u00B0 above the horizontal.' }
  ],
  absent:{
    ten:'There is no rope here \u2014 the person pushes directly. Call it an applied force.',
    drag:'Air resistance is negligible for a slowly moving box.'
  },
  wrap1:'Four forces: gravity, the normal force and kinetic friction from the ramp, and the person\u2019s push. Friction points down the ramp because the box slides up it.',
  accel:{ correct:'zero', rhs:'zero',
    opts:[ {id:'zero',t:'Zero'}, {id:'up',t:'Up the ramp'}, {id:'push',t:'Along the push'}, {id:'down',t:'Down the ramp'} ],
    fb:{ up:'The box moves up the ramp, but at constant speed in a straight line. Constant velocity means a\u20D7 = 0\u20D7.',
         push:'Acceleration follows the net force, not any single force. The velocity is constant here, so a\u20D7 = 0\u20D7.',
         down:'The velocity is constant, so a\u20D7 = 0\u20D7.' } },
  distract:['neg:f','neg:g','mag:n','net'],
  wrap2:'With a\u20D7 = 0\u20D7 the four force vectors add to zero: placed tip to tail they form a closed polygon.',
  axes:{ correct:'tilt',
    opts:[ {id:'tilt', t:'x along the ramp (up the slope), y perpendicular to the ramp'},
           {id:'std', t:'x horizontal, y vertical', fb:'The physics would be right, but the normal force, friction and push would all split into two components. Tilted axes leave only gravity and the push to resolve.'} ],
    dirs:[ {n:'x',d:25}, {n:'y',d:115} ], marks:[ {a1:270,a2:295,l:'\u03B8'}, {a1:10,a2:25,l:'\u03B8\u2212\u03C6'} ] },
  angles:{ g:['\u03B8'], n:['\u03B8'], f:['\u03B8'], p:['(\u03B8 \u2212 \u03C6)','\u03C6'] },
  comps:[
    { axis:'x', terms:{ g:'-s0', n:'0', f:'-', p:'+c0' }, rhsOpts:['0','+ma','-ma'], rhs:'0',
      rfb:{ '+ma':'Constant velocity: a<sub>x</sub> = 0.', '-ma':'Constant velocity: a<sub>x</sub> = 0.' } },
    { axis:'y', terms:{ g:'-c0', n:'+', f:'0', p:'-s0' }, rhsOpts:['0','+ma','-ma'], rhs:'0',
      rfb:{ '+ma':'The box stays on the ramp surface: a<sub>y</sub> = 0.', '-ma':'The box stays on the ramp surface: a<sub>y</sub> = 0.' } }
  ],
  wrap4:'From y: {n} = {g} cos <i>\u03B8</i> + {p} sin(<i>\u03B8</i> \u2212 <i>\u03C6</i>). Because the push points into the ramp, the normal force is larger than <i>F</i><sub>g</sub> cos <i>\u03B8</i> \u2014 and so is the friction.'
},
/* 5 ---------------------------------------------------------------- */
{
  id:'bank', tab:'Banked curve', title:'A car on a banked curve',
  desc:'A car of mass <i>m</i> rounds a curve of radius <i>R</i> on a road banked at <i>\u03B8</i> = 20\u00B0. It moves at constant speed <i>v</i>, <b>faster than the design speed</b>, so it tends to slide up the bank. The center of the curve is to the right; the car moves into the page.',
  aria:'Scene: cross-section of a banked road seen from behind the car. The road surface rises to the left at angle theta of 20 degrees; its low inner edge is on the right. The car sits on the road. A dashed arrow at the top points right, toward the center of the curve. A circle with a cross shows the velocity points into the page.',
  forces:[
    { slot:'g', keys:['grav'], agents:['earth'],   dir:270, tip:'Gravity points straight down (270\u00B0).' },
    { slot:'n', keys:['norm'], agents:['surface'], dir:70,  tip:'The normal force is perpendicular to the road: tilted 20\u00B0 from vertical toward the center (70\u00B0 from +x).' },
    { slot:'f', keys:['fric'], agents:['surface'], dir:340, tip:'Static friction acts along the road. The car tends to slide up the bank, so friction points down the bank: 340\u00B0 (20\u00B0 below +x).' }
  ],
  absent:{
    app:'Nothing pushes the car sideways. (The forward forces along the direction of travel point into and out of the page; they balance and are left out of this cross-section.)',
    drag:'Drag acts opposite the velocity, which is into the page; it is balanced by forward friction and is left out of this cross-section.',
    ten:'No rope or cable is attached to the car.'
  },
  wrap1:'In this cross-section three forces act: gravity, the normal force from the road, and static friction from the road, pointing down the bank. Their sum points toward the center \u2014 that sum is what we call the centripetal force.',
  accel:{ correct:'center', rhs:'ma',
    opts:[ {id:'center',t:'Horizontally, toward the center of the curve'}, {id:'slope',t:'Down the slope of the road'},
           {id:'perp',t:'Perpendicular to the road surface'}, {id:'zero',t:'Zero, because the speed is constant'} ],
    fb:{ zero:'Constant speed is not constant velocity: the direction keeps changing, so the acceleration is v\u00B2/R toward the center.',
         slope:'The car moves in a horizontal circle, so its acceleration is horizontal, toward the center \u2014 not along the road.',
         perp:'The car moves in a horizontal circle, so its acceleration is horizontal, toward the center \u2014 not perpendicular to the road.' } },
  distract:['cent','mag:n','neg:f','ma'],
  wrap2:'No centripetal-force term appears: m a\u20D7 on the right already says \u201Cthe net force points toward the center\u201D.',
  axes:{ correct:'std',
    opts:[ {id:'std', t:'x horizontal (toward the center), y vertical'},
           {id:'tilt', t:'x along the road surface, y perpendicular to it', fb:'This is the classic trap. The acceleration is horizontal, so tilted axes would split m a into two components. Choose an axis along the acceleration.'} ],
    dirs:[ {n:'x',d:0}, {n:'y',d:90} ], marks:[ {a1:70,a2:90,l:'\u03B8'}, {a1:340,a2:360,l:'\u03B8'} ] },
  angles:{ g:['\u03B8'], n:['\u03B8'], f:['\u03B8'] },
  comps:[
    { axis:'x', terms:{ g:'0', n:'+s0', f:'+c0' }, rhsOpts:['0','+mv2R','-mv2R','+mg'], rhs:'+mv2R',
      rfb:{ '0':'The car accelerates toward the center: a<sub>x</sub> = v\u00B2/R.',
            '-mv2R':'+x points toward the center, the direction of the acceleration.',
            '+mg':'<i>m g</i> is the weight. The right side is mass times the x-acceleration, v\u00B2/R.' } },
    { axis:'y', terms:{ g:'-', n:'+c0', f:'-s0' }, rhsOpts:['0','+mv2R','-mv2R','+mg'], rhs:'0',
      rfb:{ '+mv2R':'The car stays at the same height: a<sub>y</sub> = 0.', '-mv2R':'The car stays at the same height: a<sub>y</sub> = 0.',
            '+mg':'The car does not accelerate vertically, so the right side is 0. The weight is already on the left.' } }
  ],
  wrap4:'From y: {n} cos <i>\u03B8</i> = {g} + {f} sin <i>\u03B8</i>, so the normal force is <b>larger</b> than <i>m g</i> \u2014 not <i>m g</i> cos <i>\u03B8</i>, which tilted axes tempt you to write. From x, the horizontal parts of the normal force and friction together supply <i>m v</i><sup>2</sup>/<i>R</i>.'
}
];

/* ---------------------------------------------------------------------
   SYMBOL RENDERING
   --------------------------------------------------------------------- */
NT.esc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
/* HTML symbol: vector (arrow) or magnitude */
NT.symH = function(key, vec){
  var F = NT.FORCES[key];
  var base = '<span class="ntb">' + F.sym + '</span>';
  return '<span class="ntsym' + (vec ? ' ntvec' : '') + '" aria-hidden="true">' + base + '<sub>' + F.sub + '</sub></span>';
};
/* turn  X\u20D7  (combining arrow) into the CSS-drawn vector symbol */
NT.vecify = function(html){
  return String(html).replace(/([A-Za-z0-9])\u20D7/g, '<span class="ntsym ntvec"><span class="ntb">$1</span></span>');
};
NT.symT = function(key){ var F = NT.FORCES[key]; return F.sym + '_' + F.sub; };
NT.symSpeak = function(key, vec){ var F = NT.FORCES[key]; return (vec ? 'vector ' : '') + F.sym + ' sub ' + F.sub; };
NT.colorClass = function(key){ return 'ntk-' + (NT.FORCES[key] && NT.FORCES[key].real ? key : 'other'); };

/* ---------------------------------------------------------------------
   SHARED PER-QUESTION STATE
   --------------------------------------------------------------------- */
NT.shared = function(thisq){
  var k = 'ntShared_' + thisq;
  if (!window[k]) {
    var sits = [];
    for (var i=0;i<NT.SITS.length;i++) sits.push({ keys:{}, done:[false,false,false,false], tries:[0,0,0,0] });
    window[k] = { a11y:{ lm:false, nr:true, hc:false, cb:false, fs:0 }, sits:sits, finishedAt:null,
                  reportPart: (typeof window.ntReportPart === 'number') ? window.ntReportPart : null };
  }
  return window[k];
};
/* label key chosen in Stage 1 for a slot (falls back to the default) */
NT.slotKey = function(thisq, i, slot){
  var sh = NT.shared(thisq), k = sh.sits[i].keys[slot];
  if (k) return k;
  var f = NT.SITS[i].forces;
  for (var j=0;j<f.length;j++) if (f[j].slot===slot) return f[j].keys[0];
  return 'grav';
};
NT.fillWrap = function(thisq, i, text){
  return text.replace(/\{(\w)\}/g, function(m, slot){ return NT.symH(NT.slotKey(thisq, i, slot), false); });
};

/* ---------------------------------------------------------------------
   OPTIONAL: report progress to a hidden MOM answer box
   (set  window.ntReportPart = 1;  before the scripts to enable)
   --------------------------------------------------------------------- */
NT.report = function(thisq){
  var sh = NT.shared(thisq);
  if (sh.reportPart === null) return;
  var pad = String(sh.reportPart); while (pad.length < 3) pad = '0' + pad;
  var box = document.getElementById('qn' + thisq + pad);
  if (!box) return;
  var stagesDone = 0;
  for (var s=0;s<4;s++){
    var all = true;
    for (var i=0;i<sh.sits.length;i++) if (!sh.sits[i].done[s]) all = false;
    if (all) stagesDone++;
  }
  var val = stagesDone === 4 ? 'complete' : ('incomplete:' + stagesDone);
  if (box.value === val) return;
  box.value = val;
  ['input','change'].forEach(function(t){
    var ev; try { ev = new Event(t, { bubbles:true }); } catch(e){ ev = document.createEvent('Event'); ev.initEvent(t, true, true); }
    box.dispatchEvent(ev);
  });
};

/* ---------------------------------------------------------------------
   ACCESSIBILITY (shared across the four stages of one question)
   --------------------------------------------------------------------- */
NT.STAGE_NAMES = ['Identify the forces','Newton\u2019s 2nd law (vectors)','Free-body diagram','Components'];

NT.toolbarHTML = function(thisq, n){
  function b(k, label, on){
    return '<button type="button" class="nta11ybtn' + (on ? ' nta11yon' : '') + '" data-a11y="' + k + '" id="nt' + n + 'A' + k + '_' + thisq + '" aria-pressed="' + (on?'true':'false') + '">' + label + '</button>';
  }
  return '<div class="nta11y" role="toolbar" aria-label="Display options">'
    + b('lm','LIGHT MODE',false) + b('nr','NARRATION: ON',true) + b('hc','HIGH CONTRAST',false)
    + b('cb','COLOR-BLIND SAFE',false) + b('fs','FONT SIZE: NORMAL',false) + '</div>'
    + '<div class="ntnarbar ntnarshow" id="nt' + n + 'Nar_' + thisq + '" role="status" aria-live="polite" aria-atomic="true"></div>';
};
NT.headerHTML = function(thisq, n, subtitle){
  var pills = '';
  for (var s=1;s<=4;s++){
    pills += '<li class="ntpill' + (s===n ? ' ntpillactive' : (s<n ? ' ntpilldone' : '')) + '"' + (s===n ? ' aria-current="step"' : '') + '>'
          + s + '. ' + NT.STAGE_NAMES[s-1] + (s<n ? '<span class="ntsr"> (completed)</span>' : '') + '</li>';
  }
  return '<h3 class="nttitle">Newton\u2019s second law \u2014 Stage ' + n + ': ' + NT.STAGE_NAMES[n-1] + '</h3>'
    + '<p class="ntsubtitle">' + subtitle + '</p>'
    + '<ol class="ntstagebar" aria-label="Tutorial stages">' + pills + '</ol>';
};
NT.bindToolbar = function(rootEl, thisq){
  var btns = rootEl.querySelectorAll('.nta11ybtn');
  for (var i=0;i<btns.length;i++){
    btns[i].addEventListener('click', function(){
      var a = NT.shared(thisq).a11y, k = this.getAttribute('data-a11y');
      if (k === 'fs') a.fs = (a.fs + 1) % 3;
      else a[k] = !a[k];
      if (k === 'hc' && a.hc) a.lm = false;
      if (k === 'lm' && a.lm) a.hc = false;
      document.dispatchEvent(new CustomEvent('ntA11yChange', { detail:{ thisq:thisq } }));
    });
  }
};
NT.applyA11y = function(rootEl, thisq){
  var a = NT.shared(thisq).a11y;
  var root = rootEl.querySelector('.ntroot'); if (!root) return;
  root.classList.toggle('ntlm', a.lm);
  root.classList.toggle('nthc', a.hc);
  root.classList.toggle('ntcb', a.cb);
  root.style.setProperty('--ntfs', ['15px','17px','20px'][a.fs]);
  var labels = { lm:'LIGHT MODE', hc:'HIGH CONTRAST', cb:'COLOR-BLIND SAFE' };
  var btns = root.querySelectorAll('.nta11ybtn');
  for (var i=0;i<btns.length;i++){
    var k = btns[i].getAttribute('data-a11y'), on = k === 'fs' ? a.fs > 0 : !!a[k];
    btns[i].classList.toggle('nta11yon', on);
    btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    btns[i].textContent = k === 'nr' ? ('NARRATION: ' + (a.nr ? 'ON' : 'OFF'))
                        : k === 'fs' ? ('FONT SIZE: ' + ['NORMAL','LARGE','XL'][a.fs]) : labels[k];
  }
  var nar = root.querySelector('.ntnarbar');
  if (nar) nar.classList.toggle('ntnarshow', a.nr);
};
NT.announce = function(thisq, n, msg){
  var plain = String(msg).replace(/<[^>]+>/g,'').replace(/\u20D7/g,'');
  var nar = document.getElementById('nt' + n + 'Nar_' + thisq);
  var live = document.getElementById('nt' + n + 'Live_' + thisq);
  if (nar && NT.shared(thisq).a11y.nr) nar.textContent = plain;
  if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = plain; }, 60); }
};

/* Situation tabs (shared look) */
NT.tabsHTML = function(thisq, n, cur){
  var sh = NT.shared(thisq), html = '<div class="nttabs" role="group" aria-label="Situations">';
  for (var i=0;i<NT.SITS.length;i++){
    var done = sh.sits[i].done[n-1];
    var unlocked = done || i === 0 || sh.sits[i-1].done[n-1];
    html += '<button type="button" class="nttab' + (i===cur ? ' nttabcur' : '') + (done ? ' nttabdone' : '') + '" data-sit="' + i + '"'
         + (unlocked ? '' : ' disabled') + (i===cur ? ' aria-current="true"' : '') + '>'
         + '<span class="nttabn">' + (i+1) + '</span> ' + NT.SITS[i].tab
         + (done ? ' <span aria-hidden="true">\u2713</span><span class="ntsr"> (done)</span>' : (unlocked ? '' : '<span class="ntsr"> (locked)</span>'))
         + '</button>';
  }
  return html + '</div>';
};
NT.sceneCardHTML = function(i){
  var S = NT.SITS[i];
  return '<figure class="ntscene">'
    + '<svg class="ntscenesvg" viewBox="0 0 360 220" role="img" aria-label="' + NT.esc(S.aria) + '">' + NT.sceneSVG(i) + '</svg>'
    + '<figcaption><span class="ntscenet">' + (i+1) + '. ' + S.title + '</span><span class="ntscened">' + S.desc + '</span></figcaption>'
    + '</figure>';
};
NT.allDone = function(thisq, n){
  var sh = NT.shared(thisq);
  for (var i=0;i<sh.sits.length;i++) if (!sh.sits[i].done[n-1]) return false;
  return true;
};
NT.completeStage = function(thisq, n){
  NT.report(thisq);
  document.dispatchEvent(new CustomEvent('ntStageComplete', { detail:{ stage:n, thisq:thisq } }));
  var hook = window['ntOnStageComplete_' + thisq];
  if (typeof hook === 'function') hook(n);
};

/* ---------------------------------------------------------------------
   SVG HELPERS
   --------------------------------------------------------------------- */
function r2(v){ return Math.round(v*10)/10; }
NT.arrow = function(x1,y1,x2,y2,cls,opt){
  opt = opt || {};
  var dx=x2-x1, dy=y2-y1, L=Math.sqrt(dx*dx+dy*dy); if (L<2) return '';
  var ux=dx/L, uy=dy/L, hl=opt.head||12, hw=hl*0.45, bx=x2-ux*hl, by=y2-uy*hl;
  return '<g class="' + cls + '">'
    + '<line x1="'+r2(x1)+'" y1="'+r2(y1)+'" x2="'+r2(bx)+'" y2="'+r2(by)+'" class="ntline"' + (opt.dash?' stroke-dasharray="6 5"':'') + (opt.w?' stroke-width="'+opt.w+'"':'') + '/>'
    + '<polygon class="nthead" points="'+r2(x2)+','+r2(y2)+' '+r2(bx-uy*hw)+','+r2(by+ux*hw)+' '+r2(bx+uy*hw)+','+r2(by-ux*hw)+'"/></g>';
};
/* vector label: F with arrow, subscript */
NT.vecLabel = function(x, y, key, cls, vec){
  var F = NT.FORCES[key], w = 12 + F.sub.length*7, x0 = x - w/2;
  var s = '<g class="' + cls + ' ntvl">'
    + '<text x="'+r2(x0)+'" y="'+r2(y+6)+'" class="ntvlt">' + F.sym + '<tspan class="ntvls" dy="5">' + F.sub + '</tspan></text>';
  if (vec !== false) s += '<path class="ntvla" d="M'+r2(x0+1)+' '+r2(y-10)+' h11 m-4 -3 l4 3 l-4 3"/>';
  return s + '</g>';
};
/* angle arc between directions a1 -> a2 (degrees, math convention) about (cx,cy) */
NT.angleArc = function(cx, cy, r, a1, a2, label, cls){
  var p1 = [cx + r*Math.cos(a1*Math.PI/180), cy - r*Math.sin(a1*Math.PI/180)];
  var p2 = [cx + r*Math.cos(a2*Math.PI/180), cy - r*Math.sin(a2*Math.PI/180)];
  var mid = (a1+a2)/2, lr = r + 14;
  var large = Math.abs(a2-a1) > 180 ? 1 : 0, sweep = a2 > a1 ? 0 : 1;
  return '<g class="' + (cls||'ntarc') + '"><path d="M'+r2(p1[0])+' '+r2(p1[1])+' A'+r+' '+r+' 0 '+large+' '+sweep+' '+r2(p2[0])+' '+r2(p2[1])+'"/>'
    + '<text x="'+r2(cx+lr*Math.cos(mid*Math.PI/180))+'" y="'+r2(cy-lr*Math.sin(mid*Math.PI/180)+5)+'" text-anchor="middle">' + label + '</text></g>';
};

/* ---------------------------------------------------------------------
   SCENES (no force arrows — those are the student's job)
   --------------------------------------------------------------------- */
function velLabel(x,y){ return '<text class="ntsclbl ntscvel-t" x="'+x+'" y="'+y+'">v<tspan dy="-9" dx="-8" font-size="11">\u2192</tspan></text>'; }
NT.sceneSVG = function(i){
  var s = '';
  if (i === 0){
    s += '<g class="ntscstreak"><line x1="166" y1="30" x2="166" y2="62"/><line x1="180" y1="22" x2="180" y2="64"/><line x1="194" y1="30" x2="194" y2="62"/></g>';
    s += '<circle class="ntscobj" cx="180" cy="98" r="24"/>';
    s += NT.arrow(180,130,180,198,'ntscvel',{dash:true});
    s += velLabel(192,180);
    s += '<text class="ntscnote" x="20" y="208">still speeding up</text>';
  }
  else if (i === 1){
    s += '<line class="ntscground" x1="18" y1="160" x2="342" y2="160"/>';
    for (var h=24; h<340; h+=14) s += '<line class="ntschatch" x1="'+h+'" y1="160" x2="'+(h-10)+'" y2="172"/>';
    s += '<rect class="ntscobj" x="120" y="108" width="80" height="52" rx="3"/>';
    s += '<line class="ntscrope" x1="200" y1="134" x2="304" y2="74"/><circle class="ntschand" cx="308" cy="72" r="7"/>';
    s += '<line class="ntscref" x1="200" y1="134" x2="290" y2="134"/>';
    s += NT.angleArc(200,134,44,0,30,'\u03B8','ntscarc');
    s += NT.arrow(124,92,196,92,'ntscvel',{dash:true}) + velLabel(150,84);
    s += '<text class="ntscnote" x="20" y="200">rough floor \u2022 speeding up</text>';
  }
  else if (i === 2){
    s += '<rect class="ntscsupport" x="138" y="18" width="84" height="8"/>';
    s += '<line class="ntscref" x1="180" y1="26" x2="180" y2="186"/>';
    s += '<path class="ntscpath" d="M99.7 140.7 A140 140 0 0 0 260.3 140.7"/>';
    s += '<line class="ntscrope" x1="180" y1="26" x2="250" y2="147.2"/><circle class="ntscpivot" cx="180" cy="26" r="3.5"/>';
    s += '<circle class="ntscobj" cx="250" cy="147.2" r="14"/>';
    s += NT.angleArc(180,26,46,270,300,'\u03B8','ntscarc');
    s += NT.arrow(232,160,190,184,'ntscvel',{dash:true}) + velLabel(196,204);
    s += '<text class="ntscnote" x="268" y="208">length L</text>';
  }
  else if (i === 3){
    s += '<polygon class="ntscramp" points="30,190 330,190 330,50.1"/>';
    s += NT.angleArc(30,190,42,0,25,'\u03B8','ntscarc');
    s += '<g transform="translate(184.1 118.2) rotate(-25)"><rect class="ntscobj" x="-26" y="-36" width="52" height="36" rx="3"/></g>';
    s += '<line class="ntscrod" x1="76" y1="127.6" x2="155.5" y2="113.6"/><circle class="ntschand" cx="72" cy="128.3" r="7"/>';
    s += '<line class="ntscref" x1="155.5" y1="113.6" x2="96" y2="113.6"/>';
    s += NT.angleArc(155.5,113.6,52,180,190,'\u03C6','ntscarc');
    s += NT.arrow(152,72,204,48,'ntscvel',{dash:true}) + velLabel(214,52);
    s += '<text class="ntscnote" x="20" y="212">rough ramp \u2022 constant speed</text>';
  }
  else {
    s += '<polygon class="ntscramp" points="30,82.6 60,82.6 300,170 332,170 332,206 30,206"/>';
    s += NT.angleArc(300,170,46,160,180,'\u03B8','ntscarc');
    s += '<g transform="translate(187.2 129) rotate(20)">'
      + '<rect class="ntscobj" x="-42" y="-40" width="84" height="30" rx="5"/>'
      + '<rect class="ntscobj" x="-26" y="-58" width="52" height="20" rx="5"/>'
      + '<circle class="ntscwheel" cx="-28" cy="-7" r="7"/><circle class="ntscwheel" cx="28" cy="-7" r="7"/></g>';
    s += NT.arrow(236,34,330,34,'ntscvel',{dash:true});
    s += '<text class="ntscnote" x="232" y="24">toward center</text>';
    s += '<circle class="ntscinto" cx="48" cy="30" r="10"/><path class="ntscinto" d="M41 23 L55 37 M55 23 L41 37"/>';
    s += velLabel(64,36) + '<text class="ntscnote" x="80" y="35">into page</text>';
  }
  return s;
};

/* ---------------------------------------------------------------------
   STAGE SHELL — every stage mounts through this
   opts: { label, subtitle, render(), onTab(i) }
   --------------------------------------------------------------------- */
NT.ids = function(thisq, n){
  function f(name){ return 'nt' + n + name + '_' + thisq; }
  return f;
};
NT.mount = function(thisq, n, rootElId, opts){
  var id = NT.ids(thisq, n);
  function build(){
    var host = document.getElementById(rootElId);
    if (!host) return false;
    host.innerHTML = '<div class="ntroot" role="region" aria-label="' + NT.esc(opts.label) + '">'
      + NT.toolbarHTML(thisq, n)
      + NT.headerHTML(thisq, n, opts.subtitle)
      + '<div id="' + id('Tabs') + '"></div>'
      + '<div class="ntlayout"><div id="' + id('Scene') + '"></div>'
      + '<section class="ntwork" id="' + id('Work') + '" aria-label="Your work"></section></div>'
      + '<div class="ntcomplete" id="' + id('Comp') + '" role="status"></div>'
      + '<span class="ntsr" id="' + id('Live') + '" aria-live="polite" aria-atomic="true"></span>'
      + '</div>';
    NT.bindToolbar(host, thisq);
    NT.applyA11y(host, thisq);
    document.getElementById(id('Tabs')).addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('.nttab') : null;
      if (!b || b.disabled) return;
      opts.onTab(parseInt(b.getAttribute('data-sit'), 10));
    });
    document.addEventListener('ntA11yChange', function(e){
      if (e.detail.thisq !== thisq) return;
      NT.applyA11y(host, thisq);
      if (opts.onA11y) opts.onA11y();
    });
    document.addEventListener('ntStageComplete', function(e){
      if (e.detail.thisq !== thisq) return;
      if (e.detail.stage === n - 1) { opts.render(); if (opts.onShow) opts.onShow(); }
    });
    opts.render();
    return true;
  }
  var tries = 0;
  (function go(){
    if (build()) return;
    if (tries++ < 50) setTimeout(go, 100);
  })();
};
NT.renderTabsScene = function(thisq, n, cur){
  var id = NT.ids(thisq, n);
  document.getElementById(id('Tabs')).innerHTML = NT.tabsHTML(thisq, n, cur);
  document.getElementById(id('Scene')).innerHTML = NT.sceneCardHTML(cur);
};
NT.focusHeading = function(thisq, n){
  var h = document.getElementById(NT.ids(thisq, n)('WorkH'));
  if (h) { try { h.focus({ preventScroll:true }); } catch(e){ h.focus(); } }
};
/* "Next situation" / stage-complete handling after a situation is solved */
NT.nextButtonHTML = function(thisq, n, cur){
  var id = NT.ids(thisq, n);
  if (cur < NT.SITS.length - 1)
    return '<div class="ntbtnrow" style="margin-top:8px"><button type="button" class="ntbtn ntbtnnext" id="' + id('Next') + '">Go to situation ' + (cur+2) + ': ' + NT.SITS[cur+1].tab + '</button></div>';
  return '';
};
NT.showStageComplete = function(thisq, n, msg){
  var id = NT.ids(thisq, n), comp = document.getElementById(id('Comp'));
  if (!comp) return;
  var btn = n < 4 ? '<button type="button" class="ntbtn ntbtnnext" id="' + id('Cont') + '">Continue to Stage ' + (n+1) + ': ' + NT.STAGE_NAMES[n] + '</button>' : '';
  comp.innerHTML = '<h4>Stage ' + n + ' complete</h4><p>' + msg + '</p>' + (btn ? '<div class="ntbtnrow" style="margin-top:8px">' + btn + '</div>' : '');
  comp.classList.add('ntshow');
  var b = document.getElementById(id('Cont'));
  if (b) b.addEventListener('click', function(){
    NT.completeStage(thisq, n);
    NT.announce(thisq, n, 'Stage ' + (n+1) + ' is open below.');
  });
};

window.NTCore = NT;
})();
