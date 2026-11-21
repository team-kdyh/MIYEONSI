import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationPose} from '../src/visualAssets.ts';

test('illustrated props follow current NPC action, not a generic semantic offer',()=>{
 assert.equal(presentationPose('romance','offer',['유나가 종이배를 건넨다.']),'smile');
 assert.equal(presentationPose('romance','offer',['유나가 헤드폰 한쪽을 내민다.']),'offer');
 assert.equal(presentationPose('romance','farewell',['유나가 손을 흔든다.']),'neutral');
 assert.equal(presentationPose('romance','farewell',['유나가 테이프를 내민다.']),'farewell');
 assert.equal(presentationPose('romance','concern',['유나가 녹음기를 가방에 넣는다.']),'thinking');
 assert.equal(presentationPose('romance','concern',['유나가 녹음기를 가슴에 안는다.']),'concern');
 assert.equal(presentationPose('office','offer',['서류를 펼친다.']),'offer');
 assert.equal(presentationPose('romance','laugh',['유나가 웃는다.']),'laugh');
});

test('withdrawn props disappear while re-offers, negation and unrelated props remain distinct',()=>{
 for(const [pose,beat,expected] of [
  ['offer','유나가 헤드폰을 가방에 넣고 고개를 끄덕인다.','smile'],
  ['farewell','유나가 테이프를 가방에 넣고 손을 내려놓는다.','neutral'],
  ['offer','유나가 헤드폰을 내밀었다가 다시 거둔다.','smile'],
  ['offer','유나가 헤드폰을 가방에 넣었다가 다시 꺼내 내민다.','offer'],
  ['offer','유나가 헤드폰을 가방에 넣지 않고 내민다.','offer'],
  ['offer','유나가 헤드폰을 넣으려다 멈추고 내민다.','offer'],
  ['offer','유나가 헤드폰을 내밀고 녹음기를 가방에 넣는다.','offer'],
  ['offer','유나가 헤드폰을 거두고 녹음기를 내민다.','smile'],
  ['concern','유나가 녹음기를 넣지 않고 가슴에 안는다.','concern'],
  ['concern','유나가 녹음기를 탁자에 내려놓는다.','thinking'],
 ])assert.equal(presentationPose('romance',pose,[beat]),expected,beat);
 assert.equal(presentationPose('romance','offer',['유나가 헤드폰을 거둔다.','유나가 헤드폰을 다시 내민다.']),'offer');
});
