const fs = require("fs");
const vm = require("vm");

function stubElement() {
  return {
    innerHTML: "", value: "", checked: false, disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, dataset: {},
    addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
    querySelectorAll() { return []; }, focus() {}, showModal() {}, close() {},
    scrollTop: 0, scrollHeight: 0
  };
}

const elements = new Map();
const documentStub = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, stubElement());
    return elements.get(id);
  },
  querySelectorAll() { return []; },
  createElement() { return stubElement(); },
  body: stubElement(),
  documentElement: stubElement(),
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
if (!engine) throw new Error("对话引擎测试接口未加载");

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

test("导出版本统一为2.18", () => engine.APP_VERSION === "2.18");

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

test("询问想聊什么时角色主动提供入口", () => {
  const session = make();
  const { analysis, response } = runTurn(session, "你想聊什么啊");
  return analysis.flags.conversationRepair && /[？?]/.test(response.text) && !/不知道怎么接/.test(response.text);
});

test("连续救场回复不重复也不堵死", () => {
  const session = make();
  const inputs = ["为什么不知道怎么接啊", "看你照片是在西湖的吗", "你想聊什么啊", "怎么一直提示不知道怎么接啊"];
  const replies = inputs.map(text => runTurn(session, text).response.text);
  return replies.every(text => !/不知道怎么接/.test(text)) && new Set(replies).size === replies.length;
});

test("真正催促仍然触发角色边界", () => {
  const session = make(11, "zhouning");
  const { analysis, response } = runTurn(session, "怎么这么久才回我，你必须马上回消息");
  return analysis.flags.pressure && /催|工作|压力|时间|手机|暂停|不适合/.test(response.text);
});

test("六名角色均有完整续接知识库", () => Object.keys(engine.CHARACTERS).every(id => {
  const item = engine.CONVERSATION_SUPPORT[id];
  return item && item.profile.length >= 2 && item.restart.length >= 3 && item.lowScore.length >= 3;
}));

let failed = 0;
for (const item of tests) {
  let ok = false;
  try { ok = Boolean(item.check()); } catch (error) { console.error(error); }
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${item.name}`);
}
if (failed) process.exit(1);
console.log(`全部通过：${tests.length}/${tests.length}`);
