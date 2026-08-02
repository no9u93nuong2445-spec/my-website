const fs = require("fs");
const vm = require("vm");

function stubElement() {
  return {
    innerHTML: "", value: "", checked: false, disabled: false, textContent: "",
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
  body: stubElement(),
  head: stubElement(),
  documentElement: stubElement(),
  activeElement: null,
  addEventListener() {},
  visibilityState: "visible"
};

const context = {
  console,
  document: documentStub,
  window: {
    addEventListener() {},
    matchMedia() { return { matches: false, addEventListener() {} }; },
    innerHeight: 844,
    visualViewport: null
  },
  navigator: {},
  location: { protocol: "file:" },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  confirm() { return true; }, alert() {},
  Blob: global.Blob,
  TextEncoder: global.TextEncoder,
  TextDecoder: global.TextDecoder,
  URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
  setTimeout, clearTimeout
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("app.js", "utf8"), context);

const engine = context.__heartTrainingTest;
const v219 = context.__heartTrainingV219;
const v220 = context.__heartTrainingV220;
if (!engine || !v219 || !v220) throw new Error("V2.20测试接口未加载");

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

const tests = [];
function test(name, check) { tests.push({ name, check }); }

test("导出版本统一为2.20", () => engine.APP_VERSION === "2.20");

test("保留V2.19六名独立角色参数", () => Object.keys(engine.CHARACTERS).every(id => v219.ROLE_PERSONALITIES_V219[id]?.label));

test("包含五个真实关系场景", () => Object.keys(v220.REAL_SCENARIOS_V220).length === 5);

test("每个场景都有连续训练所需字段", () => Object.values(v220.REAL_SCENARIOS_V220).every(scene =>
  scene.opening && scene.objective && scene.minTurns >= 2 && scene.maxTurns > scene.minTurns && scene.references.length
));

test("只回哈哈时自然补充内容会得到正向修正", () => {
  const session = makeScene("dryHaha");
  const { analysis, response } = runTurn(session, "确实有点离谱，我也经常被这种小事逗笑。你最近有遇到类似的事吗？");
  return analysis.scenario.delta > 0 && analysis.score >= 60 && /画面|后来|继续说/.test(response.text);
});

test("只回哈哈时连续审问会被降分", () => {
  const session = makeScene("dryHaha");
  const { analysis, response } = runTurn(session, "你笑什么？是不是觉得我很无聊？为什么只回哈哈？");
  return analysis.scenario.delta < 0 && analysis.issues.some(item => item.key === "scenarioPace") && /不用一次问|顺手回/.test(response.text);
});

test("回复变慢时给空间会得到正向回应", () => {
  const session = makeScene("cooling");
  const { analysis, response } = runTurn(session, "明白，你先处理工作，不急着回，忙完有空再聊。");
  return analysis.scenario.delta > 0 && (analysis.flags.acceptUncertainty || analysis.flags.ending) && /谢谢你理解|有空/.test(response.text);
});

test("回复变慢时催促会触发边界", () => {
  const session = makeScene("cooling");
  const { analysis, response } = runTurn(session, "你怎么又这么久才回，忙也不至于看不到消息吧？");
  return analysis.scenario.delta < 0 && analysis.flags.pressure && /回复速度|解释/.test(response.text);
});

test("邀约被拒后继续换时间会再次被拒绝", () => {
  const session = makeScene("inviteRejected");
  const { analysis, response } = runTurn(session, "那下周呢？我们换个时间一起吃饭吧。");
  return analysis.scenario.delta < 0 && analysis.flags.invite && /不是换个时间/.test(response.text);
});

test("邀约被拒后接受并收尾可以完成目标", () => {
  const session = makeScene("inviteRejected");
  runTurn(session, "明白了，我尊重你的决定，不勉强。那先这样吧。");
  runTurn(session, "好的，之后有空再聊。");
  const status = v220.getRealScenarioStatusV220(session);
  return status.met && session.counters.respectRejection >= 1 && session.counters.ending >= 1;
});

test("第一次见面后具体反馈优于立刻推进", () => {
  const good = makeScene("afterDate");
  const bad = makeScene("afterDate");
  const goodResult = engine.analyzeMessage("到家就好。今天聊得挺轻松，我也很喜欢路上那个小插曲。你早点休息。", good);
  const badResult = engine.analyzeMessage("那我们明天再约吧，我觉得你肯定也喜欢我，对吗？", bad);
  return goodResult.score > badResult.score && badResult.scenario.delta < 0;
});

test("第一次见面后推进过快会被主动降速", () => {
  const session = makeScene("afterDate");
  const { response } = runTurn(session, "宝贝我想你了，我们明天继续见面吧。");
  return /不用这么快|先不用/.test(response.text);
});

test("第一次见面后回应并收尾可以完成目标", () => {
  const session = makeScene("afterDate");
  runTurn(session, "到家就好。今天聊得挺轻松，我也很喜欢路上那个小插曲。你早点休息。");
  runTurn(session, "晚安，改天聊。");
  return v220.getRealScenarioStatusV220(session).met;
});

test("关系降温时接受现实并照顾自己可以完成目标", () => {
  const session = makeScene("relationshipCooling");
  runTurn(session, "我理解你的决定，也尊重你的决定。我会减少联系，把注意力放回自己的安排。");
  runTurn(session, "那先这样，我也需要一点距离。");
  const status = v220.getRealScenarioStatusV220(session);
  return status.met && session.counters.respectRejection >= 1 && (session.counters.selfBoundary >= 1 || session.counters.ending >= 1);
});

test("关系降温时证明和追问会触发明确边界", () => {
  const session = makeScene("relationshipCooling");
  const { analysis, response } = runTurn(session, "我为你做了这么多，你为什么还要减少联系？再给我一次机会吧。");
  return analysis.scenario.delta < 0 && /不是让你继续证明|减少联系/.test(response.text);
});

test("同一句话面对不同角色仍有差异化评分", () => {
  const suyan = make(1, "suyan");
  const chenke = make(1, "chenke");
  const text = "你平时喜欢看电影吗？周末会不会去看展？";
  const quiet = engine.analyzeMessage(text, suyan);
  const outgoing = engine.analyzeMessage(text, chenke);
  return outgoing.score > quiet.score;
});

test("普通拍照话题不会退回头像固定回答", () => {
  const session = make();
  runTurn(session, "你头像是在西湖拍的吗？");
  const { analysis, response } = runTurn(session, "你平时喜欢拍照片吗？");
  return !analysis.flags.profileReference && !/^你说头像|^那张照片是旅行|不是西湖/.test(response.text);
});

test("低分但非严重越界仍会提高压力", () => {
  const session = make();
  const before = session.metrics.pressure;
  const { analysis } = runTurn(session, "随便");
  return analysis.score < 60 && session.metrics.pressure > before;
});

test("最近三轮上下文仍可维持旧话题", () => {
  const session = make();
  session.turn = 3;
  session.messages.push(
    { from: "her", text: "我最近去吃了一家火锅店。" },
    { from: "me", text: "听起来不错。" },
    { from: "her", text: "哈哈。" }
  );
  const analysis = engine.analyzeMessage("我也经常吃火锅，辣锅比较过瘾。", session);
  return analysis.relevant && analysis.context.topicMatch.includes("food");
});

test("关闭教练模式后新会话仍进入沉浸模式", () => {
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

test("真实场景达标且均分足够时判定通过", () => {
  const session = makeScene("inviteRejected");
  session.turn = 2;
  session.counters.respectRejection = 1;
  session.counters.ending = 1;
  session.counters.noPressure = 2;
  session.analyses = [
    { score: 82, flags: {}, issues: [] },
    { score: 80, flags: {}, issues: [] }
  ];
  const result = engine.evaluateSession(session, false);
  return result.finished && result.passed && result.scenarioStatus.met;
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
