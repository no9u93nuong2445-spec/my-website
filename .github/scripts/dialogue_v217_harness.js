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
  addEventListener() {},
  visibilityState: "visible"
};

const context = {
  console,
  document: documentStub,
  window: { addEventListener() {}, matchMedia() { return { matches: false, addEventListener() {} }; } },
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

let failed = 0;
for (const item of tests) {
  let ok = false;
  try { ok = Boolean(item.check()); } catch (error) { console.error(error); }
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${item.name}`);
}
if (failed) process.exit(1);
console.log(`全部通过：${tests.length}/${tests.length}`);
