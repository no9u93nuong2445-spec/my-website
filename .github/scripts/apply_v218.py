from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Patch marker not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_all(path: str, replacements: list[tuple[str, str]]) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        p.write_text(text, encoding='utf-8')


replace_once('fragments/app-01.txt', '  const APP_VERSION = "2.0";', '  const APP_VERSION = "2.18";')

replace_once(
    'fragments/app-13.txt',
    '''    const lastHer = [...currentSession.messages].reverse().find(msg => msg.from === "her")?.text || "";
    const contains = patterns => patterns.some(pattern => pattern.test(normalized));
    const questionCount = countQuestions(normalized);
    const lastContext = analyzeContext(lastHer);
    const contextText = currentSession.turn <= 1 ? `${lastHer} ${currentSession.level.intro || ""}` : lastHer;''',
    '''    const recentHerContext = currentSession.messages
      .filter(msg => msg.from === "her")
      .slice(-3)
      .map(msg => msg.text)
      .join(" ");
    const lastHer = [...currentSession.messages].reverse().find(msg => msg.from === "her")?.text || "";
    const contains = patterns => patterns.some(pattern => pattern.test(normalized));
    const questionCount = countQuestions(normalized);
    const lastContext = analyzeContext(lastHer);
    const contextText = currentSession.turn <= 1
      ? `${recentHerContext || lastHer} ${currentSession.level.intro || ""}`
      : (recentHerContext || lastHer);'''
)

replace_once(
    'fragments/app-13.txt',
    '''    if (flags.coldReply) flags.humor = false;

    const topicMatch = matchTopics(contextText, normalized);''',
    '''    if (flags.coldReply) flags.humor = false;

    const explicitProfileReference =
      /(头像|主页|资料(?:里|上)?|背景图)/.test(normalized) ||
      /你(?:这|那|的)?(?:张)?(?:照片|相片)/.test(normalized) ||
      /(?:照片|相片).{0,10}(?:哪里|哪儿|哪拍|拍的|西湖|景色|风景)/.test(normalized);
    flags.profileReference = Boolean(
      flags.profileReference &&
      explicitProfileReference &&
      currentSession.turn <= 1 &&
      currentSession.level.chapter <= 2
    );

    const topicMatch = matchTopics(contextText, normalized);'''
)
replace_once(
    'fragments/app-13.txt',
    '    const profileStarter = flags.profileReference && currentSession.level.chapter <= 2;',
    '    const profileStarter = flags.profileReference;'
)

replace_once(
    'fragments/app-14.txt',
    '    metrics.pressure = clamp(metrics.pressure + (severe ? 22 : issues.length >= 2 ? 8 : -3), 0, 100);',
    '''    const pressureDelta = severe
      ? 22
      : analysis.score < 45
        ? 10
        : (analysis.score < 60 || issues.length >= 2)
          ? 5
          : analysis.score >= 75
            ? -4
            : -1;
    metrics.pressure = clamp(metrics.pressure + pressureDelta, 0, 100);'''
)

replace_all('index.html', [
    ('V2.0 离线正式版', 'V2.18 离线正式版'),
    ('离线正式版 V2.0', '离线正式版 V2.18'),
    ('v=217', 'v=218'),
])
replace_all('manifest.json', [
    ('V2.0', 'V2.18'),
    ('v=217', 'v=218'),
])
replace_all('sw.js', [
    ('direct-v217', 'direct-v218'),
    ('v=217', 'v=218'),
])
replace_all('README.md', [
    ('# 心动训练营 V2.0', '# 心动训练营 V2.18'),
    ('- 当前版本：V2.0', '- 当前版本：V2.18'),
])
replace_once('app/app/build.gradle', "        versionCode 204\n        versionName '2.0.4'", "        versionCode 218\n        versionName '2.1.8'")
replace_once('app/app/src/main/java/com/bianzhifeng/hearttraining/ArchiveInstaller.java', 'new File(context.getFilesDir(), "site-v2-0-4")', 'new File(context.getFilesDir(), "site-v2-1-8")')
replace_once(
    '.github/workflows/android.yml',
    '      - "app/**"\n      - ".bootstrap/**"',
    '      - "app/**"\n      - "webdata/**"\n      - ".bootstrap/**"'
)
replace_once(
    '.github/workflows/verify.yml',
    "          grep -q '心动训练营 V2.0' index.html",
    "          grep -q 'V2.18 离线正式版' index.html\n          grep -q 'app.js?v=218' index.html"
)

print('V2.18 source patch applied')
