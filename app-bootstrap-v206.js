(() => {
  "use strict";
  try {
    const chunks = window.__HEART_APP_B64__ || [];
    if (chunks.length !== 10) throw new Error(`程序文件数量异常：${chunks.length}/10`);
    const decoded = chunks.map(value => {
      const raw = atob(value);
      return Uint8Array.from(raw, ch => ch.charCodeAt(0));
    });
    const total = decoded.reduce((sum, item) => sum + item.length, 0);
    if (total !== 290554) throw new Error(`程序大小异常：${total}`);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const item of decoded) { bytes.set(item, offset); offset += item.length; }
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!source.startsWith("(() => {") || !source.includes("const TOTAL_LEVELS = 45") || !source.endsWith("})();\n")) {
      throw new Error("程序源码校验失败");
    }
    delete window.__HEART_APP_B64__;
    (0, eval)(source);
  } catch (error) {
    console.error(error);
    const view = document.getElementById("mainView");
    if (view) view.innerHTML = `<section class="panel"><h2>程序启动失败</h2><p>${String(error.message || error)}</p><button type="button" onclick="location.reload()">重新打开</button></section>`;
  }
})();
