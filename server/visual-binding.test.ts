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
