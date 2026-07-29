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
if (!engine || !v219) throw new Error("V2.19测试接口未加载");

function make(levelId = 1, characterId = "linxia") {
  const level = engine.LEVELS.find(item => item.id === levelId);
  const char = engine.CHARACTERS[characterId || level.character];
  return engine.createSession({ ...level, character: char.id }, char, false);
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

test("导出版本统一为2.19", () => engine.APP_VERSION === "2.19");

test("六名角色均有独立真人感参数", () => {
  const profiles = v219.ROLE_PERSONALITIES_V219;
  return Object.keys(engine.CHARACTERS).every(id => {
    const item = profiles[id];
    return item && item.label && item.description && item.preferredTopics.length >= 3 && item.idealLength.length === 2;
  });
});

test("新会话自动绑定角色参数和隐藏挑战", () => {
  const session = make(1, "linxia");
  return session.personality?.label === "温和慢热" && session.hiddenGoal?.key === "listen" && session.trainingMode === "coach";
});

test("语义识别同时给出动作对象和上下文", () => {
  const session = make();
  session.messages.push({ from: "her", text: "我周末喜欢去吃火锅。" });
  const analysis = engine.analyzeMessage("听起来挺开心的，我周末也喜欢吃火锅。你更喜欢辣锅还是清汤？", session);
  return analysis.semantic?.action === "分享并提问" && analysis.semantic.topics.includes("food") && analysis.semantic.object !== "当前交流" && /承接|回应/.test(analysis.semantic.context);
});

test("同一句话面对不同角色会得到不同匹配分", () => {
  const suyan = make(1, "suyan");
  const chenke = make(1, "chenke");
  const text = "你平时喜欢看电影吗？周末会不会去看展？";
  const quiet = engine.analyzeMessage(text, suyan);
  const outgoing = engine.analyzeMessage(text, chenke);
  return outgoing.score > quiet.score && quiet.personality.delta < outgoing.personality.delta;
});

test("角色偏好话题会实际增加匹配分", () => {
  const session = make(1, "linxia");
  const analysis = engine.analyzeMessage("我周末也喜欢探店，最近吃到一家很不错的火锅店。", session);
  return analysis.semantic.topics.includes("food") && analysis.personality.delta >= 4 && analysis.personality.matched.length > 0;
});

test("许悦会对过早亲密表达明显降分", () => {
  const session = make(1, "xuyue");
  const analysis = engine.analyzeMessage("宝贝我想你了，抱抱你。", session);
  return analysis.semantic.topics.includes("intimacy") && analysis.personality.delta <= -8 && analysis.score < 45;
});

test("隐藏挑战可以独立判定且不改写关卡目标", () => {
  const session = make(1, "linxia");
  session.counters.relevant = 2;
  const status = v219.getHiddenGoalStatusV219(session);
  return status.key === "listen" && status.met && /2\/2/.test(status.progress) && session.level.objective;
});

test("关闭教练模式后新会话进入沉浸模式", () => {
  const previous = engine.state.settings.coachMode;
  engine.state.settings.coachMode = false;
  const session = make(1, "linxia");
  engine.state.settings.coachMode = previous;
  return session.trainingMode === "immersive";
});

test("角色回复原因包含独立性格影响", () => {
  const session = make(1, "linxia");
  const { response } = runTurn(session, "我周末也喜欢探店，最近吃到一家不错的火锅店。你更喜欢辣锅还是清汤？");
  return /温和慢热/.test(response.reason);
});

test("首轮明确头像问题仍触发资料切入", () => {
  const session = make();
  const { analysis, response } = runTurn(session, "看你照片是在西湖的吗，挺好看的");
  return analysis.flags.profileReference && /头像|照片|旅行|西湖|风景|湖边|景色/.test(response.text);
});

test("普通拍照话题不会误触发固定头像回答", () => {
  const session = make();
  runTurn(session, "你头像是在西湖拍的吗？");
  const { analysis, response } = runTurn(session, "你平时喜欢拍照片吗？");
  return !analysis.flags.profileReference && !/^你说头像|^那张照片是旅行|不是西湖/.test(response.text);
});

test("低分但非严重越界也会提高压力", () => {
  const session = make();
  const before = session.metrics.pressure;
  const { analysis } = runTurn(session, "随便");
  return analysis.score < 60 && session.metrics.pressure > before;
});

test("高质量回应会降低压力", () => {
  const session = make();
  session.metrics.pressure = 20;
  session.messages.push({ from: "her", text: "我周末喜欢去吃火锅。" });
  const before = session.metrics.pressure;
  const { analysis } = runTurn(session, "听起来挺开心的，我周末也会找一家火锅店放松。你更喜欢清汤还是辣锅？");
  return analysis.score >= 75 && session.metrics.pressure < before;
});

test("最近三轮上下文可以维持旧话题", () => {
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

test("真正催促仍然触发角色边界", () => {
  const session = make(11, "zhouning");
  const { analysis, response } = runTurn(session, "怎么这么久才回我，你必须马上回消息");
  return analysis.flags.pressure && /催|工作|压力|时间|手机|暂停|不适合/.test(response.text);
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
