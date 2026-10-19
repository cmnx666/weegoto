import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splitFrontmatter } from '../src/lib/content-loader.mjs';
import { buildPrelude, adjacentTimelineStop, PRELUDE_STYLE } from '../src/lib/timeline-prelude.mjs';

const entries=[
  ['progress','project-founded'],
  ['notes','meeting-01-start-with-basics'],
  ['notes','meeting-02-data-and-next-steps'],
].map(([section,id])=>{
  const {data,body}=splitFrontmatter(fs.readFileSync(new URL(`../src/content/${section}/${id}.md`,import.meta.url),'utf8'));
  return {...data,label:data.timelineLabel,date:new Date(data.date).toISOString().slice(0,10),href:`/${section}/${id}/`,body};
});

test('formation and both real meeting reports have the requested chronological dates',()=>{
  assert.deepEqual(entries.map(e=>e.date),['2026-06-14','2026-09-14','2026-10-07']);
  assert.deepEqual(entries.map(e=>e.label),['项目组成立','第一次组会','第二次组会']);
  assert.ok(entries.every(e=>e.timelinePhase==='pre-svm'&&e.draft===false));
  assert.match(entries[1].body,/步子不能迈太大/);
  assert.match(entries[2].body,/等待EEG设备的到来/);
});

test('three small linked milestones fit before SVM without moving its model coordinates',()=>{
  const points=Array.from({length:1000},(_,x)=>({x,y:392-62*Math.sin(x/100)}));
  const nodes=buildPrelude([...entries].reverse(),450,points);
  assert.equal(nodes.length,3);
  assert.deepEqual(nodes.map(n=>n.label),entries.map(e=>e.label));
  assert.ok(nodes[0].x>=0&&nodes[0].x<nodes[1].x&&nodes[1].x<nodes[2].x&&nodes[2].x<450);
  assert.ok(nodes.every(n=>Number.isFinite(n.y)&&n.href.startsWith('/')));
  assert.ok(450-nodes.at(-1).x>=110);
  assert.ok(PRELUDE_STYLE.radius<11&&PRELUDE_STYLE.opacity<.6);
});

test('previous/next can visit all three early milestones and return to SVM',()=>{
  const stops=[.004,.025,.047,.063,.19,.31];
  let current=stops[3];
  for(const expected of [stops[2],stops[1],stops[0],stops[0]]){
    current=adjacentTimelineStop(stops,current,-1);assert.equal(current,expected);
  }
  for(const expected of [stops[1],stops[2],stops[3],stops[4]]){
    current=adjacentTimelineStop(stops,current,1);assert.equal(current,expected);
  }
  assert.equal(adjacentTimelineStop(stops,stops.at(-1),1),stops.at(-1));
});
