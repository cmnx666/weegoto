import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/scripts/brain-intro.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('brain-intro.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = new Map();
let replay;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(ast));
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'addEventListener'
      && node.expression.expression.getText(ast) === "$('replay-intro')") replay = node.arguments[1].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);

function harness() {
  const classes = () => {
    const values = new Set();
    return { add: (...names) => names.forEach(n => values.add(n)), remove: (...names) => names.forEach(n => values.delete(n)), contains: name => values.has(name) };
  };
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { hidden:false, inert:false, disabled:false, style:{}, classList:classes(), setAttribute(){}, removeAttribute(){}, focus(){ this.focused=true; } });
    return elements.get(id);
  };
  const calls = { frames:0, brain:0, timeline:0 };
  const context = vm.createContext({
    $, Math, performance:{now:()=>100}, state:'idle', reduce:false,
    lastRender:0, started:0, frame:0, epoch:0, timelineStarted:false,
    drag:null, velocity:{x:0,y:0}, yaw:0, pitch:0, pan:{x:0,y:0},
    frozenYaw:0, frozenPitch:0, startCore:{x:0,y:0}, suppressClickUntil:0,
    anchors:[{}], cx:0,cy:0,W:100,H:100,
    hit:$('core-hit'),leftHit:$('core-hit-left'),rightHit:$('core-hit-right'), intro:$('intro'),
    clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),smooth:n=>n,
    project:()=>({x:0,y:0}),resetView(){},
    ctx:{clearRect(){}},background(){},drawBrain(){calls.brain++;},drawWave(){},updateCopy(){},
    initTimeline(){calls.timeline++;},requestAnimationFrame(){return ++calls.frames;},cancelAnimationFrame(){},
    CustomEvent:class {},window:{dispatchEvent(){}},
    document:{body:{classList:classes()},querySelectorAll:()=>[]},
  });
  vm.runInContext(['render','startTimeline','complete','activate'].map(name=>functions.get(name)).join('\n')+`\nconst replayOpening = ${replay};`,context);
  return {context,calls,$};
}

test('opening draws its first frame without an event and continues rendering', () => {
  const {context,calls}=harness();
  vm.runInContext('render(16); render(32);',context);
  assert.equal(calls.brain,2);
  assert.equal(calls.frames,2);
  assert.equal(context.state,'idle');
});

test('activation finishes the transition and replay restores the opening', () => {
  const {context,calls,$}=harness();
  vm.runInContext('activate(); render(6000);',context);
  assert.equal(context.state,'done');
  assert.equal(calls.timeline,1);
  assert.equal($('intro').hidden,true);
  assert.equal($('replay-intro').hidden,false);
  vm.runInContext('replayOpening(); render(7000);',context);
  assert.equal(context.state,'idle');
  assert.equal($('intro').hidden,false);
  assert.equal($('replay-intro').hidden,true);
  assert.ok(calls.brain>=2);
});
