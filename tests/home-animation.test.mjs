import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { EEG_ELECTRODES, electrodeAnchors, layoutElectrodeLabels } from '../src/lib/eeg-electrodes.mjs';

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
    anchors:electrodeAnchors(), activeElectrode:electrodeAnchors().find(e=>e.name==='Cz'), cx:0,cy:0,W:100,H:100,
    activationControls:EEG_ELECTRODES.map(e=>$('eeg-'+e.name)).concat($('enter-intro')),
    hit:$('core-hit'),leftHit:$('core-hit-left'),rightHit:$('core-hit-right'), intro:$('intro'),
    clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),smooth:n=>n,
    project:p=>({x:p.x,y:p.y}),resetView(){},
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
  assert.equal($('intro').classList.contains('opening-reveal'),true);
  assert.equal($('enter-intro').focused,true);
  assert.ok(calls.brain>=2);
});

test('restored opening copy retains its activation control and brain entrance animation', () => {
  const markup=fs.readFileSync(new URL('../src/components/BrainIntro.astro',import.meta.url),'utf8');
  for (const restored of ['hero-copy','intro-brand','intro-footer','brain-tag','enter-intro']) assert.ok(markup.includes(restored));
  assert.match(source,/const activationControls=\[\.\.\.electrodeButtons,\$\('enter-intro'\)\]/);
  assert.match(source,/intro.classList.add\('opening-reveal'\)/);
});

test('exactly 19 standard named scalp sites, including the four legacy temporal aliases', () => {
  assert.deepEqual(EEG_ELECTRODES.map(e=>e.name),['Fp1','Fp2','F7','F3','Fz','F4','F8','T3','C3','Cz','C4','T4','T5','P3','Pz','P4','T6','O1','O2']);
  assert.equal(new Set(EEG_ELECTRODES.map(e=>e.standardName)).size,19);
  assert.deepEqual(EEG_ELECTRODES.filter(e=>e.name!==e.standardName).map(e=>e.standardName),['T7','T8','P7','P8']);
  for(const e of EEG_ELECTRODES) assert.ok(Math.abs(Math.hypot(...e.position)-1)<.001);
});

test('every electrode starts the original transition from its own projected position', () => {
  for(const electrode of electrodeAnchors()) {
    const {context,$}=harness();
    context.selected={currentTarget:{dataset:{eeg:electrode.name}}};
    vm.runInContext('activate(selected);',context);
    assert.equal(context.state,'running',electrode.name);
    assert.equal(context.activeElectrode.name,electrode.name);
    assert.equal(context.startCore.x,electrode.x);
    assert.equal(context.startCore.y,electrode.y);
    assert.equal($('eeg-'+electrode.name).disabled,true);
    vm.runInContext('render(6000); replayOpening();',context);
    assert.equal(context.state,'idle');
    assert.equal($('eeg-'+electrode.name).disabled,false);
  }
});

test('projected left/right sites retain separately named hit targets on desktop and mobile', () => {
  const markup=fs.readFileSync(new URL('../src/components/BrainIntro.astro',import.meta.url),'utf8');
  assert.match(markup,/EEG_ELECTRODES.map/);
  assert.match(markup,/data-eeg=\{e.name\}/);
  assert.match(source,/activationControls.forEach\(b=>b.addEventListener\('click',activate\)\)/);
  for(const [width,height] of [[1440,900],[390,844],[320,568]]) {
    const projected=electrodeAnchors().map(p=>({...p,x:width*.7+p.x*80,y:height*.6-p.y*80}));
    const labels=layoutElectrodeLabels(projected,width,height);
    assert.equal(labels.length,19);
    for(const p of labels) {
      assert.ok(Number.isFinite(p.labelX)&&Number.isFinite(p.labelY));
      assert.ok(p.labelX>=28&&p.labelX<=width-28);
      assert.ok(p.labelY>=105&&p.labelY<=height-110);
    }
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++) {
      assert.ok(Math.abs(labels[i].labelX-labels[j].labelX)>=44||Math.abs(labels[i].labelY-labels[j].labelY)>=26,'labels must not overlap');
    }
  }
});
