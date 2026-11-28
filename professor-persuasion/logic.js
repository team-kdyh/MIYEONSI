export const DIFFICULTIES = {
  easy: { label: '쉬움', decay: 0.5, lowWin: 12, lowLose: -5, highWin: 22, highLose: -12, susWin: 13, susLose: -8, tone: '조금은 사정을 들어주시는 편' },
  normal: { label: '보통', decay: 1, lowWin: 8, lowLose: -10, highWin: 16, highLose: -20, susWin: 12, susLose: -10, tone: '설명의 빈틈을 꼼꼼히 짚으시는 편' },
  hard: { label: '어려움', decay: 1.5, lowWin: 5, lowLose: -15, highWin: 12, highLose: -30, susWin: 10, susLose: -15, tone: '구체적인 근거를 엄격하게 요구하시는 편' },
};
export const SCENARIOS = [
  { id: 'assignment', label: '과제 미제출', title: '제출 기한이 지났습니다', context: '어제 밤 11시 59분까지 제출해야 했던 과제가 아직 제출되지 않았습니다.', question: '과제를 제출하지 않은 이유를 설명해 보세요.' },
  { id: 'late', label: '지각', title: '수업이 이미 시작됐습니다', context: '오늘 수업에 25분 늦게 들어왔습니다. 교수님이 수업 후에 남으라고 하셨습니다.', question: '오늘은 왜 이렇게 늦었나요?' },
  { id: 'absence', label: '결석', title: '중요한 수업에 빠졌습니다', context: '지난 수업의 발표와 토론에 참석하지 못했습니다. 사전 연락도 없었습니다.', question: '지난 시간에 왜 나오지 않았나요?' },
];
export const ACCEPTANCE_GOAL = 3;
const CATEGORIES = [
  ['health', /아프|병원|진료|열이|몸살|감기|응급실|약을|질병/],
  ['traffic', /버스|지하철|교통|차가|택시|막혀|사고|길이/],
  ['family', /가족|부모|어머니|아버지|할머니|할아버지|동생|형제/],
  ['technology', /컴퓨터|노트북|인터넷|와이파이|파일|서버|기기|전원이/],
  ['schedule', /알람|잠들|늦잠|시간|일정|약속|착각/],
  ['study', /과제|공부|시험|발표|자료|준비/],
];
export const clamp = value => Math.max(0, Math.min(100, value));
export function outcomeScreen(success, trust, acceptedCount = 0) {
  if (trust >= 100 || acceptedCount >= ACCEPTANCE_GOAL) return 'win';
  if (trust <= 0) return 'lose';
  return success ? 'conversation' : 'result';
}
export function nextScenario(currentId) {
  const index = SCENARIOS.findIndex(scenario => scenario.id === currentId);
  return SCENARIOS[(index + 1) % SCENARIOS.length];
}
export function decayTrust(trust, seconds, difficulty, suspicious = false) { return clamp(trust - seconds * DIFFICULTIES[difficulty].decay * (suspicious ? 2 : 1)); }
export function scoreFor(difficulty, risk, success, suspicious) {
  const d = DIFFICULTIES[difficulty];
  return (risk === 'high' ? (success ? d.highWin : d.highLose) : (success ? d.lowWin : d.lowLose)) + (suspicious ? (success ? d.susWin : d.susLose) : 0);
}
export function analyzeExcuse(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  const category = CATEGORIES.find(([, pattern]) => pattern.test(clean))?.[0] ?? 'other';
  const keywords = clean.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, ' ').split(/\s+/).filter(word => word.length > 1);
  return { category, keywords: [...new Set(keywords)], summary: clean.slice(0, 90) };
}
export function isDuplicate(current, records) {
  return records.some(previous => {
    if (current.category !== previous.category) return false;
    const overlap = current.keywords.filter(word => previous.keywords.includes(word)).length;
    return overlap >= (current.category === 'other' ? 2 : 1) && overlap / Math.max(1, Math.min(current.keywords.length, previous.keywords.length)) >= 0.25;
  });
}
export function evaluate(text, risk, difficulty, isFollowup = false) {
  const clean = text.trim();
  const hasDetail = /\d|어제|오늘|지난|오전|오후|때문|동안|먼저|이후|그래서|연락|제출|확인|기록|사진|진단|증빙|다시/.test(clean);
  const concrete = clean.length >= 24 && hasDetail;
  const accountable = /죄송|미안|다시|제출|연락|보충|따라잡|책임|확인/.test(clean);
  const evidence = /진단|확인서|기록|사진|문자|메일|영수증|증빙|파일|캡처/.test(clean);
  const threshold = difficulty === 'hard' ? 3 : difficulty === 'normal' ? 2 : 1;
  const points = Number(clean.length >= 18) + Number(concrete) + Number(accountable) + Number(evidence);
  const extraordinary = /병원|사고|입원|응급|장례|고장|정전/.test(clean);
  return { success: points >= (isFollowup ? Math.max(1, threshold - 1) : threshold), needsSuspicion: !isFollowup && !evidence && clean.length >= 12 && (extraordinary || (risk === 'high' && !concrete)) };
}
