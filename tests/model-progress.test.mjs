import test from 'node:test';
import assert from 'node:assert/strict';
import { modelProgress } from '../src/lib/model-progress.mjs';

test('only the confirmed SVM project is complete; future stages remain planned', () => {
  const stages = Array.from({ length: 8 }, (_, i) => modelProgress(i + 1));
  assert.equal(stages.filter(s => s.key === 'completed').length, 1);
  assert.equal(stages[0].label, '已完成');
  assert.equal(stages[0].dash, '');
  for (const stage of stages.slice(1)) {
    assert.equal(stage.label, '待开展');
    assert.equal(stage.dash, '');
    assert.notEqual(stage.color, stages[0].color);
  }
});

test('planned nodes preserve their original model color and solid outline', () => {
  for (let generation = 2; generation <= 8; generation++) {
    const originalColor = '#a96fe6';
    const stage = modelProgress(generation, originalColor);
    assert.equal(stage.color, originalColor);
    assert.equal(stage.dash, '');
  }
});
