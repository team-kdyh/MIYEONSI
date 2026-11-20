import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start,advance,stories,view,type Mode} from './game.ts';
test('reject invalid choices without mutating state',()=>{const g=start('office');for(const invalid of [-1,3,NaN,1.5])assert.throws(()=>advance(g,invalid));assert.equal(g.step,0);assert.deepEqual(g.scores,[0,0,0]);});
