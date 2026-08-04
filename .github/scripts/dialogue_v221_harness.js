const fs = require("fs");
const vm = require("vm");

function stubElement() {
  return {
    id: "", className: "", innerHTML: "", value: "", checked: false, disabled: false, textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} }, dataset: {},
    addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
    insertAdjacentHTML() {}, scrollIntoView() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; },
    focus() {}, showModal() {}, close() {}, click() {},
    scrollTop: 0, scrollHeight: 0
  };
}

const elements = new Map();
const documentStub = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, stubElement());
    return elements.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return stubElement(); },
  body: stubElement(), head: stubElement(), documentElement: stubElement(), activeElement: null,
  addEventListener() {}, visibilityState: "visible"
};

const context = {
  console,
  document: documentStub,
  window: { addEventListener() {}, matchMedia() { return { matches: false, addEventListener() {} }; }, innerHeight: 844, visualViewport: null },
  navigator: {}, location: { protocol: "file:" },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  confirm() { return true; }, alert() {},
  Blob: global.Blob, TextEncoder: global.TextEncoder, TextDecoder: global.TextDecoder,
  URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
  setTimeout, clearTimeout
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("app.js", "utf8"), context);

const engine = context.__heartTrainingTest;
const v219 = context.__heartTrainingV219;
const v220 = context.__heartTrainingV220;
const v221 = context.__heartTrainingV221;
if (!engine || !v219 || !v220 || !v221) throw new Error("V2.21测试接口未加载");

function make(levelId = 1, characterId = "linxia") {
  const level = engine.LEVELS.find(item => item.id === levelId);
  const char = engine.CHARACTERS[characterId || level.character];
  return engine.createSession({ ...level, character: char.id }, char, false);
}

function makeScene(sceneId) {
  const scene = v220.REAL_SCENARIOS_V220[sceneId];
  const char = engine.CHARACTERS[scene.characterId];
  const level = v220.buildRealScenarioLevelV220(scene, char);
  const session = engine.createSession(level, char, true, scene.config);
  session.realScenario = { id: scene.id, rewarded: false, safeTurns: 0, boundaryTurns: 0 };
  session.metrics.comfort = Math.max(8, Math.min(90, session.metrics.comfort + scene.metrics.comfort));
  session.metrics.interest = Math.max(4, Math.min(char.maxInterest || 90, session.metrics.interest + scene.metrics.interest));
  session.metrics.pressure = Math.max(0, Math.min(88, session.metrics.pressure + scene.metrics.pressure));
  return session;
}

function runTurn(session, text) {
  const analysis = engine.analyzeMessage(text, session);
  session.turn += 1;
  session.analyses.push(analysis);
  session.messages.push({ from: "me", text, score: analysis.score });
  engine.updateSessionMetrics(analysis, session);
  engine.updateConversationMemory(analysis, session);
  const response = engine.generateResponse(analysis, session);
  session.messages.push({ from: "her", text: response.text });
  return { analysis, response };
}

function fakeSession(analyses) {
  const messages = [{ from: "her", text: "开场消息" }];
  analyses.forEach((analysis, index) => {
    messages.push({ from: "me", text: analysis.text || `用户第${index + 1}句`, score: analysis.score });
    messages.push({ from: "her", text: `角色第${index + 1}次回应` });
  });
  return {
    level: { title: "复盘测试", objective: "测试逐句复盘" },
    char: { id: "linxia", name: "林夏", maxInterest: 90 },
    personality: { label: "温和慢热" }, trainingMode: "coach",
    isFree: false, isMistake: false, messages, analyses,
    metrics: { comfort: 58, interest: 48, pressure: 18 }, counters: {}, memory: {}
  };
}

function analysis(score, options = {}) {
  return {
    text: options.text || "测试表达",
    score,
    questionCount: options.questionCount || 0,
    relevant: options.relevant !== false,
    flags: { ...(options.flags || {}) },
    issues: options.issues || [],
    strengths: options.strengths || [],
    semantic: options.semantic || { action: "自我分享", object: "当前交流", context: "回应了上一句话" }
  };
}

const tests = [];
function test(name, check) { tests.push({ name, check }); }

test("导出版本统一为2.21", () => engine.APP_VERSION === "2.21");
test("V2.19角色层仍然存在", () => Object.keys(engine.CHARACTERS).every(id => v219.ROLE_PERSONALITIES_V219[id]?.label));
test("V2.20五个真实场景仍然存在", () => Object.keys(v220.REAL_SCENARIOS_V220).length === 5);
test("V2.21回放版本为1", () => v221.REPLAY_VERSION_V221 === 1);
test("问题替代表达库覆盖催促和审问", () => Boolean(v221.REPLAY_ISSUE_COPY_V221.pressure?.alternative && v221.REPLAY_ISSUE_COPY_V221.interrogation?.alternative));

test("回放会保存每轮用户原文与角色回应", () => {
  const replay = v221.buildSessionReplayV221(fakeSession([analysis(82, { text: "我也有过类似经历。" })]), { passed: true, avg: 82 });
  return replay.turns.length === 1 && replay.turns[0].userText.includes("类似经历") && replay.turns[0].replyText.includes("角色第1次回应");
});

test("高分句标记为绿色表现", () => v221.buildSessionReplayV221(fakeSession([analysis(86, { strengths: ["自然承接"] })]), { avg: 86 }).turns[0].tone === "good");
test("中等句标记为黄色表现", () => v221.buildSessionReplayV221(fakeSession([analysis(68)]), { avg: 68 }).turns[0].tone === "mid");
test("低分句标记为红色表现", () => v221.buildSessionReplayV221(fakeSession([analysis(42)]), { avg: 42 }).turns[0].tone === "bad");
test("施压句即使分数异常也强制标红", () => v221.buildSessionReplayV221(fakeSession([analysis(70, { flags: { pressure: true } })]), { avg: 70 }).turns[0].tone === "bad");

test("最佳与最低轮次会被识别", () => {
  const replay = v221.buildSessionReplayV221(fakeSession([analysis(60), analysis(91), analysis(35)]), { avg: 62 });
  return replay.bestTurn === 2 && replay.worstTurn === 3;
});

test("关键边界动作会成为蓝色转折点", () => {
  const points = v221.findTurningPointsV221([analysis(58), analysis(80, { flags: { respectRejection: true } })]);
  return (points.get(1) || []).some(item => item.includes("边界"));
});

test("明显压力上升会成为关键转折点", () => {
  const points = v221.findTurningPointsV221([analysis(75), analysis(38, { flags: { pressure: true } })]);
  return (points.get(1) || []).some(item => item.includes("压力"));
});

test("分数大幅提升会记录提升幅度", () => {
  const points = v221.findTurningPointsV221([analysis(45), analysis(80)]);
  return (points.get(1) || []).some(item => item.includes("提升35分"));
});

test("连续多问题会计入无效追问", () => {
  const replay = v221.buildSessionReplayV221(fakeSession([analysis(48, { questionCount: 2, issues: [{ key: "interrogation", text: "问题太多" }] })]), { avg: 48 });
  return replay.ineffectiveQuestions === 1 && replay.topIssue.key === "interrogation";
});

test("尊重拒绝与自然收尾会计入边界动作", () => {
  const replay = v221.buildSessionReplayV221(fakeSession([
    analysis(82, { flags: { respectRejection: true } }),
    analysis(84, { flags: { ending: true } })
  ]), { avg: 83 });
  return replay.boundarySignals === 2;
});

test("催回复会生成可以直接参考的替代表达", () => {
  const session = fakeSession([]);
  const text = v221.getAlternativeV221(analysis(30, { flags: { pressure: true }, issues: [{ key: "pressure", text: "催促" }] }), session);
  return /先忙|不用赶着回|有空再聊/.test(text);
});

test("明确拒绝场景会生成尊重拒绝方向", () => {
  const session = fakeSession([]);
  session.realScenario = { id: "inviteRejected" };
  const text = v221.getAlternativeV221(analysis(62), session);
  return /尊重|不勉强|先这样/.test(text);
});

test("回放HTML包含逐句分数和替代表达", () => {
  const replay = v221.buildSessionReplayV221(fakeSession([analysis(40, { issues: [{ key: "coldReply", text: "太短" }] })]), { avg: 40 });
  const html = v221.renderReplayHtmlV221(replay);
  return /第1轮 · 40分/.test(html) && /更好的表达方向/.test(html);
});

test("回放数据可以完整JSON持久化", () => {
  const replay = v221.buildSessionReplayV221(fakeSession([analysis(81)]), { passed: true, avg: 81 });
  const restored = JSON.parse(JSON.stringify(replay));
  return restored.replayVersion === 1 && restored.turns[0].score === 81;
});

test("只回哈哈场景仍可自然续接", () => {
  const session = makeScene("dryHaha");
  const { analysis, response } = runTurn(session, "确实有点离谱，我也经常被这种小事逗笑。你最近有遇到类似的事吗？");
  return analysis.scenario.delta > 0 && /画面|后来|继续说/.test(response.text);
});

test("邀约被拒后继续换时间仍会被拒绝", () => {
  const session = makeScene("inviteRejected");
  const { analysis, response } = runTurn(session, "那下周呢？我们换个时间一起吃饭吧。");
  return analysis.scenario.delta < 0 && /不是换个时间/.test(response.text);
});

test("关系降温时接受现实仍可完成目标", () => {
  const session = makeScene("relationshipCooling");
  runTurn(session, "我理解你的决定，也尊重你的决定。我会减少联系，把注意力放回自己的安排。");
  runTurn(session, "那先这样，我也需要一点距离。");
  return v220.getRealScenarioStatusV220(session).met;
});

test("不同角色仍然有差异化评分", () => {
  const suyan = make(1, "suyan");
  const chenke = make(1, "chenke");
  const text = "你平时喜欢看电影吗？周末会不会去看展？";
  return engine.analyzeMessage(text, chenke).score > engine.analyzeMessage(text, suyan).score;
});

test("最近三轮上下文仍可维持旧话题", () => {
  const session = make();
  session.turn = 3;
  session.messages.push({ from: "her", text: "我最近去吃了一家火锅店。" }, { from: "me", text: "听起来不错。" }, { from: "her", text: "哈哈。" });
  const result = engine.analyzeMessage("我也经常吃火锅，辣锅比较过瘾。", session);
  return result.relevant && result.context.topicMatch.includes("food");
});

test("关闭教练模式仍进入沉浸模式", () => {
  const previous = engine.state.settings.coachMode;
  engine.state.settings.coachMode = false;
  const session = makeScene("dryHaha");
  engine.state.settings.coachMode = previous;
  return session.trainingMode === "immersive";
});

test("正式关卡隐藏挑战仍然可用", () => {
  const session = make(1, "linxia");
  session.counters.relevant = 2;
  return v219.getHiddenGoalStatusV219(session)?.met === true;
});

let failed = 0;
for (const item of tests) {
  let ok = false;
  try { ok = Boolean(item.check()); } catch (error) { console.error(error); }
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${item.name}`);
}
if (failed) process.exit(1);
console.log(`全部通过：${tests.length}/${tests.length}`);
