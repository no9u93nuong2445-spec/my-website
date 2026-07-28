const fs = require('fs');
const { chromium } = require('playwright-core');

const liveUrl = process.env.LIVE_URL || 'https://no9u93nuong2445-spec.github.io/my-website/';
const result = {
  status: 'failed',
  release: '217',
  url: liveUrl,
  checked_at: new Date().toISOString(),
  checks: {},
  inputs: [],
  replies: [],
  scores: [],
  console_errors: [],
  page_errors: [],
  request_failures: [],
  bad_responses: [],
  error: null
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForPublishedVersion() {
  let last = '';
  for (let attempt = 1; attempt <= 18; attempt += 1) {
    try {
      const stamp = Date.now();
      const [homeRes, appRes] = await Promise.all([
        fetch(`${liveUrl}?v=217&verify=${stamp}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) }),
        fetch(`${liveUrl}app.js?v=217&verify=${stamp}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
      ]);
      const home = await homeRes.text();
      const app = await appRes.text();
      const appBytes = Buffer.byteLength(app);
      last = `首页${homeRes.status}/${Buffer.byteLength(home)}字节 app${appRes.status}/${appBytes}字节`;
      if (homeRes.ok && appRes.ok && home.includes('app.js?v=217') &&
          app.includes('CONVERSATION_SUPPORT') && app.includes('conversationRepair') &&
          app.includes('profileReference') && appBytes > 285000) {
        result.checks.published = last;
        result.checks.app_bytes = appBytes;
        return;
      }
    } catch (error) {
      last = `${error.name}: ${error.message}`;
    }
    await sleep(5000);
  }
  throw new Error(`等待V2.17发布超时：${last}`);
}

async function run() {
  await waitForPublishedVersion();
  const browser = await chromium.launch({
    executablePath: process.env.CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') result.console_errors.push(message.text());
  });
  page.on('pageerror', error => result.page_errors.push(error.stack || error.message));
  page.on('requestfailed', request => result.request_failures.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));
  page.on('response', response => {
    if (response.status() >= 400) result.bad_responses.push(`${response.status()} ${response.url()}`);
  });

  try {
    await page.goto(`${liveUrl}?v=217&verify=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('.level-card').length === 45, null, { timeout: 60000 });
    const onboarding = page.locator('#onboardingDialog[open]');
    if (await onboarding.count()) await page.locator('#onboardingSkipBtn').click();

    result.checks.level_cards = await page.locator('.level-card').count();
    result.checks.navigation_items = await page.locator('.nav-item').count();
    await page.locator('.level-card:not([disabled])').first().click();
    await page.locator('#messageInput').waitFor({ state: 'visible', timeout: 15000 });

    const inputs = [
      '为什么不知道怎么接啊',
      '看你照片是在西湖的吗 挺好看的啊',
      '你想聊什么啊',
      '怎么一直提示不知道怎么接啊'
    ];
    result.inputs = inputs;

    for (const input of inputs) {
      const beforeHer = await page.locator('.message-row.her').count();
      await page.locator('#messageInput').fill(input);
      await page.locator('#sendBtn').click();
      await page.waitForFunction(value => document.querySelectorAll('.message-row.her').length > value, beforeHer, { timeout: 15000 });
      result.replies.push((await page.locator('.message-row.her').last().innerText()).trim());
      result.scores.push((await page.locator('.message-row.me').last().innerText()).trim());
    }

    result.checks.mobile_overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    result.checks.unique_replies = new Set(result.replies).size;
    result.checks.dead_end_replies = result.replies.filter(text => /^(这个)?我不太知道怎么接[。！!]?$/u.test(text) || /不知道怎么接/.test(text));
    result.checks.profile_reply = result.replies[1];
    result.checks.question_bearing_replies = result.replies.filter(text => /[？?]/.test(text)).length;
    await page.screenshot({ path: 'dialogue-v217-live.png', fullPage: true });

    if (result.checks.level_cards !== 45) throw new Error(`关卡数量错误：${result.checks.level_cards}`);
    if (result.checks.navigation_items !== 5) throw new Error(`导航数量错误：${result.checks.navigation_items}`);
    if (result.checks.mobile_overflow) throw new Error('390×844手机视口出现横向溢出');
    if (result.checks.dead_end_replies.length) throw new Error(`仍出现死回复：${result.checks.dead_end_replies.join(' | ')}`);
    if (result.checks.unique_replies !== inputs.length) throw new Error(`回复发生重复：${result.replies.join(' | ')}`);
    if (result.checks.question_bearing_replies < 3) throw new Error('角色没有持续留下可继续的话题入口');
    if (!/头像|照片|旅行|西湖|风景|湖边|景色/.test(result.replies[1])) throw new Error(`照片问题没有得到对应回答：${result.replies[1]}`);
    if (result.console_errors.length || result.page_errors.length || result.request_failures.length || result.bad_responses.length) {
      throw new Error('浏览器控制台或网络仍存在错误');
    }
    result.status = 'passed';
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  result.error = error.stack || String(error);
}).finally(() => {
  result.checked_at = new Date().toISOString();
  fs.writeFileSync('DIALOGUE_V217_VERIFIED.json', JSON.stringify(result, null, 2) + '\n');
  if (result.status !== 'passed') process.exitCode = 1;
});
