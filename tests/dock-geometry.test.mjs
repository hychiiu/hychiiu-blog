import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dockDotPosition } from '../src/scripts/dock-geometry.ts';
test('mobile navigation dot follows scrolled content and hides when off-screen', () => {
  assert.deepEqual(dockDotPosition(100, 40, 4, 4, 288), { x: 62, visible: true });
  assert.equal(dockDotPosition(40, 100, 4, 4, 288).visible, false);
  assert.equal(dockDotPosition(340, 0, 4, 4, 288).visible, false);
});
