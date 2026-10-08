/* =====================================================================
   TWO-BODY NEWTON'S LAWS TUTORIAL — SHARED CORE  (twobody-tut-core.js)
   Loaded once per page, before the four stage files.
   Namespace: window.TBCore, events tbStageComplete / tbA11yChange,
   element ids tb<stage><name>_<thisq>. CSS classes reuse the .nt* look.
   ===================================================================== */
(function(){
'use strict';
if (window.TBCore) return;
var TB = {};

/* ---------------------------------------------------------------------
   FORCE TYPES (Stage 1) and LABELS (Stages 2-4)
   --------------------------------------------------------------------- */
TB.TYPES = {
  grav:   { name:'Gravitational force', real:true },
  norm:   { name:'Normal force',        real:true },
  fric:   { name:'Friction',            real:true },
  ten:    { name:'Tension',             real:true },
  app:    { name:'Applied force (push or pull)', real:true },
  net:    { name:'Net force',           real:false,
            why:'The net force is the vector sum of the real forces, not one more force on the block. Listing it would count every force twice.' },
  motion: { name:'Force of motion',     real:false,
            why:'A moving block does not carry a \u201Cforce of motion\u201D. Every force needs an agent that pushes or pulls on the block right now.' }
};
TB.TYPE_ORDER = ['grav','norm','fric','ten','app','net','motion'];

TB.AGENTS = [
  { id:'earth',   t:'Earth' },
  { id:'surface', t:'The floor or incline' },
  { id:'string',  t:'The string or rope' },
  { id:'person',  t:'The person' },
  { id:'b1',      t:'Block 1' },
  { id:'b2',      t:'Block 2' },
  { id:'pulley',  t:'The pulley' }
];
TB.agentText = function(id){
  for (var i=0;i<TB.AGENTS.length;i++) if (TB.AGENTS[i].id===id) return TB.AGENTS[i].t;
  return '';
};

/* sub: subscript; type: colour + type; mag: subscript used for the magnitude in Stage 4 */
TB.LBL = {
  g1:  { sub:'g1',   type:'grav', name:'gravity on block 1' },
  g2:  { sub:'g2',   type:'grav', name:'gravity on block 2' },
  N1:  { sub:'N1',   type:'norm', name:'normal force on block 1 by the surface' },
  N2:  { sub:'N2',   type:'norm', name:'normal force on block 2 by the surface' },
  N12: { sub:'N,12', type:'norm', name:'normal force on block 1 by block 2' },
  N21: { sub:'N,21', type:'norm', name:'normal force on block 2 by block 1' },
  f1:  { sub:'f1',   type:'fric', name:'friction on block 1 by the surface' },
  f2:  { sub:'f2',   type:'fric', name:'friction on block 2 by the surface' },
  f12: { sub:'f,12', type:'fric', name:'friction on block 1 by block 2' },
  f21: { sub:'f,21', type:'fric', name:'friction on block 2 by block 1' },
  T1:  { sub:'T1',   type:'ten',  name:'tension on block 1', mag:'T' },
  T2:  { sub:'T2',   type:'ten',  name:'tension on block 2', mag:'T' },
  A:   { sub:'A',    type:'app',  name:'applied force by the person' },
  net: { sub:'net',  type:'other',name:'net force', fake:true }
};
TB.LBL_ORDER = ['g1','g2','N1','N2','N12','N21','f1','f2','f12','f21','T1','T2','A','net'];

TB.RHS = {
  '0':    { t:'0', h:'0' },
  '+m1a': { t:'m\u2081a',        h:'<i>m</i><sub>1</sub><i>a</i>' },
  '-m1a': { t:'\u2212m\u2081a',  h:'\u2212<i>m</i><sub>1</sub><i>a</i>' },
  '+m2a': { t:'m\u2082a',        h:'<i>m</i><sub>2</sub><i>a</i>' },
  '-m2a': { t:'\u2212m\u2082a',  h:'\u2212<i>m</i><sub>2</sub><i>a</i>' },
  '+m1g': { t:'m\u2081g',        h:'<i>m</i><sub>1</sub><i>g</i>' },
  '+m2g': { t:'m\u2082g',        h:'<i>m</i><sub>2</sub><i>g</i>' },
  '+mta': { t:'(m\u2081 + m\u2082)a', h:'(<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i>' }
};

/* ---------------------------------------------------------------------
   THE FIVE SITUATIONS (simple -> complex)
   forces[]: slot (= label key), body, types/agents accepted in Stage 1,
             dir (degrees from page +x, y up), miss (Stage 1 hint),
             tip (Stage 3 hint, in the FBD frame of that body)
   axes.bodies[b]: dirs (real-world axis directions; +x along the block's motion),
               xdesc (words for +x), marks (angle arcs). Stages 3-4 draw each FBD
               rotated so its own x/y axes are horizontal/vertical on screen.
   comp code: '0' | '+' | '-' | '+c0' '-s1' ... (sign, cos/sin, angle index)
   --------------------------------------------------------------------- */
TB.SITS = [
/* 1 ----------------------------------------------------------- Atwood */
{
  id:'atw', tab:'Atwood machine', title:'An Atwood machine',
  desc:'Blocks 1 and 2 hang from a light string over a light, frictionless pulley. Block 2 is heavier (<i>m</i><sub>2</sub> &gt; <i>m</i><sub>1</sub>). The blocks were released from rest: block 2 speeds up downward and block 1 speeds up upward.',
  aria:'Scene: a pulley hangs from the ceiling. A string passes over it. Block 1, smaller, hangs on the left with a dashed velocity arrow pointing up. Block 2, larger, hangs on the right with a dashed velocity arrow pointing down.',
  forces:[
    { slot:'g1', body:1, types:['grav'], agents:['earth'],  dir:270, miss:'Every block near Earth is pulled down by Earth.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'T1', body:1, types:['ten'],  agents:['string'], dir:90,  miss:'The string is attached to block 1 and pulls on it.', tip:'The string pulls up on block 1, which is +x here (0\u00B0), because +x points along block 1\u2019s motion: up.' },
    { slot:'g2', body:2, types:['grav'], agents:['earth'],  dir:270, miss:'Every block near Earth is pulled down by Earth.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'T2', body:2, types:['ten'],  agents:['string'], dir:90,  miss:'The string is attached to block 2 and pulls on it.', tip:'The string pulls up on block 2, even though it moves down. +x points down (along its motion), so the tension is along \u2212x (180\u00B0).' }
  ],
  absent:{ '1:norm':'Nothing solid supports a hanging block; only the string holds it.', '2:norm':'Nothing solid supports a hanging block; only the string holds it.',
           '1:fric':'A hanging block touches no surface, so there is no friction.', '2:fric':'A hanging block touches no surface, so there is no friction.',
           '1:app':'No one is pushing the blocks; they were simply released.', '2:app':'No one is pushing the blocks; they were simply released.' },
  agentMsg:{},
  wrap1:'Two forces on each block: Earth\u2019s pull and the string\u2019s pull. The pulley never touches the blocks; it only redirects the string.',
  accel:{
    1:{ correct:'up', opts:[ {id:'up',t:'Upward'}, {id:'down',t:'Downward'}, {id:'zero',t:'Zero'} ],
        fb:{ down:'Block 1 rises while speeding up, so its acceleration points up.', zero:'The blocks were released from rest and are speeding up, so they accelerate.' } },
    2:{ correct:'down', opts:[ {id:'down',t:'Downward'}, {id:'up',t:'Upward'}, {id:'zero',t:'Zero'} ],
        fb:{ up:'Block 2 falls while speeding up, so its acceleration points down.', zero:'The blocks were released from rest and are speeding up, so they accelerate.' } } },
  distract:{ 1:['other:T2','neg:g1','ma'], 2:['other:T1','mag:T2','net'] },
  links:[
    { q:'How do the magnitudes of the two accelerations compare?', correct:'same',
      opts:[ {id:'same',t:'Same magnitude a'}, {id:'big2',t:'Block 2\u2019s is larger, because it is heavier'}, {id:'big1',t:'Block 1\u2019s is larger, because it is lighter'} ],
      fb:{ big2:'The string does not stretch, so whenever block 2 moves down a distance, block 1 moves up the same distance: same speed, same acceleration magnitude.',
           big1:'The string does not stretch, so both blocks move the same distance in the same time: same acceleration magnitude.' } },
    { q:'How do the tension magnitudes F<sub>T1</sub> and F<sub>T2</sub> compare?', correct:'equal',
      opts:[ {id:'equal',t:'Equal: one light string over a light, frictionless pulley'}, {id:'t2',t:'F_T2 is larger, because block 2 is heavier'}, {id:'weight',t:'Each tension equals the weight of its own block'} ],
      fb:{ t2:'A light string over an ideal pulley has the same tension everywhere, so both blocks feel the same pull, F<sub>T</sub>.',
           weight:'A tension equals the hanging weight only when that block does not accelerate. Here both blocks accelerate.' } }
  ],
  wrap2:'Two equations, one per block, linked by two facts: the same acceleration magnitude <i>a</i> and the same tension F<sub>T</sub>.',
  axes:{ correct:'motion',
    opts:[ {id:'motion', t:'For each block, x along its own motion: upward for block 1, downward for block 2'},
           {id:'up', t:'x horizontal and y upward for both blocks', fb:'That works, but block 2\u2019s acceleration component would then be \u2212a while block 1\u2019s is +a. Putting x along each block\u2019s own motion (its acceleration) lets both equations use +a.'} ],
    bodies:{ 1:{ dirs:[{n:'x',d:90},{n:'y',d:180}], xdesc:'upward, along block 1\u2019s motion', marks:[] },
             2:{ dirs:[{n:'x',d:270},{n:'y',d:0}], xdesc:'downward, along block 2\u2019s motion', marks:[] } } },
  angles:{},
  comps:{
    1:[ { axis:'x', terms:{ g1:'-', T1:'+' }, rhsOpts:['0','+m1a','-m1a','+m1g','+mta'], rhs:'+m1a' } ],
    2:[ { axis:'x', terms:{ g2:'+', T2:'-' }, rhsOpts:['0','+m2a','-m2a','+m2g','+mta'], rhs:'+m2a' } ]
  },
  wrap4:'Add the two equations: the tension cancels, leaving {g2} \u2212 {g1} = (<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i>, so <i>a</i> = (<i>m</i><sub>2</sub> \u2212 <i>m</i><sub>1</sub>)<i>g</i>/(<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>). Then F<sub>T</sub> = <i>m</i><sub>1</sub>(<i>g</i> + <i>a</i>): the tension lies between the two weights.'
},
/* 2 --------------------------------------------- two blocks, string */
{
  id:'pair', tab:'Blocks in a row', title:'Two blocks connected by a string',
  desc:'Blocks 1 and 2 sit on a rough horizontal floor, joined by a light horizontal string. A person pulls block 1 with a rope at <i>\u03B8</i> = 30\u00B0 above the horizontal. Both blocks slide to the right and are <b>speeding up</b>.',
  aria:'Scene: two blocks on a rough floor. Block 2 is on the left, block 1 on the right, joined by a short horizontal string. A rope attached to the right side of block 1 rises up and to the right at angle theta of 30 degrees above a dashed horizontal line. A dashed velocity arrow above the blocks points right.',
  forces:[
    { slot:'g1', body:1, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'N1', body:1, types:['norm'], agents:['surface'], dir:90,  miss:'Block 1 rests on the floor, which pushes back perpendicular to itself.', tip:'The floor pushes straight up (90\u00B0).' },
    { slot:'f1', body:1, types:['fric'], agents:['surface'], dir:180, miss:'Block 1 slides along a rough floor.', tip:'Kinetic friction opposes the sliding: to the left (180\u00B0).' },
    { slot:'T1', body:1, types:['ten'],  agents:['string'],  dir:180, miss:'The string to block 2 is attached to block 1 too. Which way does it pull?', tip:'The connecting string pulls block 1 back toward block 2: to the left (180\u00B0).' },
    { slot:'A',  body:1, types:['app','ten'], agents:['person','string'], dir:30, miss:'The person pulls on block 1 through the rope.', tip:'The rope pulls along its length, 30\u00B0 above +x.' },
    { slot:'g2', body:2, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'N2', body:2, types:['norm'], agents:['surface'], dir:90,  miss:'Block 2 rests on the floor, which pushes back.', tip:'The floor pushes straight up (90\u00B0).' },
    { slot:'f2', body:2, types:['fric'], agents:['surface'], dir:180, miss:'Block 2 also slides along the rough floor.', tip:'Kinetic friction opposes the sliding: to the left (180\u00B0).' },
    { slot:'T2', body:2, types:['ten'],  agents:['string'],  dir:0,   miss:'The string pulls block 2 along.', tip:'The string pulls block 2 toward block 1: to the right (0\u00B0).' }
  ],
  absent:{ '2:app':'The person pulls only block 1. Block 2 is pulled by the connecting string.' },
  agentMsg:{ '2:ten:person':'The person holds the rope on block 1, not block 2. The connecting string pulls block 2.' },
  wrap1:'Block 1 feels five forces, including a backward pull from the connecting string. Block 2 feels four. The person never touches block 2: the string transmits the pull.',
  accel:{
    1:{ correct:'right', opts:[ {id:'right',t:'To the right'}, {id:'rope',t:'Along the rope, 30\u00B0 above horizontal'}, {id:'zero',t:'Zero'} ],
        fb:{ rope:'Block 1 stays on the floor, so its acceleration is horizontal, along the motion.', zero:'The blocks are speeding up.' } },
    2:{ correct:'right', opts:[ {id:'right',t:'To the right'}, {id:'left',t:'To the left'}, {id:'zero',t:'Zero'} ],
        fb:{ left:'Block 2 speeds up to the right, so its acceleration points right.', zero:'The blocks are speeding up.' } } },
  distract:{ 1:['other:T2','neg:f1','mag:A','net'], 2:['other:A','neg:T2','ma'] },
  links:[
    { q:'How do the magnitudes of the two accelerations compare?', correct:'same',
      opts:[ {id:'same',t:'Same magnitude a: the string stays taut'}, {id:'big1',t:'Block 1\u2019s is larger, because it is pulled directly'} ],
      fb:{ big1:'As long as the string stays taut, the blocks move together: same velocity at every instant, so the same acceleration.' } },
    { q:'How do F<sub>T1</sub> (string on block 1) and F<sub>T2</sub> (string on block 2) compare?', correct:'equal',
      opts:[ {id:'equal',t:'Equal magnitudes, because the string is light (massless)'}, {id:'third',t:'Equal magnitudes, because they are a Newton\u2019s third-law pair'}, {id:'t1',t:'F_T1 is larger, because block 1 is pulled harder'} ],
      fb:{ third:'Equal, yes \u2014 but not a third-law pair: both forces are exerted <b>by the string</b>. The third-law partner of F<sub>T1</sub> is block 1\u2019s pull on the string. The two ends pull equally because the string has (almost) no mass.',
           t1:'A light string pulls equally hard at both ends; otherwise its tiny mass would need an enormous net force.' } }
  ],
  wrap2:'Each equation contains only the forces <b>on</b> that block. F\u20D7<sub>A</sub> appears in block 1\u2019s equation only, and each block gets its own tension vector.',
  axes:{ correct:'std',
    opts:[ {id:'std', t:'For both blocks: x horizontal (along the motion), y vertical'},
           {id:'rope', t:'Block 1: x along the rope (30\u00B0); block 2: x horizontal', fb:'Then every other force on block 1, and its acceleration, would have two components. Put x along the acceleration for both blocks.'} ],
    bodies:{ 1:{ dirs:[{n:'x',d:0},{n:'y',d:90}], xdesc:'to the right', marks:[{a1:0,a2:30,l:'\u03B8'}] }, 2:{ dirs:[{n:'x',d:0},{n:'y',d:90}], xdesc:'to the right', marks:[] } } },
  angles:{ g1:['\u03B8'], N1:['\u03B8'], f1:['\u03B8'], T1:['\u03B8'], A:['\u03B8'] },
  comps:{
    1:[ { axis:'x', terms:{ g1:'0', N1:'0', f1:'-', T1:'-', A:'+c0' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'+m1a' },
        { axis:'y', terms:{ g1:'-', N1:'+', f1:'0', T1:'0', A:'+s0' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'0' } ],
    2:[ { axis:'x', terms:{ g2:'0', N2:'0', f2:'-', T2:'+' }, rhsOpts:['0','+m2a','-m2a','+mta'], rhs:'+m2a' },
        { axis:'y', terms:{ g2:'-', N2:'+', f2:'0', T2:'0' }, rhsOpts:['0','+m2a','-m2a','+mta'], rhs:'0' } ]
  },
  wrap4:'Add the two x-equations: the tension cancels, giving {A} cos <i>\u03B8</i> \u2212 {f1} \u2212 {f2} = (<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i>. The y-equations show {N1} = {g1} \u2212 {A} sin <i>\u03B8</i> but {N2} = {g2}: the upward pull lightens only block 1, so only block 1\u2019s friction is reduced.'
},
/* 3 --------------------------------------- incline + hanging block */
{
  id:'ramp', tab:'Ramp + hanging', title:'A block on a ramp pulled by a hanging block',
  desc:'Block 1 sits on a rough ramp inclined at <i>\u03B8</i> = 30\u00B0. A light string parallel to the ramp runs over a light, frictionless pulley at the top to block 2, which hangs freely. Block 2 moves down and block 1 moves up the ramp; both are <b>speeding up</b>.',
  aria:'Scene: a ramp rising to the right at angle theta of 30 degrees. Block 1 sits on the ramp. A string runs from block 1 up along the ramp, over a pulley at the top, and down to block 2, which hangs beside the vertical right side of the ramp. Dashed velocity arrows: block 1 moves up the ramp, block 2 moves down.',
  forces:[
    { slot:'g1', body:1, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'In this rotated diagram, gravity makes \u03B8 = 30\u00B0 with \u2212y, leaning toward \u2212x (down the ramp): 240\u00B0 from +x.' },
    { slot:'N1', body:1, types:['norm'], agents:['surface'], dir:120, miss:'Block 1 rests on the ramp, which pushes back perpendicular to itself.', tip:'The normal force is perpendicular to the ramp: exactly +y (90\u00B0).' },
    { slot:'f1', body:1, types:['fric'], agents:['surface'], dir:210, miss:'Block 1 slides along a rough ramp.', tip:'Friction opposes the sliding, so it points down the ramp: \u2212x (180\u00B0).' },
    { slot:'T1', body:1, types:['ten'],  agents:['string'],  dir:30,  miss:'The string pulls block 1 up the ramp.', tip:'The string is parallel to the ramp and pulls up it: +x (0\u00B0).' },
    { slot:'g2', body:2, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'T2', body:2, types:['ten'],  agents:['string'],  dir:90,  miss:'The string holds block 2 from above.', tip:'The string pulls up on block 2. +x points down (along its motion), so the tension is along \u2212x (180\u00B0).' }
  ],
  absent:{ '2:norm':'Block 2 hangs freely; it does not touch the ramp.', '2:fric':'Block 2 hangs freely; it does not rub on anything.',
           '1:app':'No person is involved; the hanging block does the pulling, through the string.', '2:app':'No person is involved here.' },
  agentMsg:{ '1:ten:b2':'Block 2 never touches block 1. It pulls on the string, and the string pulls on block 1.' },
  wrap1:'Block 1 feels four forces (gravity, normal, kinetic friction down the ramp, tension up the ramp). Block 2 feels two. Block 2 does not pull on block 1 directly: the string does.',
  accel:{
    1:{ correct:'upramp', opts:[ {id:'upramp',t:'Up the ramp'}, {id:'down',t:'Down the ramp'}, {id:'horiz',t:'Horizontally to the right'}, {id:'zero',t:'Zero'} ],
        fb:{ down:'Block 1 moves up the ramp while speeding up, so its acceleration points up the ramp.', horiz:'Block 1 moves along the ramp, so its acceleration is along the ramp.', zero:'The blocks are speeding up.' } },
    2:{ correct:'down', opts:[ {id:'down',t:'Downward'}, {id:'upramp',t:'Up the ramp, like block 1'}, {id:'zero',t:'Zero'} ],
        fb:{ upramp:'The pulley changes the direction of motion: block 2 moves straight down while speeding up.', zero:'The blocks are speeding up.' } } },
  distract:{ 1:['other:g2','neg:f1','ma'], 2:['other:T1','neg:g2','net'] },
  links:[
    { q:'How do the magnitudes of the two accelerations compare?', correct:'same',
      opts:[ {id:'same',t:'Same magnitude a, in different directions'}, {id:'diff',t:'Different: block 2 falls freely with g'} ],
      fb:{ diff:'Block 2 is held back by the string, so it does not fall freely. The string does not stretch, so both blocks share the magnitude a.' } },
    { q:'How do F<sub>T1</sub> and F<sub>T2</sub> compare?', correct:'equal',
      opts:[ {id:'equal',t:'Equal: one light string over a light, frictionless pulley'}, {id:'weight',t:'F_T2 equals the weight of block 2'}, {id:'t1',t:'F_T1 is smaller, because the pulley takes some of the force'} ],
      fb:{ weight:'Only if block 2 did not accelerate. It speeds up downward, so the string pulls up on it with less than its weight.',
           t1:'An ideal (light, frictionless) pulley changes the direction of the tension, not its size.' } }
  ],
  wrap2:'The pulley bends the string, so the two accelerations point in different directions but share one magnitude <i>a</i>.',
  axes:{ correct:'motion',
    opts:[ {id:'motion', t:'Block 1: x up the ramp, y perpendicular to it. Block 2: x downward, along its motion'},
           {id:'std', t:'Both blocks: x horizontal, y vertical (positive up)', fb:'Workable, but block 1\u2019s normal force, friction, tension and acceleration would all split into two components, and block 2 would need \u2212a. Choose axes along each block\u2019s motion.'} ],
    bodies:{ 1:{ dirs:[{n:'x',d:30},{n:'y',d:120}], xdesc:'up the ramp (y perpendicular to the ramp, away from it)', marks:[{a1:270,a2:300,l:'\u03B8'}] },
             2:{ dirs:[{n:'x',d:270},{n:'y',d:0}], xdesc:'downward, along block 2\u2019s motion', marks:[] } } },
  angles:{ g1:['\u03B8'], N1:['\u03B8'], f1:['\u03B8'], T1:['\u03B8'] },
  comps:{
    1:[ { axis:'x', terms:{ g1:'-s0', N1:'0', f1:'-', T1:'+' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'+m1a' },
        { axis:'y', terms:{ g1:'-c0', N1:'+', f1:'0', T1:'0' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'0' } ],
    2:[ { axis:'x', terms:{ g2:'+', T2:'-' }, rhsOpts:['0','+m2a','-m2a','+m2g','+mta'], rhs:'+m2a' } ]
  },
  wrap4:'Add block 1\u2019s x-equation and block 2\u2019s equation: the tension cancels, giving {g2} \u2212 {g1} sin <i>\u03B8</i> \u2212 {f1} = (<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i>. Choosing \u201Cpositive along the motion\u201D for each block is what makes this sum work.'
},
/* 4 ------------------------------------------------- two inclines */
{
  id:'twin', tab:'Two ramps', title:'Blocks on two ramps joined over a pulley',
  desc:'Block 1 sits on a smooth ramp at <i>\u03B8</i><sub>1</sub> = 30\u00B0, block 2 on a smooth ramp at <i>\u03B8</i><sub>2</sub> = 50\u00B0. A light string over a light, frictionless pulley at the peak joins them. Block 2 slides down its ramp and block 1 slides up its ramp; both are <b>speeding up</b>.',
  aria:'Scene: two smooth ramps meet at a peak with a pulley on top. The left ramp rises at theta 1 of 30 degrees and holds block 1. The right ramp falls at theta 2 of 50 degrees and holds block 2. A string over the pulley joins the blocks. Dashed velocity arrows: block 1 moves up its ramp toward the peak, block 2 moves down its ramp away from the peak.',
  forces:[
    { slot:'g1', body:1, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'In this rotated diagram, gravity makes \u03B8\u2081 = 30\u00B0 with \u2212y, leaning toward \u2212x (down the ramp): 240\u00B0 from +x.' },
    { slot:'N1', body:1, types:['norm'], agents:['surface'], dir:120, miss:'Block 1 rests on its ramp.', tip:'Perpendicular to the ramp: exactly +y (90\u00B0).' },
    { slot:'T1', body:1, types:['ten'],  agents:['string'],  dir:30,  miss:'The string pulls block 1 toward the pulley.', tip:'Toward the pulley, parallel to the ramp: +x (0\u00B0).' },
    { slot:'g2', body:2, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'In this rotated diagram, gravity makes \u03B8\u2082 = 50\u00B0 with \u2212y, leaning toward +x (down block 2\u2019s ramp): 320\u00B0 from +x.' },
    { slot:'N2', body:2, types:['norm'], agents:['surface'], dir:40,  miss:'Block 2 rests on its ramp.', tip:'Perpendicular to the ramp: exactly +y (90\u00B0).' },
    { slot:'T2', body:2, types:['ten'],  agents:['string'],  dir:130, miss:'The string pulls block 2 back toward the pulley.', tip:'Toward the pulley, up the ramp: \u2212x (180\u00B0), because +x points down block 2\u2019s ramp, along its motion.' }
  ],
  absent:{ '1:fric':'Both ramps are smooth (frictionless).', '2:fric':'Both ramps are smooth (frictionless).',
           '1:app':'No person is involved here.', '2:app':'No person is involved here.' },
  agentMsg:{ '1:ten:b2':'Block 2 never touches block 1; the string pulls on each block.', '2:ten:b1':'Block 1 never touches block 2; the string pulls on each block.' },
  wrap1:'Three forces on each block: gravity, the normal force from its own ramp, and the string\u2019s pull toward the pulley. No friction: the ramps are smooth.',
  accel:{
    1:{ correct:'upramp', opts:[ {id:'upramp',t:'Up its ramp, toward the pulley'}, {id:'down',t:'Down its ramp'}, {id:'horiz',t:'Horizontally'}, {id:'zero',t:'Zero'} ],
        fb:{ down:'Block 1 moves up its ramp while speeding up.', horiz:'Block 1 moves along its ramp, so its acceleration is along the ramp.', zero:'The blocks are speeding up.' } },
    2:{ correct:'downramp', opts:[ {id:'downramp',t:'Down its ramp, away from the pulley'}, {id:'down',t:'Straight down'}, {id:'upramp',t:'Up its ramp'}, {id:'zero',t:'Zero'} ],
        fb:{ down:'Block 2 is not falling freely; it slides along its ramp, so its acceleration is along the ramp.', upramp:'Block 2 moves down its ramp while speeding up.', zero:'The blocks are speeding up.' } } },
  distract:{ 1:['other:T2','neg:g1','mag:N1'], 2:['other:T1','neg:T2','ma'] },
  links:[
    { q:'How do the magnitudes of the two accelerations compare?', correct:'same',
      opts:[ {id:'same',t:'Same magnitude a'}, {id:'steep',t:'Block 2\u2019s is larger, because its ramp is steeper'} ],
      fb:{ steep:'The string does not stretch, so the blocks always move the same distance along their ramps: same acceleration magnitude.' } },
    { q:'How do F<sub>T1</sub> and F<sub>T2</sub> compare?', correct:'equal',
      opts:[ {id:'equal',t:'Equal: one light string over an ideal pulley'}, {id:'angle',t:'They differ by the ratio of the ramp angles'} ],
      fb:{ angle:'An ideal pulley changes the direction of the tension, not its size. The ramp angles affect the gravity components, not the tension.' } }
  ],
  wrap2:'Two equations with three unknown magnitudes in total (two normal forces cancel out in the motion direction later). The constraints \u2014 same <i>a</i>, same F<sub>T</sub> \u2014 link them.',
  axes:{ correct:'motion',
    opts:[ {id:'motion', t:'For each block: x along its ramp in its direction of motion, y perpendicular to its ramp'},
           {id:'std', t:'Both blocks: x horizontal, y vertical', fb:'Workable, but every force except gravity, and both accelerations, would split into two components. Tilt each block\u2019s axes along its own ramp.'} ],
    bodies:{ 1:{ dirs:[{n:'x',d:30},{n:'y',d:120}], xdesc:'up block 1\u2019s ramp, toward the pulley (y perpendicular to the ramp)', marks:[{a1:270,a2:300,l:'\u03B8\u2081'}] },
             2:{ dirs:[{n:'x',d:310},{n:'y',d:40}],  xdesc:'down block 2\u2019s ramp, away from the pulley (y perpendicular to the ramp)', marks:[{a1:220,a2:270,l:'\u03B8\u2082'}] } } },
  angles:{ g1:['\u03B8\u2081','\u03B8\u2082'], N1:['\u03B8\u2081'], T1:['\u03B8\u2081'], g2:['\u03B8\u2082','\u03B8\u2081'], N2:['\u03B8\u2082'], T2:['\u03B8\u2082'] },
  comps:{
    1:[ { axis:'x', terms:{ g1:'-s0', N1:'0', T1:'+' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'+m1a' },
        { axis:'y', terms:{ g1:'-c0', N1:'+', T1:'0' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'0' } ],
    2:[ { axis:'x', terms:{ g2:'+s0', N2:'0', T2:'-' }, rhsOpts:['0','+m2a','-m2a','+mta'], rhs:'+m2a' },
        { axis:'y', terms:{ g2:'-c0', N2:'+', T2:'0' }, rhsOpts:['0','+m2a','-m2a','+mta'], rhs:'0' } ]
  },
  wrap4:'Add the two x-equations: {g2} sin <i>\u03B8</i><sub>2</sub> \u2212 {g1} sin <i>\u03B8</i><sub>1</sub> = (<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i>. Block 2 wins only if <i>m</i><sub>2</sub> sin <i>\u03B8</i><sub>2</sub> &gt; <i>m</i><sub>1</sub> sin <i>\u03B8</i><sub>1</sub>: the steeper ramp gives gravity a larger component along the motion.'
},
/* 5 ------------------------------------------------- stacked blocks */
{
  id:'stack', tab:'Stacked blocks', title:'Two stacked blocks, bottom one pushed',
  desc:'Block 2 rests on top of block 1, which sits on a <b>smooth</b> (frictionless) floor. A person pushes block 1 with a force directed <i>\u03C6</i> = 20\u00B0 <b>below</b> the horizontal. The blocks move together, without slipping, and are <b>speeding up</b> to the right. The surface between the blocks is rough.',
  aria:'Scene: a large block 1 on a smooth floor with a smaller block 2 on top of it. A push rod meets the left side of block 1, coming from the upper left at angle phi of 20 degrees below a dashed horizontal line. A dashed velocity arrow above the blocks points right.',
  forces:[
    { slot:'g1',  body:1, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'N1',  body:1, types:['norm'], agents:['surface'], dir:90,  miss:'Block 1 rests on the floor, which pushes up on it.', tip:'The floor pushes straight up (90\u00B0).' },
    { slot:'N12', body:1, types:['norm'], agents:['b2'],      dir:270, miss:'Block 2 sits on block 1 and presses down on its top surface.', tip:'Block 2 presses down on block 1 (270\u00B0): the partner of the normal force block 1 exerts up on block 2.' },
    { slot:'f12', body:1, types:['fric'], agents:['b2'],      dir:180, miss:'The rough contact between the blocks also gives block 1 a friction force.', tip:'Friction on block 1 by block 2 points left (180\u00B0): the third-law partner of the forward friction on block 2.' },
    { slot:'A',   body:1, types:['app'],  agents:['person'],  dir:340, miss:'The person pushes block 1.', tip:'The push is 20\u00B0 below the horizontal: 340\u00B0.' },
    { slot:'g2',  body:2, types:['grav'], agents:['earth'],   dir:270, miss:'Earth pulls on every block.', tip:'Gravity points straight down (270\u00B0).' },
    { slot:'N21', body:2, types:['norm'], agents:['b1'],      dir:90,  miss:'Block 2 rests on block 1, which pushes up on it.', tip:'Block 1 pushes straight up on block 2 (90\u00B0).' },
    { slot:'f21', body:2, types:['fric'], agents:['b1'],      dir:0,   miss:'Block 2 speeds up to the right, so something must push it horizontally. Only one thing touches it.', tip:'Static friction from block 1 drags block 2 forward: to the right (0\u00B0).' }
  ],
  absent:{ '2:app':'The person pushes block 1 only. Block 2 is carried along by friction from block 1.',
           '2:ten':'No strings here.', '1:ten':'No strings here.' },
  agentMsg:{ '1:fric:surface':'The floor is smooth, so it exerts no friction. The friction on block 1 comes from block 2, along their rough contact surface.',
             '2:norm:surface':'Block 2 does not touch the floor. Its supporting surface is the top of block 1.',
             '2:fric:surface':'Block 2 does not touch the floor. Its friction comes from the top of block 1.',
             '1:norm:b1':'A block cannot push on itself.' },
  wrap1:'Block 1 feels five forces, two of them from block 2 (a normal force pressing down and friction pointing back). Block 2 feels three: gravity, block 1\u2019s upward normal force, and static friction pointing <b>forward</b> \u2014 the only horizontal force on it. Block 2\u2019s weight is not a force on block 1.',
  accel:{
    1:{ correct:'right', opts:[ {id:'right',t:'To the right'}, {id:'push',t:'Along the push, 20\u00B0 below horizontal'}, {id:'zero',t:'Zero'} ],
        fb:{ push:'Block 1 stays on the floor, so it accelerates horizontally.', zero:'The blocks are speeding up.' } },
    2:{ correct:'right', opts:[ {id:'right',t:'To the right, with block 1'}, {id:'zero',t:'Zero: it just rides along'}, {id:'left',t:'To the left, since it lags behind'} ],
        fb:{ zero:'\u201CRiding along\u201D with an accelerating block means accelerating too. Block 2 speeds up, so it accelerates to the right \u2014 and something must push it: static friction.',
             left:'Block 2 does not slip, so it moves exactly with block 1: acceleration to the right.' } } },
  distract:{ 1:['other:N21','other:g2','neg:f12','net'], 2:['other:A','other:f12','ma'] },
  links:[
    { q:'How do the magnitudes of the two accelerations compare?', correct:'same',
      opts:[ {id:'same',t:'Same magnitude a: the blocks do not slip'}, {id:'less',t:'Block 2\u2019s is smaller, because only friction pushes it'} ],
      fb:{ less:'Without slipping, the blocks have the same velocity at every instant, hence the same acceleration. Static friction adjusts to whatever is needed, up to its maximum.' } },
    { q:'How are F<sub>N,12</sub> (block 2 on block 1) and F<sub>N,21</sub> (block 1 on block 2) related?', correct:'third',
      opts:[ {id:'third',t:'Equal magnitudes, opposite directions: a Newton\u2019s third-law pair'}, {id:'weight',t:'F_N,12 is the weight of block 2'}, {id:'unrel',t:'Unrelated, because they act on different blocks'} ],
      fb:{ weight:'Its size happens to equal <i>m</i><sub>2</sub><i>g</i> here (block 2 has no vertical acceleration), but it is a contact force exerted by block 2, not gravity. Block 2\u2019s weight acts on block 2.',
           unrel:'Acting on different blocks is exactly what third-law partners do: block 1 pushes on block 2, block 2 pushes back on block 1, equally and oppositely.' } }
  ],
  wrap2:'The blocks interact through two third-law pairs: F\u20D7<sub>N,12</sub> = \u2212F\u20D7<sub>N,21</sub> and F\u20D7<sub>f,12</sub> = \u2212F\u20D7<sub>f,21</sub>. Each member appears in a different block\u2019s equation.',
  axes:{ correct:'std',
    opts:[ {id:'std', t:'For both blocks: x horizontal (along the motion), y vertical'},
           {id:'push', t:'Block 1: x along the push (20\u00B0 below horizontal); block 2: x horizontal', fb:'Then all four other forces on block 1, and its acceleration, would have two components. Put x along the acceleration.'} ],
    bodies:{ 1:{ dirs:[{n:'x',d:0},{n:'y',d:90}], xdesc:'to the right', marks:[{a1:340,a2:360,l:'\u03C6'}] }, 2:{ dirs:[{n:'x',d:0},{n:'y',d:90}], xdesc:'to the right', marks:[] } } },
  angles:{ A:['\u03C6'], g1:['\u03C6'], N1:['\u03C6'] },
  comps:{
    1:[ { axis:'x', terms:{ g1:'0', N1:'0', N12:'0', f12:'-', A:'+c0' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'+m1a' },
        { axis:'y', terms:{ g1:'-', N1:'+', N12:'-', f12:'0', A:'-s0' }, rhsOpts:['0','+m1a','-m1a','+mta'], rhs:'0' } ],
    2:[ { axis:'x', terms:{ g2:'0', N21:'0', f21:'+' }, rhsOpts:['0','+m2a','-m2a','+mta'], rhs:'+m2a' },
        { axis:'y', terms:{ g2:'-', N21:'+', f21:'0' }, rhsOpts:['0','+m2a','-m2a','+m2g','+mta'], rhs:'0' } ]
  },
  wrap4:'Static friction is the only horizontal force on block 2, so {f21} = <i>m</i><sub>2</sub><i>a</i>. Its third-law partner {f12} has the same size, so adding the x-equations gives {A} cos <i>\u03C6</i> = (<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<i>a</i>. Block 1\u2019s y-equation gives {N1} = {g1} + {N12} + {A} sin <i>\u03C6</i>: the floor supports both blocks <b>and</b> the downward part of the push.'
}
];

/* ---------------------------------------------------------------------
   SYMBOLS
   --------------------------------------------------------------------- */
TB.esc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
TB.symH = function(key, vec, useMag){
  var L = TB.LBL[key], sub = useMag && L.mag ? L.mag : L.sub;
  return '<span class="ntsym' + (vec ? ' ntvec' : '') + '" aria-hidden="true"><span class="ntb">F</span><sub>' + sub + '</sub></span>';
};
TB.symT = function(key, useMag){ var L = TB.LBL[key]; return 'F_' + (useMag && L.mag ? L.mag : L.sub); };
TB.symSpeak = function(key, vec){ return (vec ? 'vector ' : '') + 'F sub ' + TB.LBL[key].sub.replace(',', ' '); };
TB.colorClass = function(key){ var t = TB.LBL[key] ? TB.LBL[key].type : 'other'; return 'ntk-' + (t === 'ten' || t === 'grav' || t === 'norm' || t === 'fric' || t === 'app' ? t : 'other'); };
TB.vecify = function(html){
  return String(html).replace(/([A-Za-z0-9])\u20D7/g, '<span class="ntsym ntvec"><span class="ntb">$1</span></span>');
};
TB.fillWrap = function(text){
  return text.replace(/\{(\w+)\}/g, function(m, k){ return TB.LBL[k] ? TB.symH(k, false, true) : m; });
};
/* real-world angle of block b's +x axis (each FBD is drawn rotated by this) */
TB.frame = function(i, b){ var a = TB.SITS[i].axes.bodies[b].dirs; for (var j=0;j<a.length;j++) if (a[j].n === 'x') return a[j].d; return 0; };
TB.bodyForces = function(i, b){ return TB.SITS[i].forces.filter(function(f){ return f.body === b; }); };
TB.findForce = function(i, slot){ var f = TB.SITS[i].forces; for (var j=0;j<f.length;j++) if (f[j].slot===slot) return f[j]; return null; };

/* ---------------------------------------------------------------------
   SHARED STATE, REPORTING
   --------------------------------------------------------------------- */
TB.shared = function(thisq){
  var k = 'tbShared_' + thisq;
  if (!window[k]) {
    var sits = [];
    for (var i=0;i<TB.SITS.length;i++) sits.push({ done:[false,false,false,false], tries:[0,0,0,0] });
    window[k] = { a11y:{ lm:false, nr:true, hc:false, cb:false, fs:0 }, sits:sits, finishedAt:null,
                  reportPart: (typeof window.tbReportPart === 'number') ? window.tbReportPart : null };
  }
  return window[k];
};
TB.report = function(thisq){
  var sh = TB.shared(thisq);
  if (sh.reportPart === null) return;
  var pad = String(sh.reportPart); while (pad.length < 3) pad = '0' + pad;
  var box = document.getElementById('qn' + thisq + pad);
  if (!box) return;
  var stagesDone = 0;
  for (var s=0;s<4;s++){ var all = true; for (var i=0;i<sh.sits.length;i++) if (!sh.sits[i].done[s]) all = false; if (all) stagesDone++; }
  var val = stagesDone === 4 ? 'complete' : ('incomplete:' + stagesDone);
  if (box.value === val) return;
  box.value = val;
  ['input','change'].forEach(function(t){
    var ev; try { ev = new Event(t, { bubbles:true }); } catch(e){ ev = document.createEvent('Event'); ev.initEvent(t, true, true); }
    box.dispatchEvent(ev);
  });
};

/* ---------------------------------------------------------------------
   ACCESSIBILITY + SHELL
   --------------------------------------------------------------------- */
TB.STAGE_NAMES = ['Identify the forces','Newton\u2019s 2nd law (vectors)','Free-body diagrams','Components'];
TB.ids = function(thisq, n){ return function(name){ return 'tb' + n + name + '_' + thisq; }; };

TB.toolbarHTML = function(thisq, n){
  function b(k, label, on){
    return '<button type="button" class="nta11ybtn' + (on ? ' nta11yon' : '') + '" data-a11y="' + k + '" aria-pressed="' + (on?'true':'false') + '">' + label + '</button>';
  }
  return '<div class="nta11y" role="toolbar" aria-label="Display options">'
    + b('lm','LIGHT MODE',false) + b('nr','NARRATION: ON',true) + b('hc','HIGH CONTRAST',false)
    + b('cb','COLOR-BLIND SAFE',false) + b('fs','FONT SIZE: NORMAL',false) + '</div>'
    + '<div class="ntnarbar ntnarshow" id="tb' + n + 'Nar_' + thisq + '" role="status" aria-live="polite" aria-atomic="true"></div>';
};
TB.headerHTML = function(n, subtitle){
  var pills = '';
  for (var s=1;s<=4;s++){
    pills += '<li class="ntpill' + (s===n ? ' ntpillactive' : (s<n ? ' ntpilldone' : '')) + '"' + (s===n ? ' aria-current="step"' : '') + '>'
          + s + '. ' + TB.STAGE_NAMES[s-1] + (s<n ? '<span class="ntsr"> (completed)</span>' : '') + '</li>';
  }
  return '<h3 class="nttitle">Two-body systems \u2014 Stage ' + n + ': ' + TB.STAGE_NAMES[n-1] + '</h3>'
    + '<p class="ntsubtitle">' + subtitle + '</p>'
    + '<ol class="ntstagebar" aria-label="Tutorial stages">' + pills + '</ol>';
};
TB.applyA11y = function(host, thisq){
  var a = TB.shared(thisq).a11y, root = host.querySelector('.ntroot'); if (!root) return;
  root.classList.toggle('ntlm', a.lm); root.classList.toggle('nthc', a.hc); root.classList.toggle('ntcb', a.cb);
  root.style.setProperty('--ntfs', ['15px','17px','20px'][a.fs]);
  var labels = { lm:'LIGHT MODE', hc:'HIGH CONTRAST', cb:'COLOR-BLIND SAFE' };
  var btns = root.querySelectorAll('.nta11ybtn');
  for (var i=0;i<btns.length;i++){
    var k = btns[i].getAttribute('data-a11y'), on = k === 'fs' ? a.fs > 0 : !!a[k];
    btns[i].classList.toggle('nta11yon', on);
    btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    btns[i].textContent = k === 'nr' ? ('NARRATION: ' + (a.nr ? 'ON' : 'OFF')) : k === 'fs' ? ('FONT SIZE: ' + ['NORMAL','LARGE','XL'][a.fs]) : labels[k];
  }
  var nar = root.querySelector('.ntnarbar'); if (nar) nar.classList.toggle('ntnarshow', a.nr);
};
TB.announce = function(thisq, n, msg){
  var plain = String(msg).replace(/<[^>]+>/g,'').replace(/\u20D7/g,'');
  var nar = document.getElementById('tb' + n + 'Nar_' + thisq), live = document.getElementById('tb' + n + 'Live_' + thisq);
  if (nar && TB.shared(thisq).a11y.nr) nar.textContent = plain;
  if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = plain; }, 60); }
};
TB.tabsHTML = function(thisq, n, cur){
  var sh = TB.shared(thisq), html = '<div class="nttabs" role="group" aria-label="Situations">';
  for (var i=0;i<TB.SITS.length;i++){
    var done = sh.sits[i].done[n-1], unlocked = done || i === 0 || sh.sits[i-1].done[n-1];
    html += '<button type="button" class="nttab' + (i===cur ? ' nttabcur' : '') + (done ? ' nttabdone' : '') + '" data-sit="' + i + '"'
      + (unlocked ? '' : ' disabled') + (i===cur ? ' aria-current="true"' : '') + '><span class="nttabn">' + (i+1) + '</span> ' + TB.SITS[i].tab
      + (done ? ' <span aria-hidden="true">\u2713</span><span class="ntsr"> (done)</span>' : (unlocked ? '' : '<span class="ntsr"> (locked)</span>')) + '</button>';
  }
  return html + '</div>';
};
TB.sceneCardHTML = function(i){
  var S = TB.SITS[i];
  return '<figure class="ntscene"><svg class="ntscenesvg" viewBox="0 0 360 220" role="img" aria-label="' + TB.esc(S.aria) + '">' + TB.sceneSVG(i) + '</svg>'
    + '<figcaption><span class="ntscenet">' + (i+1) + '. ' + S.title + '</span><span class="ntscened">' + S.desc + '</span>'
    + '<span class="tblegend">Labels: F<sub>N1</sub> = normal force on block 1 by the surface; F<sub>N,12</sub> = normal force <b>on</b> block 1 <b>by</b> block 2.</span></figcaption></figure>';
};
TB.allDone = function(thisq, n){ var sh = TB.shared(thisq); for (var i=0;i<sh.sits.length;i++) if (!sh.sits[i].done[n-1]) return false; return true; };
TB.completeStage = function(thisq, n){
  TB.report(thisq);
  document.dispatchEvent(new CustomEvent('tbStageComplete', { detail:{ stage:n, thisq:thisq } }));
  var hook = window['tbOnStageComplete_' + thisq]; if (typeof hook === 'function') hook(n);
};
TB.mount = function(thisq, n, rootElId, opts){
  var id = TB.ids(thisq, n);
  function build(){
    var host = document.getElementById(rootElId); if (!host) return false;
    host.innerHTML = '<div class="ntroot" role="region" aria-label="' + TB.esc(opts.label) + '">'
      + TB.toolbarHTML(thisq, n) + TB.headerHTML(n, opts.subtitle)
      + '<div id="' + id('Tabs') + '"></div>'
      + '<div class="ntlayout"><div class="tbsticky" id="' + id('Scene') + '"></div>'
      + '<section class="ntwork" id="' + id('Work') + '" aria-label="Your work"></section></div>'
      + '<div class="ntcomplete" id="' + id('Comp') + '" role="status"></div>'
      + '<span class="ntsr" id="' + id('Live') + '" aria-live="polite" aria-atomic="true"></span></div>';
    var btns = host.querySelectorAll('.nta11ybtn');
    for (var b=0;b<btns.length;b++) btns[b].addEventListener('click', function(){
      var a = TB.shared(thisq).a11y, k = this.getAttribute('data-a11y');
      if (k === 'fs') a.fs = (a.fs + 1) % 3; else a[k] = !a[k];
      if (k === 'hc' && a.hc) a.lm = false;
      if (k === 'lm' && a.lm) a.hc = false;
      document.dispatchEvent(new CustomEvent('tbA11yChange', { detail:{ thisq:thisq } }));
    });
    TB.applyA11y(host, thisq);
    document.getElementById(id('Tabs')).addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('.nttab') : null;
      if (!t || t.disabled) return;
      opts.onTab(parseInt(t.getAttribute('data-sit'), 10));
    });
    document.addEventListener('tbA11yChange', function(e){ if (e.detail.thisq === thisq) TB.applyA11y(host, thisq); });
    document.addEventListener('tbStageComplete', function(e){
      if (e.detail.thisq === thisq && e.detail.stage === n - 1) { opts.render(); if (opts.onShow) opts.onShow(); }
    });
    opts.render();
    return true;
  }
  var tries = 0;
  (function go(){ if (build()) return; if (tries++ < 50) setTimeout(go, 100); })();
};
TB.renderTabsScene = function(thisq, n, cur){
  var id = TB.ids(thisq, n);
  document.getElementById(id('Tabs')).innerHTML = TB.tabsHTML(thisq, n, cur);
  document.getElementById(id('Scene')).innerHTML = TB.sceneCardHTML(cur);
};
TB.focusHeading = function(thisq, n){
  var h = document.getElementById(TB.ids(thisq, n)('WorkH'));
  if (h) { try { h.focus({ preventScroll:true }); } catch(e){ h.focus(); } }
};
TB.nextButtonHTML = function(thisq, n, cur){
  if (cur >= TB.SITS.length - 1) return '';
  return '<div class="ntbtnrow" style="margin-top:8px"><button type="button" class="ntbtn ntbtnnext" id="' + TB.ids(thisq, n)('Next') + '">Go to situation ' + (cur+2) + ': ' + TB.SITS[cur+1].tab + '</button></div>';
};
TB.showStageComplete = function(thisq, n, msg){
  var id = TB.ids(thisq, n), comp = document.getElementById(id('Comp')); if (!comp) return;
  var btn = n < 4 ? '<button type="button" class="ntbtn ntbtnnext" id="' + id('Cont') + '">Continue to Stage ' + (n+1) + ': ' + TB.STAGE_NAMES[n] + '</button>' : '';
  comp.innerHTML = '<h4>Stage ' + n + ' complete</h4><p>' + msg + '</p>' + (btn ? '<div class="ntbtnrow" style="margin-top:8px">' + btn + '</div>' : '');
  comp.classList.add('ntshow');
  var b = document.getElementById(id('Cont'));
  if (b) b.addEventListener('click', function(){ TB.completeStage(thisq, n); TB.announce(thisq, n, 'Stage ' + (n+1) + ' is open below.'); });
};
TB.setFb = function(el, html, tone){
  if (!el) return;
  el.className = 'ntfb' + (tone ? ' ntfb' + tone : '');
  el.innerHTML = TB.vecify(html);
};

/* ---------------------------------------------------------------------
   SVG HELPERS
   --------------------------------------------------------------------- */
function r2(v){ return Math.round(v*10)/10; }
TB.arrow = function(x1,y1,x2,y2,cls,opt){
  opt = opt || {};
  var dx=x2-x1, dy=y2-y1, L=Math.sqrt(dx*dx+dy*dy); if (L<2) return '';
  var ux=dx/L, uy=dy/L, hl=opt.head||12, hw=hl*0.45, bx=x2-ux*hl, by=y2-uy*hl;
  return '<g class="' + cls + '"><line x1="'+r2(x1)+'" y1="'+r2(y1)+'" x2="'+r2(bx)+'" y2="'+r2(by)+'" class="ntline"' + (opt.dash?' stroke-dasharray="6 5"':'') + '/>'
    + '<polygon class="nthead" points="'+r2(x2)+','+r2(y2)+' '+r2(bx-uy*hw)+','+r2(by+ux*hw)+' '+r2(bx+uy*hw)+','+r2(by-ux*hw)+'"/></g>';
};
TB.vecLabel = function(x, y, key, cls){
  var sub = TB.LBL[key].sub, w = 12 + sub.length*7, x0 = x - w/2;
  return '<g class="' + cls + ' ntvl"><text x="'+r2(x0)+'" y="'+r2(y+6)+'" class="ntvlt">F<tspan class="ntvls" dy="5">' + sub + '</tspan></text>'
    + '<path class="ntvla" d="M'+r2(x0+1)+' '+r2(y-10)+' h11 m-4 -3 l4 3 l-4 3"/></g>';
};
TB.angleArc = function(cx, cy, r, a1, a2, label, cls){
  var p1 = [cx + r*Math.cos(a1*Math.PI/180), cy - r*Math.sin(a1*Math.PI/180)];
  var p2 = [cx + r*Math.cos(a2*Math.PI/180), cy - r*Math.sin(a2*Math.PI/180)];
  var mid = (a1+a2)/2, lr = r + 14;
  return '<g class="' + (cls||'ntarc') + '"><path d="M'+r2(p1[0])+' '+r2(p1[1])+' A'+r+' '+r+' 0 '+(Math.abs(a2-a1)>180?1:0)+' '+(a2>a1?0:1)+' '+r2(p2[0])+' '+r2(p2[1])+'"/>'
    + '<text x="'+r2(cx+lr*Math.cos(mid*Math.PI/180))+'" y="'+r2(cy-lr*Math.sin(mid*Math.PI/180)+5)+'" text-anchor="middle">' + label + '</text></g>';
};

/* ---------------------------------------------------------------------
   SCENES (no force arrows)
   --------------------------------------------------------------------- */
function vel(x1,y1,x2,y2,lx,ly){ return TB.arrow(x1,y1,x2,y2,'ntscvel',{dash:true}) + '<text class="ntsclbl" x="'+lx+'" y="'+ly+'">v</text>'; }
function blockLbl(x,y,t){ return '<text class="tbblk" x="'+x+'" y="'+y+'" text-anchor="middle">' + t + '</text>'; }
TB.sceneSVG = function(i){
  var s = '';
  if (i === 0){
    s += '<rect class="ntscsupport" x="120" y="8" width="120" height="7"/><line class="ntscrope" x1="180" y1="15" x2="180" y2="40"/>';
    s += '<circle class="ntscobj" cx="180" cy="44" r="22"/><circle class="ntscpivot" cx="180" cy="44" r="3"/>';
    s += '<line class="ntscrope" x1="158" y1="44" x2="158" y2="122"/><line class="ntscrope" x1="202" y1="44" x2="202" y2="96"/>';
    s += '<rect class="ntscobj" x="141" y="122" width="34" height="30" rx="3"/>' + blockLbl(158,142,'1');
    s += '<rect class="ntscobj" x="181" y="96" width="42" height="46" rx="3"/>' + blockLbl(202,124,'2');
    s += vel(126,152,126,112,108,136) + vel(240,98,240,142,248,124);
    s += '<text class="ntscnote" x="20" y="208">released from rest \u2022 m\u2082 &gt; m\u2081</text>';
  }
  else if (i === 1){
    s += '<line class="ntscground" x1="14" y1="160" x2="346" y2="160"/>';
    for (var h=20; h<346; h+=14) s += '<line class="ntschatch" x1="'+h+'" y1="160" x2="'+(h-10)+'" y2="172"/>';
    s += '<rect class="ntscobj" x="44" y="122" width="60" height="38" rx="3"/>' + blockLbl(74,146,'2');
    s += '<rect class="ntscobj" x="160" y="112" width="70" height="48" rx="3"/>' + blockLbl(195,141,'1');
    s += '<line class="ntscrope" x1="104" y1="140" x2="160" y2="140"/>';
    s += '<line class="ntscrope" x1="230" y1="130" x2="310" y2="84"/><circle class="ntschand" cx="314" cy="82" r="7"/>';
    s += '<line class="ntscref" x1="230" y1="130" x2="304" y2="130"/>' + TB.angleArc(230,130,44,0,30,'\u03B8','ntscarc');
    s += vel(60,96,150,96,98,88);
    s += '<text class="ntscnote" x="14" y="200">rough floor \u2022 speeding up</text>';
  }
  else if (i === 2){
    s += '<polygon class="ntscramp" points="20,200 284,200 284,47.6"/>' + TB.angleArc(20,200,42,0,30,'\u03B8','ntscarc');
    s += '<g transform="translate(149.9 125) rotate(-30)"><rect class="ntscobj" x="-24" y="-32" width="48" height="32" rx="3"/></g>' + blockLbl(150,112,'1');
    s += '<line class="ntscrope" x1="162.7" y1="99.1" x2="286" y2="27.9"/>';
    s += '<line class="ntscrope" x1="284" y1="47.6" x2="290" y2="36"/><circle class="ntscobj" cx="290" cy="36" r="9"/>';
    s += '<line class="ntscrope" x1="299" y1="36" x2="299" y2="118"/>';
    s += '<rect class="ntscobj" x="288" y="118" width="24" height="34" rx="3"/>' + blockLbl(300,140,'2');
    s += vel(112,96,156,71,118,72) + vel(328,112,328,158,334,140);
    s += '<text class="ntscnote" x="20" y="214">rough ramp \u2022 speeding up</text>';
  }
  else if (i === 3){
    s += '<polygon class="ntscramp" points="24.1,200 180,110 255.5,200"/>';
    s += TB.angleArc(24.1,200,40,0,30,'\u03B8\u2081','ntscarc') + TB.angleArc(255.5,200,34,130,180,'\u03B8\u2082','ntscarc');
    s += '<g transform="translate(110.7 150) rotate(-30)"><rect class="ntscobj" x="-20" y="-28" width="40" height="28" rx="3"/></g>' + blockLbl(104,138,'1');
    s += '<g transform="translate(218.6 156) rotate(50)"><rect class="ntscobj" x="-18" y="-26" width="36" height="26" rx="3"/></g>' + blockLbl(232,148,'2');
    s += '<line class="ntscrope" x1="121" y1="127.9" x2="173" y2="98.5"/><line class="ntscrope" x1="217" y1="133.9" x2="187" y2="98.5"/>';
    s += '<line class="ntscrope" x1="180" y1="110" x2="180" y2="100"/><circle class="ntscobj" cx="180" cy="98" r="8"/>';
    s += vel(66,128,104,106,70,110) + vel(244,118,272,151,272,128);
    s += '<text class="ntscnote" x="20" y="214">smooth ramps \u2022 speeding up</text>';
  }
  else {
    s += '<line class="ntscground" x1="14" y1="170" x2="346" y2="170"/>';
    s += '<rect class="ntscobj" x="120" y="120" width="140" height="50" rx="3"/>' + blockLbl(190,152,'1');
    s += '<rect class="ntscobj" x="162" y="88" width="56" height="32" rx="3"/>' + blockLbl(190,110,'2');
    s += '<line class="ntscrod" x1="54" y1="116" x2="119" y2="139.7"/><circle class="ntschand" cx="50" cy="114.5" r="7"/>';
    s += '<line class="ntscref" x1="120" y1="140" x2="66" y2="140"/>' + TB.angleArc(120,140,46,160,180,'\u03C6','ntscarc');
    s += vel(170,72,250,72,204,64);
    s += '<text class="ntscnote" x="14" y="196">smooth floor \u2022 rough contact between blocks</text>';
    s += '<text class="ntscnote" x="14" y="212">blocks move together, speeding up</text>';
  }
  return s;
};

window.TBCore = TB;
})();
