import { DIFFICULTIES, SCENARIOS, clamp, decayTrust, scoreFor, analyzeExcuse, isDuplicate, evaluate } from './logic.js';

const root = document.querySelector('#app');
let game = { screen: 'home' };
let lastTick = performance.now();
const html = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const reset = () => { game = { screen: 'home' }; render(); };
document.querySelector('#restart').addEventListener('click', reset);

function begin(difficulty) {
  game = { screen: 'scenario', difficulty, scenario: SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)], trust: 70, risk: null, suspicious: false, pendingExcuse: null, attempts: [], excuses: [], messages: [], attemptNumber: 1, lastResult: null };
  lastTick = performance.now(); render();
}
function say(text) { game.messages.push({ speaker: 'professor', text }); }
function chooseRisk(risk) { game.risk = risk; game.screen = 'conversation'; game.messages.push({ speaker: 'system', text: `${risk === 'high' ? 'HIGH RISK' : 'LOW RISK'} 설득 시도 시작` }); render(); document.querySelector('#player-input')?.focus(); }
function finish(success, reason) {
  const suspicious = game.suspicious;
  const delta = scoreFor(game.difficulty, game.risk, success, suspicious);
  game.trust = clamp(game.trust + delta);
  game.attempts.push({ number: game.attemptNumber, risk: game.risk, success, delta });
  if (game.pendingExcuse) game.excuses.push(game.pendingExcuse);
  game.lastResult = { success, delta, reason, suspicious };
  game.pendingExcuse = null; game.suspicious = false; game.risk = null;
  game.screen = game.trust >= 100 ? 'win' : game.trust <= 0 ? 'lose' : 'result'; render();
}
function submit(event) {
  event.preventDefault();
  const input = document.querySelector('#player-input');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  game.messages.push({ speaker: 'player', text }); input.value = '';
  if (game.suspicious) {
    const result = evaluate(text, game.risk, game.difficulty, true);
    say(result.success ? '추가 설명은 들었습니다. 이번에는 납득하겠습니다.' : '설명을 들었지만 아직 납득하기 어렵군요.');
    finish(result.success, result.success ? '추가 설명을 받아들였습니다.' : '추가 설명이 충분하지 않았습니다.'); return;
  }
  const excuse = analyzeExcuse(text);
  if (isDuplicate(excuse, game.excuses)) { say('그 이유는 앞에서도 들었습니다. 다른 사정을 이야기해 보세요.'); render(); return; }
  game.pendingExcuse = excuse;
  const result = evaluate(text, game.risk, game.difficulty);
  if (result.needsSuspicion) { game.suspicious = true; say('그렇다면 확인할 만한 근거나 더 구체적인 설명이 있나요?'); render(); document.querySelector('#player-input')?.focus(); return; }
  say(result.success ? '사정은 이해했습니다. 다음부터는 미리 알려주세요.' : '그 설명만으로는 받아들이기 어렵습니다.');
  finish(result.success, result.success ? '설명을 받아들였습니다.' : '설득에 실패했습니다.');
}
function trustPanel() {
  return `<div class="trust-panel"><div class="trust-heading"><span>교수님의 신뢰도</span><strong id="trust-value">${Math.ceil(game.trust)}</strong></div><div class="trust-track"><div id="trust-fill" class="trust-fill" style="width:${game.trust}%"></div></div><div class="trust-detail"><span>${game.suspicious ? '의심 단계 · 감소 2배' : '시간에 따라 계속 감소'}</span><span>${DIFFICULTIES[game.difficulty].decay * (game.suspicious ? 2 : 1)}점/초</span></div></div>`;
}
function art() { return `<div class="art" aria-hidden="true"><div class="window"></div><div class="board"><span>OFFICE HOURS</span><i></i><i></i><i></i></div><div class="person"><div class="head"></div><div class="torso"></div></div><div class="desk"></div><div class="lamp"></div></div>`; }
function layout(left, right) { root.innerHTML = `<section class="stage"><div class="stage-main">${left}</div><aside class="stage-side">${right}</aside></section>`; }
function renderHome() {
  root.innerHTML = `<section class="home"><div class="home-copy"><div class="eyebrow">INTERACTIVE CONVERSATION GAME</div><h1>한 문장에<br><em>신뢰가 걸렸다.</em></h1><p>교수님 앞에서 당신의 사정을 설명하세요. 시간이 흐를수록 신뢰도는 줄어듭니다. 0이 되기 전에 100까지 회복하면 승리합니다.</p><div class="home-actions"><button id="play" class="button primary">게임 시작</button><span>브라우저에서 바로 플레이</span></div><div class="notice"><strong>시제품 안내</strong><span>현재 교수님 대사와 판정은 규칙 기반입니다. 실제 AI API는 연결되어 있지 않습니다.</span></div></div>${art()}</section>`;
  document.querySelector('#play').addEventListener('click', () => { game.screen = 'difficulty'; render(); });
}
function renderDifficulty() {
  root.innerHTML = `<section class="center"><div class="eyebrow">게임 시작</div><h1>난이도를 선택하세요</h1><p class="lead">한 판이 끝날 때까지 난이도는 바뀌지 않습니다.</p><div class="choices">${Object.entries(DIFFICULTIES).map(([key, d]) => `<button class="choice" data-difficulty="${key}"><span>${key.toUpperCase()}</span><strong>${d.label}</strong><p>${d.tone}</p><small>기본 감소 <b>${d.decay}점/초</b></small></button>`).join('')}</div><button id="back" class="link-button">처음으로 돌아가기</button></section>`;
  document.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => begin(button.dataset.difficulty)));
  document.querySelector('#back').addEventListener('click', reset);
}
function renderScenario() {
  layout(`<div class="eyebrow">오늘의 상황 · ${html(game.scenario.label)}</div><h1>${html(game.scenario.title)}</h1><p class="lead">${html(game.scenario.context)}</p><div class="quote"><span>교수님</span><p>“${html(game.scenario.question)}”</p></div><button id="continue" class="button primary">교수님께 답하기</button>`, `${trustPanel()}<div class="tip"><span>목표</span><strong>신뢰도 100</strong><p>설득에 성공하면 신뢰도가 오르고, 실패하거나 시간이 지나면 줄어듭니다.</p></div>`);
  document.querySelector('#continue').addEventListener('click', () => { game.messages.push({ speaker: 'professor', text: game.scenario.question }); game.screen = 'risk'; render(); });
}
function renderRisk() {
  const d = DIFFICULTIES[game.difficulty];
  layout(`<div class="eyebrow">설득 시도 ${game.attemptNumber}</div><h1>어떤 방식으로<br>설득하시겠습니까?</h1><p class="lead">위험도는 이번 시도에만 적용됩니다.</p><div class="risks"><button class="risk low" data-risk="low"><span>LOW RISK</span><strong>신중하게 설명하기</strong><p>보상과 손실이 작습니다. 사정을 차분히 이야기해 보세요.</p><b>성공 +${d.lowWin} · 실패 ${d.lowLose}</b></button><button class="risk high" data-risk="high"><span>HIGH RISK</span><strong>강하게 주장하기</strong><p>보상이 크지만 실패의 부담도 큽니다. 근거를 요구받을 수 있습니다.</p><b>성공 +${d.highWin} · 실패 ${d.highLose}</b></button></div>`, `${trustPanel()}<div class="tip"><span>현재 상황</span><strong>${html(game.scenario.label)}</strong><p>${html(game.scenario.context)}</p></div>`);
  document.querySelectorAll('[data-risk]').forEach(button => button.addEventListener('click', () => chooseRisk(button.dataset.risk)));
}
function renderConversation() {
  const messages = game.messages.map(m => `<div class="message ${m.speaker}">${m.speaker === 'system' ? `<span>${html(m.text)}</span>` : `<strong>${m.speaker === 'player' ? '나' : '교수님'}</strong><p>${html(m.text)}</p>`}</div>`).join('');
  root.innerHTML = `<section class="conversation"><div class="conversation-scene"><div class="conversation-heading"><div><div class="eyebrow">${html(game.scenario.label)} · 시도 ${game.attemptNumber}</div><h1>${game.suspicious ? '의심 단계' : '교수님과의 대화'}</h1></div><span class="phase ${game.suspicious ? 'danger' : ''}">${game.suspicious ? '감소 속도 2배' : game.risk === 'high' ? 'HIGH RISK' : 'LOW RISK'}</span></div>${art()}<div class="caption">${html([...game.messages].reverse().find(m => m.speaker === 'professor')?.text ?? '')}</div></div><aside class="conversation-panel">${trustPanel()}<div class="log-heading"><strong>대화 기록</strong><small>같은 판의 변명을 기억합니다</small></div><div class="messages" id="messages">${messages}</div><form id="message-form" class="input-form"><label for="player-input">${game.suspicious ? '추가 설명 또는 근거를 입력하세요' : '교수님께 할 말을 입력하세요'}</label><textarea id="player-input" maxlength="500" rows="3" placeholder="상황과 이유를 구체적으로 설명해 보세요."></textarea><div class="input-actions"><small>최대 500자 · Enter 전송</small><button class="button primary" type="submit">전송</button></div></form></aside></section>`;
  const list = document.querySelector('#messages'); list.scrollTop = list.scrollHeight;
  document.querySelector('#message-form').addEventListener('submit', submit);
  document.querySelector('#player-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); document.querySelector('#message-form').requestSubmit(); } });
}
function renderResult() {
  const r = game.lastResult;
  root.innerHTML = `<section class="center result"><div class="eyebrow">설득 시도 ${game.attemptNumber} 결과</div><div class="result-icon ${r.success ? 'success' : 'failure'}">${r.success ? '✓' : '×'}</div><h1>${r.success ? '교수님이 납득했습니다' : '설득에 실패했습니다'}</h1><p class="lead">${html(r.reason)}</p><div class="metrics"><div><span>이번 변화</span><strong class="${r.success ? 'positive' : 'negative'}">${r.delta > 0 ? '+' : ''}${r.delta}</strong></div><div><span>현재 신뢰도</span><strong>${Math.ceil(game.trust)}</strong></div><div><span>의심 단계</span><strong>${r.suspicious ? '진행' : '없음'}</strong></div></div><button id="next" class="button primary">다음 설득 시도</button><p class="tiny">다음 시도에서는 위험도를 다시 고를 수 있습니다.</p></section>`;
  document.querySelector('#next').addEventListener('click', () => { game.attemptNumber += 1; game.screen = 'risk'; render(); });
}
function renderEnd() {
  const won = game.screen === 'win';
  root.innerHTML = `<section class="center ending"><div class="eyebrow">${won ? 'MISSION COMPLETE' : 'GAME OVER'}</div><div class="ending-icon">${won ? '✦' : '⌛'}</div><h1>${won ? '신뢰를 되찾았습니다' : '신뢰를 잃었습니다'}</h1><p class="lead">${won ? '교수님이 당신의 설명을 받아들였습니다.' : '시간이 다해 더 이상 설득할 수 없습니다.'}</p><div class="metrics"><div><span>최종 신뢰도</span><strong>${won ? 100 : 0}</strong></div><div><span>설득 시도</span><strong>${game.attempts.length}회</strong></div><div><span>난이도</span><strong>${DIFFICULTIES[game.difficulty].label}</strong></div></div><button id="again" class="button primary">다시 시작</button></section>`;
  document.querySelector('#again').addEventListener('click', reset);
}
function render() {
  if (game.screen === 'home') return renderHome();
  if (game.screen === 'difficulty') return renderDifficulty();
  if (game.screen === 'scenario') return renderScenario();
  if (game.screen === 'risk') return renderRisk();
  if (game.screen === 'conversation') return renderConversation();
  if (game.screen === 'result') return renderResult();
  renderEnd();
}
function tick(now) {
  const seconds = Math.max(0, (now - lastTick) / 1000); lastTick = now;
  if (['scenario', 'risk', 'conversation', 'result'].includes(game.screen)) {
    game.trust = decayTrust(game.trust, seconds, game.difficulty, game.suspicious);
    if (game.trust <= 0) { game.screen = 'lose'; game.suspicious = false; render(); }
    else { const value = document.querySelector('#trust-value'); const fill = document.querySelector('#trust-fill'); if (value) value.textContent = Math.ceil(game.trust); if (fill) fill.style.width = `${game.trust}%`; }
  }
  requestAnimationFrame(tick);
}
render(); requestAnimationFrame(tick);
