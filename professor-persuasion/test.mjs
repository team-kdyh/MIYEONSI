import test from 'node:test';
import assert from 'node:assert/strict';
import { decayTrust, scoreFor, analyzeExcuse, isDuplicate, evaluate, outcomeScreen, nextScenario } from './logic.js';

test('시간 감소와 의심 배율이 난이도에 따라 적용된다', () => {
  assert.equal(decayTrust(70, 10, 'normal'), 60);
  assert.equal(decayTrust(70, 10, 'normal', true), 50);
  assert.equal(decayTrust(2, 10, 'hard'), 0);
});
test('위험도와 의심 단계의 점수가 합산된다', () => {
  assert.equal(scoreFor('normal', 'high', true, true), 28);
  assert.equal(scoreFor('normal', 'low', false, true), -20);
});
test('같은 핵심 표현은 중복이고 다른 사건은 새 시도다', () => {
  const first = analyzeExcuse('어제 버스가 늦게 와서 지각했습니다');
  assert.equal(isDuplicate(analyzeExcuse('버스가 늦게 와서 수업에 지각했습니다'), [first]), true);
  assert.equal(isDuplicate(analyzeExcuse('컴퓨터가 고장 나서 과제를 제출하지 못했습니다'), [first]), false);
});
test('높은 위험도만으로 의심 단계에 자동 진입하지 않는다', () => {
  assert.equal(evaluate('오늘 준비가 부족했습니다. 죄송합니다. 다시 제출하겠습니다.', 'high', 'normal').needsSuspicion, false);
  assert.equal(evaluate('어제 병원에 갑자기 갔습니다.', 'low', 'normal').needsSuspicion, true);
});

test('납득 3회 또는 신뢰도 100 중 하나만 달성해도 승리한다', () => {
  assert.equal(outcomeScreen(true, 75, 3), 'win');
  assert.equal(outcomeScreen(true, 100, 1), 'win');
  assert.equal(outcomeScreen(true, 75, 2), 'conversation');
  assert.equal(outcomeScreen(false, 54, 1), 'result');
  assert.equal(outcomeScreen(false, 0, 2), 'lose');
});

test('다음 상황은 현재 상황과 다르고 마지막 상황 뒤에는 처음으로 돌아간다', () => {
  assert.equal(nextScenario('assignment').id, 'late');
  assert.equal(nextScenario('absence').id, 'assignment');
});
