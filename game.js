/* =========================================================
   말빨 시뮬레이터 - 게임 엔진
   - 시나리오 데이터는 scenarios/*.js 에서 window.SCENARIOS 에 추가됨
   - 수치: like(호감도), trust(신뢰도), patience(인내심) 0~100
   - 대화는 노드(장면) 그래프 + 매 판 랜덤으로 끼어드는 돌발 상황(events)
   - 상황 정보/상대 성격을 직접 입력 가능. AI 키가 있으면 AI가 대사를 맞춤 생성
   ========================================================= */

const STAT_NAMES = { like: "호감도", trust: "신뢰도", patience: "인내심" };
const LEVELS = ["하", "중", "상"];

/* 난이도별 공통 규칙 (상대가 깐깐할수록 엄격)
   good/bad: 좋은·나쁜 효과 배율, drain: 턴마다 깎이는 인내심
   clear: 끝났을 때 (호감도+신뢰도)/2 가 이 이상이면 성공 (시나리오에서 따로 지정 가능)
   showStats: 수치 공개 여부, time: 제한 시간(초) [직접 말하기, 선택지] */
const LEVEL_RULES = {
  하: { start: { like: 35, trust: 35, patience: 90 }, good: 1.0, bad: 0.8, drain: 2, clear: 75, showStats: true,  time: [0, 0] },
  중: { start: { like: 40, trust: 40, patience: 75 }, good: 1.0, bad: 1.0, drain: 4, clear: 70, showStats: false, time: [90, 25] },
  상: { start: { like: 30, trust: 30, patience: 65 }, good: 0.9, bad: 1.4, drain: 5, clear: 65, showStats: false, time: [60, 15] },
};

/* 돌발 상황: 한 판에 몇 개, 몇 번째 대화 뒤에 끼울 수 있는지 */
const EVENT_COUNT = { 하: [1, 2], 중: [2, 2], 상: [2, 3] };
const EVENT_SLOTS = [2, 3, 4];

const app = document.getElementById("app");
let G = null;        // 현재 게임 상태
let timerId = null;
let screen = { name: "home" };

/* ---------- 저장소 (브라우저에만 저장) ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k) || ""; } catch { return ""; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
  json(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } },
};

/* ---------- 유틸 ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const isLeveled = (v) => v && typeof v === "object" && !Array.isArray(v) && ("하" in v || "중" in v || "상" in v);
const pick = (v, lv) => (isLeveled(v) ? v[lv] ?? v["중"] : v);
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/* {학과} 같은 빈칸을 상황 정보로 채움 */
function fill(s) {
  if (typeof s !== "string" || !G || !G.vars) return s;
  return s.replace(/\{([^{}\s]+)\}/g, (m, k) => (k in G.vars ? G.vars[k] : m));
}
const T = (v) => fill(pick(v, G.lv)); // 난이도 고르고 + 빈칸 채우기

function scaleEffect(eff, lv) {
  const r = LEVEL_RULES[lv];
  const e = pick(eff, lv) || {};
  const out = {};
  for (const k of Object.keys(STAT_NAMES)) {
    const v = e[k] || 0;
    out[k] = Math.round(v >= 0 ? v * r.good : v * r.bad);
  }
  return out;
}
const effSum = (d) => d.like + d.trust + d.patience;

function deltaText(d) {
  return Object.entries(d)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `<span class="${v > 0 ? "up" : "down"}">${STAT_NAMES[k]} ${v > 0 ? "+" : ""}${v}</span>`)
    .join(" · ");
}

/* 수치 대신 보여 줄 표정 변화 */
function moodText(d) {
  const s = d.like + d.trust + Math.max(d.patience, -10);
  if (s >= 16) return "😊 표정이 확 밝아졌다";
  if (s >= 6) return "🙂 고개를 끄덕인다";
  if (s > -6) return "😐 표정 변화가 없다";
  if (s > -16) return "😒 미간을 살짝 찌푸린다";
  return "😠 표정이 굳었다";
}

const getNode = (id) => G.sc.nodes[id] || (G.sc.events || {})[id];
const isEventId = (id) => !!(G.sc.events && G.sc.events[id]);

/* 이 노드에서 해당 난이도 기준 가장 좋은 선택지 (리뷰의 모범 답안) */
function bestChoice(node, lv) {
  return [...node.choices].sort((a, b) => effSum(scaleEffect(b.eff, lv)) - effSum(scaleEffect(a.eff, lv)))[0];
}

/* =========================================================
   나만의 상황 (AI 전용) 템플릿
   ========================================================= */
const GENERIC_EVENTS = {
  ge1: { topic: "상대에게 급한 연락(전화·메시지)이 와서 대화가 잠깐 끊겼다가 돌아온다" },
  ge2: { topic: "상대가 예상 못 한 반대 의견이나 부분적인 거절을 한다" },
  ge3: { topic: "제3자(동료, 선배, 다른 손님 등)가 대화에 끼어든다" },
  ge4: { topic: "상대가 플레이어에 대한 사실을 착각하고 말한다 (정정할지 말지 판단해야 함)" },
  ge5: { topic: "상대의 남은 시간이 갑자기 줄어들어 핵심만 말해야 한다" },
  ge6: { topic: "상대가 준비 안 된 기습 질문을 던진다" },
};
for (const e of Object.values(GENERIC_EVENTS)) e.free = { hint: "이 상황에 대응해 보세요.", tip: "당황하지 말고 상대 입장에서 생각해 보세요.", rubric: e.topic + " — 이 상황에 침착하고 적절하게 대응했는가", good: [], bad: [] };

function buildCustomScenario(S) {
  const topics = [
    "첫인사와 용건 꺼내기 (상대가 무슨 일이냐고 묻는다)",
    "상대가 이유나 배경을 묻는다",
    "상대가 구체적인 근거·준비 상태·능력을 확인한다",
    "상대가 걱정이나 우려를 말한다",
    "결정적인 요청/설득의 순간 (상대가 쉽게 승낙하지 않는다)",
    "마무리: 상대가 정리하거나 마지막 질문을 받는다",
  ];
  const nodes = {};
  topics.forEach((t, i) => {
    nodes["c" + (i + 1)] = {
      topic: t, next: i === topics.length - 1 ? "end" : "c" + (i + 2), choices: [],
      free: { hint: "직접 말해 보세요.", tip: "상대가 무엇을 걱정하는지 먼저 생각해 보세요.", rubric: t + " — 목표 달성에 도움이 되고 상대 성격에 맞는 대답인가", good: [], bad: [] },
    };
  });
  const who = S.info.who || "상대";
  return {
    id: "custom", custom: true, emoji: "✏️",
    title: S.info.title || "나만의 상황",
    goal: S.info.goal || "목표를 달성하자.",
    lesson: "상대가 중요하게 여기는 것을 먼저 읽고, 요청은 분명하게, 걱정에는 구체적인 대책으로.",
    start: "c1", nodes, events: GENERIC_EVENTS, customFace: "🙂",
    intro: S.info.desc || "",
    levels: {
      하: { name: `너그러운 ${who}`, face: "🙂", desc: "웬만하면 들어주는 편.", likes: "진심, 예의", dislikes: "무례함",
        reactions: { good: "좋아요.", mid: "음, 그렇군요.", bad: "그건 좀…" }, silence: "천천히 말해도 돼요." },
      중: { name: `보통의 ${who}`, face: "😐", desc: "합리적이지만 근거 없는 말엔 넘어가지 않는다.", likes: "요점, 근거", dislikes: "장황함, 핑계",
        reactions: { good: "괜찮네요.", mid: "그래서요?", bad: "그건 아니죠." }, silence: "할 말 없으면 이만하죠." },
      상: { name: `깐깐한 ${who}`, face: "😤", desc: "까다롭고 예민하다. 실수 하나에 대화가 끝날 수 있다.", likes: "철저한 준비, 책임감", dislikes: "변명, 과장, 무례",
        reactions: { good: "…그건 괜찮군요.", mid: "그게 다예요?", bad: "더 들을 필요 없겠네요." }, silence: "준비도 안 하고 왔어요?" },
    },
    setup: [],
    endings: {
      success: "목표 달성! 상대가 고개를 끄덕였다.",
      fail: "상대를 설득하지 못했다. 다음엔 다르게 말해 보자.",
      patience: "상대가 대화를 먼저 끝내 버렸다.",
    },
  };
}
const CUSTOM_FIELDS = [
  { key: "title", label: "상황 이름", placeholder: "예: 알바 사장님께 시급 인상 요청하기" },
  { key: "who", label: "상대는 누구?", placeholder: "예: 편의점 사장님" },
  { key: "goal", label: "내 목표", placeholder: "예: 다음 달부터 시급 500원 인상 약속 받기" },
  { key: "desc", label: "상황 설명 / 배경", placeholder: "예: 1년째 일하는 중, 최근 야간 근무까지 맡게 됨. 사장님은 요즘 매출이 줄었다고 자주 말함.", long: true },
];

/* =========================================================
   화면 1: 시나리오 선택
   ========================================================= */
function renderHome() {
  stopTimer();
  G = null;
  screen = { name: "home" };
  app.innerHTML = `
    <h1>말 한마디로 상황을 뚫어라</h1>
    <p class="muted">현실에서 마주칠 상황을 미리 연습해 보세요. 상대가 누구인지, 어떤 성격인지 직접 설정할 수 있어요.
    매 판 예상치 못한 일이 1~3번 터집니다.</p>
    <div class="grid mt">
      ${SCENARIOS.map((s, i) => `
        <button class="card" data-i="${i}">
          <div class="emoji">${s.emoji}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.goal)}</p>
        </button>`).join("")}
      <button class="card dashed" data-custom="1">
        <div class="emoji">✏️</div>
        <h3>나만의 상황 만들기</h3>
        <p>상황, 상대, 목표를 직접 적으면 AI가 대화를 진행해요. ${aiReady() ? "" : "<b>(AI 키 필요)</b>"}</p>
      </button>
    </div>`;
  app.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => renderSetup(SCENARIOS[b.dataset.i])));
  app.querySelector("[data-custom]").onclick = () => renderSetup({ id: "custom", custom: true, emoji: "✏️", title: "나만의 상황", levels: buildCustomScenario({ info: {} }).levels, setup: [] });
}

/* =========================================================
   화면 2: 설정 (상대 / 상황 정보 / 연습 방식)
   ========================================================= */
function loadSetup(sc) {
  const S = store.json("setup:" + sc.id, {});
  return {
    who: S.who || "중",               // 하 | 중 | 상 | custom
    base: S.base || "중",             // 직접 설정 시 깐깐함 정도
    persona: S.persona || {},         // { name, desc, likes, dislikes }
    info: S.info || {},               // 상황 정보 입력값
    mode: S.mode || store.get("mode") || "type",
    useAI: S.useAI !== false,
  };
}
const saveSetup = (sc, S) => store.set("setup:" + sc.id, JSON.stringify(S));

function field(name, label, value, placeholder, long) {
  return `<label class="field">${esc(label)}
    ${long ? `<textarea data-f="${name}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
           : `<input data-f="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}">`}
  </label>`;
}

function renderSetup(sc) {
  stopTimer();
  G = null;
  screen = { name: "setup", sc };
  const S = loadSetup(sc);
  const ai = aiReady();
  const fields = sc.custom ? CUSTOM_FIELDS : sc.setup || [];
  const faceCustom = sc.customFace || "🙂";

  app.innerHTML = `
    <p class="muted">${sc.emoji} ${esc(sc.title)}</p>
    <h1>연습 준비</h1>

    <section class="section">
      <h2>1. ${sc.custom ? "어떤 상황인가요?" : "상황 정보 <span class='muted small'>(선택 · 적을수록 실제에 가까워져요)</span>"}</h2>
      ${fields.length ? `<div class="fields">${fields.map((f) => field("info." + f.key, f.label, S.info[f.key] || "", f.placeholder, f.long)).join("")}</div>` : ""}
      ${!sc.custom && !ai ? `<p class="hint">💡 AI 키가 없으면 정해진 대사의 빈칸(학과, 논문 이름 등)만 바뀌어요. AI 키가 있으면 입력한 정보에 맞춰 질문과 대사를 새로 만들어요.</p>` : ""}
    </section>

    <section class="section">
      <h2>2. 상대는 어떤 사람인가요?</h2>
      <div class="grid">
        ${LEVELS.map((lv) => {
          const p = sc.levels[lv];
          return `
          <button class="card ${S.who === lv ? "selected" : ""}" data-who="${lv}">
            <span class="lv ${lv}">${lv}</span>
            <div class="emoji">${p.face}</div>
            <h3>${esc(p.name)}</h3>
            <p>${esc(p.desc)}</p>
          </button>`;
        }).join("")}
        <button class="card ${S.who === "custom" ? "selected" : ""}" data-who="custom">
          <span class="lv custom">직접</span>
          <div class="emoji">${faceCustom}</div>
          <h3>내가 아는 사람으로</h3>
          <p>실제 그 사람의 성격을 적어서 연습해요.</p>
        </button>
      </div>
      ${S.who === "custom" ? `
      <div class="custom-box">
        <div class="fields">
          ${field("persona.name", "이름/호칭", S.persona.name || "", sc.id === "boss-leave" ? "예: 박 부장님" : sc.id === "professor-lab" ? "예: 이OO 교수님" : "예: 사장님")}
          <label class="field">깐깐함 정도 (점수 규칙)
            <select data-f="base">
              ${LEVELS.map((lv) => `<option value="${lv}" ${S.base === lv ? "selected" : ""}>${lv} — ${lv === "하" ? "너그러움" : lv === "중" ? "보통" : "매우 깐깐함"}</option>`).join("")}
            </select>
          </label>
        </div>
        ${field("persona.desc", "성격·말투", S.persona.desc || "", "예: 말수가 적고 논리적. 질문을 꼬리에 꼬리를 물고 함. 학생이 모른다고 하면 오히려 좋아함. 반말과 존댓말 섞어 씀.", true)}
        <div class="fields">
          ${field("persona.likes", "좋아하는 것", S.persona.likes || "", "예: 실험을 직접 해 본 경험, 시간 약속")}
          ${field("persona.dislikes", "싫어하는 것", S.persona.dislikes || "", "예: 아는 척, 메일 답장 늦는 것")}
        </div>
        ${!ai ? `<p class="hint">⚠️ 성격·말투를 대사에 반영하려면 AI 키가 필요해요. 키가 없으면 이름과 깐깐함 정도만 적용돼요.</p>` : ""}
      </div>` : ""}
    </section>

    <section class="section">
      <h2>3. 연습 방식</h2>
      <div class="mode-pick">
        <label class="mode ${S.mode === "type" ? "on" : ""}"><input type="radio" name="mode" value="type" ${S.mode === "type" ? "checked" : ""}>
          <b>✍️ 직접 말하기 (추천)</b><span>내 말로 직접 대답해요. 막히면 선택지를 힌트로 볼 수 있어요.</span></label>
        <label class="mode ${S.mode === "choice" ? "on" : ""}"><input type="radio" name="mode" value="choice" ${S.mode === "choice" ? "checked" : ""}>
          <b>🔘 선택지</b><span>세 가지 중에 골라요. 정답이 상대마다 달라요.</span></label>
      </div>
      ${ai && !sc.custom ? `<label class="check mt"><input type="checkbox" id="useAI" ${S.useAI ? "checked" : ""}>
        🤖 AI가 내 설정에 맞춰 대사·질문·선택지를 새로 써 주기 <span class="muted small">(끄면 정해진 대사로 진행)</span></label>` : ""}
      ${!ai ? `<p class="hint mt">💡 오른쪽 위 ⚙️ AI 설정에 OpenAI 키를 넣으면 설정한 정보와 성격에 맞춰 AI가 상대역을 해요.</p>` : ""}
    </section>

    <div class="row mt">
      <button class="ghost" id="back">← 처음으로</button>
      <button class="primary" id="start" ${sc.custom && !ai ? "disabled" : ""}>${sc.custom && !ai ? "AI 키가 필요해요" : "시작하기 ▶"}</button>
    </div>`;

  // 입력값 저장 (다시 그리지 않음 → 포커스 유지)
  app.querySelectorAll("[data-f]").forEach((el) => {
    el.addEventListener("input", () => {
      const [a, b] = el.dataset.f.split(".");
      if (b) S[a][b] = el.value; else S[a] = el.value;
      saveSetup(sc, S);
    });
  });
  app.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => { S.who = b.dataset.who; saveSetup(sc, S); renderSetup(sc); }));
  app.querySelectorAll("input[name=mode]").forEach((r) => (r.onchange = () => { S.mode = r.value; store.set("mode", r.value); saveSetup(sc, S); renderSetup(sc); }));
  const ua = app.querySelector("#useAI");
  if (ua) ua.onchange = () => { S.useAI = ua.checked; saveSetup(sc, S); };
  app.querySelector("#back").onclick = renderHome;
  app.querySelector("#start").onclick = () => {
    if (sc.custom && !(S.info.goal || "").trim()) { alert("내 목표를 적어 주세요."); return; }
    startGame(sc.custom ? buildCustomScenario(S) : sc, S);
  };
}

/* =========================================================
   게임 진행
   ========================================================= */
function startGame(sc, S) {
  stopTimer();
  const custom = S.who === "custom";
  const lv = custom ? S.base : S.who;
  const baseP = sc.levels[lv];
  const persona = custom
    ? {
        name: (S.persona.name || "").trim() || baseP.name,
        face: sc.customFace || "🙂",
        desc: (S.persona.desc || "").trim() || baseP.desc,
        likes: (S.persona.likes || "").trim() || baseP.likes,
        dislikes: (S.persona.dislikes || "").trim() || baseP.dislikes,
        reactions: baseP.reactions, silence: baseP.silence, custom: true,
      }
    : baseP;

  // 빈칸 값: 입력값 없으면 기본값
  const vars = {};
  for (const f of sc.setup || []) if (f.var) vars[f.var] = (S.info[f.key] || "").trim() || f.default;

  // 이번 판의 돌발 상황 뽑기 (서로 다른 것으로, 랜덤 시점)
  //   event.minPos: 최소 몇 번째 대화 이후에 나올 수 있는지 (앞 내용이 필요한 돌발 상황용)
  const pool = shuffle(Object.keys(sc.events || {}));
  const [lo, hi] = EVENT_COUNT[lv];
  const n = Math.min(pool.length, rand(lo, hi));
  const slots = shuffle(EVENT_SLOTS).slice(0, n).sort((a, b) => a - b);
  const queue = [];
  for (const pos of slots) {
    const i = pool.findIndex((id) => (sc.events[id].minPos || 0) <= pos);
    if (i >= 0) queue.push({ pos, id: pool.splice(i, 1)[0] });
  }

  G = {
    sc, lv, mode: S.mode, S,
    rule: LEVEL_RULES[lv],
    clear: (sc.clear && sc.clear[lv]) || LEVEL_RULES[lv].clear,
    persona, vars,
    ai: aiReady() && (sc.custom || S.useAI !== false),
    context: buildContext(sc, S),
    stats: { ...LEVEL_RULES[lv].start },
    queue, mainCount: 0, resume: null, eventsSeen: 0,
    nodeId: null, cur: null, order: [],
    peeked: false, freeOpen: false, draft: "",
    log: [], history: [],
    busy: false, ended: false, error: null,
  };
  screen = { name: "game" };
  if (!G.ai && sc.intro) G.log.push({ type: "narr", text: T(sc.intro) });
  enterNode(sc.start);
}

/* AI에게 줄 상황 정보 요약 */
function buildContext(sc, S) {
  const fields = sc.custom ? CUSTOM_FIELDS : sc.setup || [];
  const lines = fields.filter((f) => (S.info[f.key] || "").trim()).map((f) => `- ${f.label}: ${S.info[f.key].trim()}`);
  return lines.join("\n");
}

async function enterNode(id) {
  stopTimer();
  G.nodeId = id;
  G.error = null;
  const node = getNode(id);
  const isEvent = isEventId(id);
  if (isEvent) G.eventsSeen++;

  if (G.ai) {
    G.busy = true;
    G.log.push({ type: "thinking", text: isEvent ? "⚡ 무슨 일이 생긴 것 같다…" : "" });
    renderGame();
    try {
      const d = await directNode(node, id === G.sc.start, isEvent);
      G.cur = { narr: d.narr, npc: d.npc, choices: d.choices.map((t) => ({ text: t })) };
    } catch (err) {
      console.error(err);
      if (G.sc.custom) {
        G.log = G.log.filter((m) => m.type !== "thinking");
        G.busy = false;
        G.error = `AI 오류: ${err.message}`;
        return renderGame();
      }
      G.cur = scriptedCur(node, id);
      G.cur.note = `(AI 대사 생성 실패 → 기본 대사로 진행: ${err.message})`;
    }
    G.log = G.log.filter((m) => m.type !== "thinking");
    G.busy = false;
  } else {
    G.cur = scriptedCur(node, id);
  }

  if (G.cur.note) G.log.push({ type: "narr", text: G.cur.note });
  if (G.cur.narr) G.log.push({ type: "narr", text: G.cur.narr, event: isEvent });
  G.log.push({ type: "npc", text: G.cur.npc });
  G.order = shuffle(G.cur.choices.map((_, i) => i));
  G.peeked = false;
  G.freeOpen = false;
  G.draft = "";
  G.timeLeft = G.rule.time[G.mode === "type" ? 0 : 1];
  renderGame();
}

function scriptedCur(node, id) {
  return {
    narr: node.narr ? (isEventId(id) ? "⚡ " : "") + T(node.narr) : "",
    npc: T(node.npc),
    choices: node.choices.map((c, i) => ({ text: T(c.text), ref: i })),
  };
}

function renderGame() {
  stopTimer();
  const { sc, lv, persona, stats, rule, mode } = G;
  const node = getNode(G.nodeId);
  const turnNo = G.history.length + 1;

  const statsHtml = rule.showStats
    ? `<div class="stats">${Object.keys(STAT_NAMES).map((k) => `
        <div class="stat ${k}">${STAT_NAMES[k]} <b>${stats[k]}</b>
          <div class="bar"><i style="width:${stats[k]}%"></i></div>
        </div>`).join("")}</div>`
    : "";

  const logHtml = G.log.map((m) => {
    if (m.type === "narr") return `<div class="msg narr ${m.event ? "event" : ""}">${esc(m.text)}</div>`;
    if (m.type === "npc") return `<div class="msg npc"><span class="who">${persona.face} ${esc(persona.name)}</span>${esc(m.text)}${
      m.delta ? `<span class="delta">${rule.showStats ? deltaText(m.delta) : moodText(m.delta)}</span>` : ""}</div>`;
    if (m.type === "me") return `<div class="msg me"><span class="who">나</span>${esc(m.text)}</div>`;
    if (m.type === "thinking") return `<div class="msg narr thinking">${esc(m.text || persona.face + " …")}</div>`;
    return "";
  }).join("");

  let actionHtml = "";
  if (G.error) {
    actionHtml = `<p class="hint">⚠️ ${esc(G.error)}</p><div class="row"><button class="primary" id="retryNode">다시 시도</button></div>`;
  } else if (!G.ended && !G.busy && G.cur) {
    const choicesHtml = `<div class="choices">${G.order.map((i) => `<button class="choice" data-c="${i}">${esc(G.cur.choices[i].text)}</button>`).join("")}</div>`;
    const freeHtml = `
      <div class="free">
        <textarea id="freeText" placeholder="${esc(fill(node.free?.hint || "직접 말해 보세요."))}">${esc(G.draft)}</textarea>
        <div class="row">
          <span class="hint">${aiReady() ? "🤖 AI가 상대방 입장에서 판정" : "📏 키워드 규칙 판정"} · Ctrl+Enter로 보내기</span>
          <button class="primary" id="sendFree">말하기</button>
        </div>
      </div>`;
    const timerHtml = G.timeLeft ? `<div class="timer" id="timer">⏱️ <b>${G.timeLeft}</b>초 안에 대답하세요</div>` : "";

    if (mode === "type") {
      actionHtml = `${timerHtml}${freeHtml}
        ${G.peeked ? `<p class="hint mt">💡 힌트: 이런 말들을 할 수 있어요 (골라도 되고, 참고해서 직접 써도 돼요)</p>${choicesHtml}`
                   : `<div class="row mt"><button class="ghost" id="peek">💡 막혔어요 — 선택지 보기</button></div>`}`;
    } else {
      actionHtml = `${timerHtml}${choicesHtml}
        ${G.freeOpen ? freeHtml : `<div class="row mt"><button class="ghost" id="openFree">✍️ 직접 말하기</button></div>`}`;
    }
  }

  app.innerHTML = `
    <div class="goal">🎯 <b>목표</b> ${esc(fill(sc.goal))}
      <span class="right"><span class="lv ${persona.custom ? "custom" : lv}">${persona.custom ? "직접·" + lv : lv}</span> ${persona.face} ${esc(persona.name)} · ${turnNo}번째 대화${G.ai ? " · 🤖" : ""}</span></div>
    ${statsHtml}
    <div class="log">${logHtml}</div>
    ${actionHtml}`;

  app.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => chooseOption(G.cur.choices[b.dataset.c])));
  const retry = app.querySelector("#retryNode");
  if (retry) retry.onclick = () => enterNode(G.nodeId);
  const peek = app.querySelector("#peek");
  if (peek) peek.onclick = () => { saveDraft(); G.peeked = true; renderGame(); };
  const openFree = app.querySelector("#openFree");
  if (openFree) openFree.onclick = () => { G.freeOpen = true; renderGame(); app.querySelector("#freeText")?.focus(); };

  const send = app.querySelector("#sendFree");
  if (send) {
    const ta = app.querySelector("#freeText");
    ta.oninput = () => (G.draft = ta.value);
    send.onclick = () => {
      const t = ta.value.trim();
      if (t.length < 2) { ta.focus(); return; }
      sayFree(t, false);
    };
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send.click(); });
    if (mode === "type" && !G.peeked) ta.focus({ preventScroll: true });
  }

  if (!G.ended && !G.busy && G.timeLeft && !G.error) startTimer();
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function saveDraft() {
  const ta = app.querySelector("#freeText");
  if (ta) G.draft = ta.value;
}

/* ---------- 제한 시간 ---------- */
function startTimer() {
  timerId = setInterval(() => {
    G.timeLeft--;
    const el = document.getElementById("timer");
    if (el) {
      el.querySelector("b").textContent = G.timeLeft;
      el.classList.toggle("urgent", G.timeLeft <= 10);
    }
    if (G.timeLeft <= 0) { stopTimer(); timeout(); }
  }, 1000);
}
function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

function timeout() {
  applyResult({
    said: "(머뭇거리다 아무 말도 못 했다…)",
    effect: scaleEffect({ like: -4, trust: -8, patience: -12 }, G.lv),
    reply: T(G.persona.silence),
    feedback: "실제 대화에서는 완벽한 문장보다 일단 반응하는 게 중요해요. \"잠시만요, 정리해서 말씀드리면…\"처럼 시간을 버는 말도 방법이에요.",
    mode: "시간 초과",
  });
}

/* 선택지를 골랐을 때 */
function chooseOption(c) {
  if (G.ai || c.ref === undefined) return sayFree(c.text, true); // AI 모드: 선택지도 AI가 판정
  const node = getNode(G.nodeId);
  const sc = node.choices[c.ref];
  applyResult({
    said: c.text,
    effect: scaleEffect(sc.eff, G.lv),
    reply: T(sc.react),
    feedback: T(sc.fb),
    mode: G.mode === "type" ? "선택지 참고" : "선택",
    next: sc.next,
    end: sc.end,
    chosen: sc,
  });
}

/* 직접 입력했을 때 (AI 모드에서는 선택지도 여기로) */
async function sayFree(text, viaChoice) {
  stopTimer();
  const node = getNode(G.nodeId);
  G.busy = true;
  G.log.push({ type: "me", text });
  G.log.push({ type: "thinking" });
  renderGame();

  let res;
  const useAI = aiReady();
  try {
    res = useAI ? await judgeWithAI(text, node) : judgeWithRules(text, node);
  } catch (err) {
    console.error(err);
    res = judgeWithRules(text, node);
    res.feedback = `(AI 판정 실패 → 규칙으로 판정: ${err.message}) ` + res.feedback;
  }
  G.log = G.log.filter((m) => m.type !== "thinking");
  G.log.pop(); // applyResult가 내 말을 다시 넣으므로 제거
  G.busy = false;
  const how = viaChoice ? (G.mode === "type" ? "선택지 참고" : "선택") : "직접";
  applyResult({ said: text, ...res, mode: `${how}·${useAI ? "AI" : "규칙"}${!viaChoice && G.peeked ? " (힌트 봄)" : ""}` });
}

/* 결과 반영 (선택지/직접 입력 공통) */
function applyResult({ said, effect, reply, feedback, mode, next, end, chosen }) {
  stopTimer();
  const node = getNode(G.nodeId);
  const isEvent = isEventId(G.nodeId);
  const total = { ...effect, patience: (effect.patience || 0) - G.rule.drain };
  for (const k of Object.keys(STAT_NAMES)) G.stats[k] = clamp(G.stats[k] + (total[k] || 0));

  G.log.push({ type: "me", text: said });
  G.log.push({ type: "npc", text: reply, delta: total });
  let best = null;
  if (!G.ai && node.choices.length) {
    const b = bestChoice(node, G.lv);
    if (chosen !== b) best = T(b.text);
  }
  G.history.push({ q: G.cur.npc, said, total, feedback, mode, best, event: isEvent });

  if (G.stats.patience <= 0) return finish(false, "patience");
  if (end) return finish(end === "success", end);

  let nextId;
  if (isEvent) { nextId = G.resume; G.resume = null; }
  else { nextId = next || node.next; G.mainCount++; }
  if (!nextId || nextId === "end") {
    const avg = (G.stats.like + G.stats.trust) / 2;
    return finish(avg >= G.clear, "score");
  }
  // 돌발 상황 끼워 넣기 (꼬리 질문 직전엔 끼우지 않음)
  if (!isEvent && G.queue.length && G.queue[0].pos <= G.mainCount && !getNode(nextId).tail) {
    const ev = G.queue.shift();
    G.resume = nextId;
    return enterNode(ev.id);
  }
  enterNode(nextId);
}

/* =========================================================
   판정 1: 키워드 규칙 (API 키 없을 때)
   ========================================================= */
function judgeWithRules(text, node) {
  const f = node.free || {};
  const eff = { like: 0, trust: 0, patience: 0 };
  const notes = [];
  const has = (words) => words.some((w) => w && text.toLowerCase().includes(fill(w).toLowerCase()));

  if (/(안녕하세요|감사|죄송|실례|부탁|괜찮으실까요|여쭤|말씀)/.test(text)) eff.like += 4;
  else if (!f.noPolite) { eff.like -= 4; notes.push("존댓말·감사·양해 같은 예의 표현이 더 있으면 좋아요."); }

  let hit = 0;
  for (const g of f.good || []) if (has(g.words)) { hit++; eff[g.stat] += g.points; notes.push("👍 " + g.note); }
  for (const g of f.bad || []) if (has(g.words)) { eff[g.stat] -= g.points; notes.push("⚠️ " + g.note); }
  if (text.length < 12) { eff.trust -= 5; notes.push("너무 짧아서 성의 없어 보일 수 있어요."); }
  else if (text.length > (G.lv === "하" ? 260 : 180)) { eff.patience -= 8; notes.push("말이 길어요. 핵심부터 짧게."); }
  if (hit === 0 && f.tip) notes.push(`💡 ${fill(f.tip)}`);

  const route = (f.routes || []).find((r) => has(r.words));
  const scaled = scaleEffect(eff, G.lv);
  const s = effSum(scaled);
  const tier = s >= 10 ? "good" : s >= 0 ? "mid" : "bad";
  return {
    effect: scaled,
    reply: (route && route.reply && T(route.reply)) || T(G.persona.reactions[tier]),
    feedback: notes.join(" "),
    next: route ? route.next : undefined,
  };
}

/* =========================================================
   AI (OpenAI API)
   ========================================================= */
function aiReady() { return !!store.get("openai_key"); }

async function callAI(system, user) {
  const key = store.get("openai_key");
  const model = store.get("openai_model") || "gpt-4o-mini";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`API 오류 ${r.status}`);
  const data = await r.json();
  return JSON.parse(data.choices[0].message.content);
}

function personaBlock() {
  const p = G.persona;
  const strict = { 하: "너그러운 편", 중: "보통", 상: "매우 깐깐하고 예민함" }[G.lv];
  return `상대 캐릭터: ${p.name}
- 성격·말투: ${p.desc}
- 좋아하는 것: ${p.likes}
- 싫어하는 것: ${p.dislikes}
- 깐깐함: ${G.lv} (${strict})`;
}
function situationBlock() {
  return `상황: ${fill(G.sc.title)}
플레이어의 목표: ${fill(G.sc.goal)}
${G.context ? "플레이어가 입력한 실제 상황 정보 (반드시 반영):\n" + G.context : ""}`;
}
const convoText = () => G.history.map((h) => `상대: ${h.q}\n플레이어: ${h.said}`).join("\n");

/* 장면 연출: 상대의 대사와 힌트 선택지를 상황 정보/성격에 맞게 생성 */
async function directNode(node, isFirst, isEvent) {
  const base = node.npc
    ? `참고용 기본 대본 (흐름과 의도는 유지하되, 위 상황 정보와 캐릭터 성격에 맞게 자연스럽게 바꿔라. 예: 전공이 다르면 전공에 맞는 소재로):
${isFirst && G.sc.intro ? "- 시작 묘사: " + T(G.sc.intro) + "\n" : ""}${node.narr ? "- 장면 묘사: " + T(node.narr) + "\n" : ""}- 상대 대사: ${T(node.npc)}
- 플레이어 선택지 예시: ${node.choices.map((c) => T(c.text)).join(" / ")}`
    : `이번 장면의 내용: ${node.topic}`;

  const system = `너는 현실 대화 연습 게임의 연출가이자 상대역이다. 한국어로 쓴다.
${situationBlock()}

${personaBlock()}

${isEvent ? "⚡ 이번 장면은 '예상치 못한 돌발 상황'이다. 상황 정보에 맞게 현실적으로 각색하고, narr에 무슨 일이 생겼는지 묘사하라. 이전 대화 흐름과 자연스럽게 이어지게 하라." : ""}
${isFirst ? "첫 장면이다. narr에 장소와 상대의 모습을 1~2문장으로 묘사하라." : ""}
${base}

규칙:
- npc: 캐릭터가 지금 하는 말 1~3문장. 캐릭터 성격·말투를 강하게 반영. 플레이어가 대답해야 할 질문이나 상황으로 끝낼 것.
- choices: 플레이어가 할 법한 대답 3개. 하나는 이 캐릭터에게 잘 통하는 답, 하나는 그럴듯하지만 이 캐릭터에겐 역효과인 답, 하나는 애매한 답.
  정답이 티 나지 않게 셋 다 비슷하게 공손하고 길이도 비슷하게. 순서는 섞어라. 상황 정보(전공, 이름, 프로젝트 등)를 구체적으로 활용하라.
JSON만 출력: {"narr": "장면 묘사 (필요 없으면 빈 문자열)", "npc": "...", "choices": ["...", "...", "..."]}`;

  const j = await callAI(system, convoText() ? "지금까지 대화:\n" + convoText() : "대화 시작.");
  if (!j.npc || !Array.isArray(j.choices) || j.choices.length < 2) throw new Error("응답 형식 오류");
  return {
    narr: isEvent ? "⚡ " + (String(j.narr || "").trim() || "예상치 못한 일이 생겼다!") : String(j.narr || "").trim(),
    npc: String(j.npc),
    choices: j.choices.slice(0, 3).map(String),
  };
}

/* 판정: 플레이어의 말을 캐릭터 입장에서 평가 */
async function judgeWithAI(text, node) {
  const routes = (node.free && node.free.routes) || [];
  const rubric = fill((node.free && node.free.rubric) || node.topic || "목표 달성에 도움이 되고 상대 성격에 맞는 대답인가");
  const system = `너는 대화 연습 게임의 상대역이자 심사위원이다. 한국어로 쓴다.
${situationBlock()}

${personaBlock()}
현재 속마음: 호감도 ${G.stats.like}, 신뢰도 ${G.stats.trust}, 인내심 ${G.stats.patience}
이번 장면의 평가 기준: ${rubric}

플레이어의 말을 이 캐릭터 입장에서 현실적으로 평가하라. 같은 말도 캐릭터의 성격·좋아하는 것·싫어하는 것에 따라 다르게 받아들여야 한다.
무조건 칭찬하지 말고, 애매하면 0 근처, 확실히 좋을 때만 큰 점수를 줘라.
${routes.length ? `대화 분기: 플레이어 말이 아래 조건에 해당하면 그 번호를, 아니면 -1을 route로 줘라.\n${routes.map((r, i) => `${i}: ${r.when}`).join("\n")}` : ""}
플레이어가 목표를 완전히 포기했거나 대화를 이어갈 수 없을 만큼 무례했다면 end를 "fail"로, 아니면 빈 문자열로.
반드시 JSON만 출력:
{"like": -15~15 정수, "trust": -15~15 정수, "patience": -15~8 정수,
 "reply": "캐릭터의 대답 (1~3문장, 캐릭터 말투. 다음 질문은 하지 말 것)",
 "feedback": "플레이어 코칭 2~3문장: 무엇이 먹혔고 무엇이 역효과였는지 + 이 캐릭터에게 더 잘 통할 문장 예시 1개",
 "route": 정수, "end": ""}`;

  const user = `${convoText() ? "지금까지 대화:\n" + convoText() + "\n\n" : ""}상대의 현재 말: ${G.cur.npc}\n플레이어의 대답: ${text}`;
  const j = await callAI(system, user);
  const lim = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
  const raw = { like: lim(j.like, -15, 15), trust: lim(j.trust, -15, 15), patience: lim(j.patience, -15, 8) };
  const route = routes[Number(j.route)];
  return {
    effect: scaleEffect(raw, G.lv),
    reply: String(j.reply || "..."),
    feedback: String(j.feedback || ""),
    next: route ? route.next : undefined,
    end: j.end === "fail" ? "fail" : undefined,
  };
}

/* =========================================================
   화면 3: 결과 + 리뷰
   ========================================================= */
function finish(success, reason) {
  stopTimer();
  G.ended = true;
  screen = { name: "result" };
  const { sc, lv, persona, stats, history } = G;
  const ending = success ? sc.endings.success
    : reason === "patience" ? sc.endings.patience
    : reason === "fail" && sc.endings.giveup ? sc.endings.giveup
    : sc.endings.fail;

  const best = [...history].sort((a, b) => effSum(b.total) - effSum(a.total))[0];
  const worst = [...history].sort((a, b) => effSum(a.total) - effSum(b.total))[0];
  const avg = Math.round((stats.like + stats.trust) / 2);
  const events = history.filter((h) => h.event).length;

  app.innerHTML = `
    <div class="result">
      <div class="big">${success ? "🎉" : "😓"}</div>
      <h1>${success ? "목표 달성!" : "목표 실패"}</h1>
      <p>${esc(T(ending))}</p>
      <p class="muted">${persona.face} ${esc(persona.name)} <span class="lv ${persona.custom ? "custom" : lv}">${persona.custom ? "직접·" + lv : lv}</span><br>
        호감도 ${stats.like} · 신뢰도 ${stats.trust} · 인내심 ${stats.patience}
        (평균 ${avg} / 통과 기준 ${G.clear}) · ⚡ 돌발 상황 ${events}번</p>
    </div>

    <h2>📝 대화 리뷰 — 상대의 속마음 공개</h2>
    ${history.map((h, i) => `
      <div class="review-item ${h.event ? "event" : ""}">
        <div class="muted">${h.event ? "⚡ 돌발 · " : ""}${i + 1}. ${esc(h.q)}</div>
        <div class="said">“${esc(h.said)}” <span class="tag">${h.mode}</span></div>
        <div class="delta">${deltaText(h.total)}</div>
        <div class="fb">💬 ${esc(h.feedback)}</div>
        ${h.best ? `<div class="model">✨ 이 상대에게 더 통했을 말: “${esc(h.best)}”</div>` : ""}
      </div>`).join("")}

    <div class="review-item">
      <b>요약</b><br>
      👍 가장 잘한 말: “${esc(best.said)}”<br>
      👎 아쉬운 말: “${esc(worst.said)}”<br>
      🧠 ${esc(persona.name)} 공략법: ${esc(persona.likes)}${persona.dislikes ? ` / 피할 것: ${esc(persona.dislikes)}` : ""}<br>
      📌 이 상황의 핵심: ${esc(sc.lesson)}
    </div>

    <div class="row mt">
      <button class="ghost" id="home">다른 상황</button>
      <button class="ghost" id="setup">설정 바꾸기</button>
      <button class="primary" id="retry">다시 하기 (돌발 상황 새로 뽑기)</button>
    </div>`;
  const origin = sc.custom ? { id: "custom", custom: true, emoji: "✏️", title: "나만의 상황", levels: sc.levels, setup: [] } : sc;
  app.querySelector("#home").onclick = renderHome;
  app.querySelector("#setup").onclick = () => renderSetup(origin);
  app.querySelector("#retry").onclick = () => startGame(sc, G.S);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   AI 설정 창
   ========================================================= */
const dlg = document.getElementById("settings");
document.getElementById("settingsBtn").onclick = () => {
  if (G && !G.ended) { saveDraft(); stopTimer(); }
  document.getElementById("apiKey").value = store.get("openai_key");
  document.getElementById("apiModel").value = store.get("openai_model") || "gpt-4o-mini";
  dlg.showModal();
};
dlg.addEventListener("close", () => {
  if (screen.name === "game" && G && !G.ended && !G.busy) renderGame();
  else if (screen.name === "setup") renderSetup(screen.sc);
  else if (screen.name === "home") renderHome();
});
document.getElementById("saveKey").onclick = () => {
  store.set("openai_key", document.getElementById("apiKey").value.trim());
  store.set("openai_model", document.getElementById("apiModel").value.trim() || "gpt-4o-mini");
  dlg.close();
};
document.getElementById("clearKey").onclick = () => {
  store.del("openai_key");
  document.getElementById("apiKey").value = "";
};
document.getElementById("homeBtn").onclick = renderHome;

renderHome();
