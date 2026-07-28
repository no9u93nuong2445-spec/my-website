from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Patch marker not found in {path}: {old[:100]}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


cold_replacements = {
    '      cold: ["这个我不太知道怎么接。", "你可以不用一下问这么多。", "先聊点轻松的吧。"],':
    '      cold: ["这句有点突然，不过没关系，我们先聊一个简单的。", "一次说一个点会更好接。你周末一般喜欢出门还是宅着？", "我们可以换个轻松的话题。你最近有没有吃到值得再去的店？"],',
    '      cold: ["我不知道怎么回答这么多问题。", "这个有点突然。", "我们可以慢一点聊。"],':
    '      cold: ["问题有点多，我们可以一次聊一个。", "这个有点突然，不过可以慢一点。你平时更常听歌还是看电影？", "我们先从简单的聊吧。你周末一般会怎么放松？"],',
    '      cold: ["问题有点密，我没时间逐个回答。", "先说一个重点吧。", "这个话题和刚才有点脱节。"],':
    '      cold: ["问题有点密，我先回答一个重点。", "先说一个最想聊的点吧，我会比较好接。", "这个话题转得有点快。你可以先说说为什么会想到它。"],',
    '      cold: ["这个梗有点硬。", "你不用一直证明自己很会聊。", "先正常说话就行。"],':
    '      cold: ["这个梗有点硬，不过我们还能继续。你最近遇到过什么真好笑的事？", "不用一直证明自己会聊，正常说说你今天发生的事就行。", "我们换个自然点的话题。你最近在追什么剧？"],',
    '      cold: ["说法有点绕，直接表达重点就好。", "我不喜欢用试探代替沟通。", "承诺很多，但我更看重能不能做到。"],':
    '      cold: ["说法有点绕，直接说你最想表达的重点就好。", "我不喜欢用试探代替沟通。你可以直接说自己的真实想法。", "承诺先不用太多，我们可以从最近真实发生的一件事聊起。"],',
    '      cold: ["你又在猜我是不是喜欢你。", "不用从每个细节里找暧昧信号。", "我不想反复解释同一个边界。"],':
    '      cold: ["不用从每个细节里猜感情，我们可以正常聊近况。", "我已经说过是普通朋友，不过日常话题还是可以聊。", "关系边界不变。你可以说说最近工作或生活里的事。"],'
}
app01 = Path('fragments/app-01.txt')
text01 = app01.read_text(encoding='utf-8')
for old, new in cold_replacements.items():
    if new not in text01:
        if old not in text01:
            raise SystemExit(f'Cold pool marker missing: {old[:70]}')
        text01 = text01.replace(old, new, 1)
app01.write_text(text01, encoding='utf-8')

support = r'''

  // V2.1 对话续接知识库：低分不等于立即堵死聊天。
  // 只有催促、冒犯、性暗示或明确越界时，角色才会优先结束或强调边界。
  const CONVERSATION_SUPPORT = {
    linxia: {
      profile: [
        "你说头像那张吗？是我之前出去玩时拍的，不是西湖。我挺喜欢有水的地方。你平时会去湖边散步吗？",
        "那张照片是旅行时随手拍的。景色确实挺舒服的。你平时更喜欢拍人还是拍风景？"
      ],
      restart: [
        "那我先抛一个简单的：你周末更喜欢出去探店，还是在家睡到自然醒？",
        "不用想太复杂的话题。你最近有没有吃到一家值得再去的店？",
        "可以聊点日常的。你今天下班以后最想做什么？"
      ],
      lowScore: [
        "这句有点突然，不过没关系。你可以先说说自己平时周末怎么过。",
        "我们先聊一个点就好。你更喜欢热闹的地方，还是安静的小店？",
        "可以慢一点。你先分享一件最近让你觉得挺开心的事吧。"
      ]
    },
    suyan: {
      profile: [
        "你说头像那张吗？是以前散步时拍的，不是西湖。我比较喜欢安静、有水的地方。你也会拍风景吗？",
        "那张是我之前出去时拍的。我不太会拍人，所以头像更常用风景。你平时会在意照片的氛围吗？"
      ],
      restart: [
        "我们可以从简单的聊。你平时更常听歌，还是看电影？",
        "不用急着找很特别的话题。你周末一般怎么让自己放松？",
        "那我选一个吧：你最近有没有看完觉得不错的电影？"
      ],
      lowScore: [
        "这个有点突然，不过可以慢一点。你可以先说说自己最近在做什么。",
        "我们一次聊一个点会比较舒服。你平时喜欢安静的活动吗？",
        "不用一直提问，你也可以先分享一点自己的经历。"
      ]
    },
    zhouning: {
      profile: [
        "头像那张是之前短途出行时拍的，不是西湖。我旅行时会拍一点风景。你出门会提前规划吗？",
        "那是以前出去时拍的。景色不错，所以一直没换。你更喜欢城市街道还是自然风景？"
      ],
      restart: [
        "可以聊一个具体点的。你最近工作里最消耗你的是什么？",
        "那我来选：你周末能真正放下工作吗？",
        "从日常开始就行。你下班后一般怎么切换状态？"
      ],
      lowScore: [
        "这句话信息不多。你可以补一个自己的经历，我会更好回应。",
        "一次聊一个重点。你先说说为什么会想到这个问题。",
        "话题可以继续，但最好先给一点背景。"
      ]
    },
    chenke: {
      profile: [
        "你说头像吗？是之前出去玩时拍的，不是西湖。那天光线挺好，我就一直用着了。你会经常换头像吗？",
        "那张是旅行照。我拍照技术一般，主要靠景色救场。你平时更爱拍风景还是拍吃的？"
      ],
      restart: [
        "那我来开一个：你最近看过最离谱但又好笑的东西是什么？",
        "别给自己太大压力，聊日常就行。你最近在追什么剧？",
        "我们玩个简单的二选一：出门吃饭还是在家点外卖？"
      ],
      lowScore: [
        "这句有点硬，不过还能救。你换成一件真实发生的小事试试。",
        "不用努力表演会聊天。你直接说说今天最想吐槽什么。",
        "我们换个自然点的。你最近有没有遇到什么好玩的事？"
      ]
    },
    guqing: {
      profile: [
        "头像是之前出行时拍的，不是西湖。我比较喜欢画面干净的风景。你看照片更在意构图还是氛围？",
        "那张照片用了挺久，因为整体感觉比较舒服。你平时会专门拍风景吗？"
      ],
      restart: [
        "可以从真实近况开始。你最近最想改善的一件事是什么？",
        "那我选一个具体话题：你怎样安排工作和休息？",
        "不用寻找完美话题。说说你最近做过的一个决定就好。"
      ],
      lowScore: [
        "表达可以更直接一点。你先说清楚自己最想聊的一个点。",
        "这句话背景不够。补一句你的真实经历，会更容易继续。",
        "我们可以继续，但一次只保留一个重点。"
      ]
    },
    xuyue: {
      profile: [
        "头像是以前和朋友出去时拍的，不是西湖。普通风景照而已。你也喜欢拍旅行照片吗？",
        "那张照片用了挺久。日常话题可以聊，不过还是按普通朋友的边界来。你最近有出去玩吗？"
      ],
      restart: [
        "普通朋友的话题都可以。你最近工作还顺利吗？",
        "可以聊日常。你周末一般和朋友聚餐，还是自己安排？",
        "那就聊一个轻松的：你最近看了什么剧？"
      ],
      lowScore: [
        "这句不太好展开，不过日常话题还是可以聊。",
        "不用猜关系信号。你可以直接说说最近的生活。",
        "我们一次聊一个普通话题就好。"
      ]
    }
  };
'''
app02 = Path('fragments/app-02.txt')
text02 = app02.read_text(encoding='utf-8')
if 'const CONVERSATION_SUPPORT = {' not in text02:
    marker = '\n\n  const FREE_PRACTICE_OPTIONS = {'
    if marker not in text02:
        raise SystemExit('Support insertion marker missing')
    app02.write_text(text02.replace(marker, support + marker, 1), encoding='utf-8')

replace_once('fragments/app-13.txt',
'''      scorekeeping: contains([/我为你.*这么多/, /我都.*帮你/, /花了.*钱/, /你欠我/, /至少给我.*机会/, /付出这么多/, /凭什么不.*回报/])
    };''',
'''      scorekeeping: contains([/我为你.*这么多/, /我都.*帮你/, /花了.*钱/, /你欠我/, /至少给我.*机会/, /付出这么多/, /凭什么不.*回报/]),
      conversationRepair: contains([/你想聊什么/, /聊点什么/, /聊什么好/, /不知道聊什么/, /不知道怎么聊/, /不知道怎么接/, /怎么接/, /换个话题/, /你来选/, /你想说什么/, /聊点轻松/]),
      profileReference: contains([/头像/, /照片/, /相片/, /主页/, /资料(里|上)?/, /背景图/, /风景照/, /拍的/, /西湖/, /景色/])
    };''')
replace_once('fragments/app-13.txt',
'    const relevant = topicMatch.matched || acknowledges || flags.empathy || flags.ending || flags.respectRejection || flags.invite || (questionCount > 0 && refersToLastMessage(normalized));',
'    const profileStarter = flags.profileReference && currentSession.level.chapter <= 2;\n    const relevant = topicMatch.matched || acknowledges || flags.empathy || flags.ending || flags.respectRejection || flags.invite || flags.conversationRepair || profileStarter || (questionCount > 0 && refersToLastMessage(normalized));')
replace_once('fragments/app-13.txt',
'''    if (flags.share) {
      score += 8 + Math.max(0, Math.min(3, currentSession.char.weights.share || 0));''',
'''    if (flags.profileReference) {
      score += profileStarter ? 10 : 5;
      strengths.push("从她的资料或照片找到了具体入口，比通用问候更自然。");
      addIntent("资料切入");
    }
    if (flags.conversationRepair) {
      score += 5;
      strengths.push("愿意主动调整话题，没有靠连续追问硬撑聊天。");
      addIntent("重新找话题");
    }
    if (flags.share) {
      score += 8 + Math.max(0, Math.min(3, currentSession.char.weights.share || 0));''')
replace_once('fragments/app-13.txt', 'if (questionCount > 0 && previousQuestions >= 2 && !flags.share) {', 'if (questionCount > 0 && previousQuestions >= 2 && !flags.share && !flags.conversationRepair && !profileStarter) {')
replace_once('fragments/app-13.txt', 'if (questionCount > 0 && !flags.share && !flags.empathy && !flags.genericOpener) {', 'if (questionCount > 0 && !flags.share && !flags.empathy && !flags.genericOpener && !flags.conversationRepair && !profileStarter) {')
replace_once('fragments/app-13.txt', 'if (topicJump) {', 'if (topicJump && !flags.conversationRepair && !profileStarter) {')
replace_once('fragments/app-14.txt', 'if (!relevant && !flags.share && !flags.ending && !flags.respectRejection && !flags.greeting && !flags.genericOpener && !flags.coldReply) {', 'if (!relevant && !flags.share && !flags.ending && !flags.respectRejection && !flags.greeting && !flags.genericOpener && !flags.coldReply && !flags.conversationRepair && !flags.profileReference) {')
replace_once('fragments/app-14.txt', '''    const dialogue = CHARACTER_DIALOGUE[currentSession.char.id];
    const memory = currentSession.memory;''', '''    const dialogue = CHARACTER_DIALOGUE[currentSession.char.id];
    const support = CONVERSATION_SUPPORT[currentSession.char.id] || CONVERSATION_SUPPORT.linxia;
    const memory = currentSession.memory;''')
replace_once('fragments/app-14.txt', 'const highPressure = currentSession.metrics.pressure >= 72 || flags.insult || flags.sexual;', 'const highPressure = currentSession.metrics.pressure >= 72 || flags.pressure || flags.insult || flags.sexual;')
replace_once('fragments/app-14.txt', '''    } else if (flags.respectRejection || flags.acceptUncertainty) {
      pool = levelReplies?.positive || dialogue.warm;
      key = "respect-space";
      reason = "你没有继续施压，她更容易保持正常交流。";
    } else if (analysis.score < 45 || analysis.questionCount >= 3) {
      pool = levelReplies?.negative || dialogue.cold;
      key = "cold";
      reason = analysis.questionCount >= 3 ? "连续问题让她不知道先回答哪一个。" : "这句话与前文连接较弱或信息量不足，她难以自然展开。";
    } else if (levelReplies) {''', '''    } else if (flags.respectRejection || flags.acceptUncertainty) {
      pool = levelReplies?.positive || dialogue.warm;
      key = "respect-space";
      reason = "你没有继续施压，她更容易保持正常交流。";
    } else if (flags.profileReference) {
      pool = support.profile;
      key = "profile-support";
      reason = "你从她的资料或照片切入，她会先回答这个具体点，再留一个容易继续的话题。";
    } else if (flags.conversationRepair) {
      pool = support.restart;
      key = "conversation-restart";
      reason = "你在尝试重新找话题，她会主动提供一个清楚的聊天入口，而不是机械回复“不知道怎么接”。";
    } else if (analysis.score < 45 || analysis.questionCount >= 3) {
      if (topic && dialogue.topicAnswers[topic] && !flags.pressure) {
        const answer = pickUnique(dialogue.topicAnswers[topic], currentSession, `support-${topic}-answer`);
        const followPool = dialogue.followUps[topic] || support.restart;
        const follow = pickUnique(followPool, currentSession, `support-${topic}-follow`);
        const text = joinResponse(answer, follow, currentSession.char.id);
        memory.lastReaction = stateLabel;
        return {
          text,
          reason: analysis.questionCount >= 3
            ? "问题有些密，但她会先接住其中一个具体话题，并给你一个可继续的方向。"
            : "表达还不够自然，但内容里有明确话题，她会先回应内容，而不是把聊天直接堵死。",
          state: stateLabel,
          topic
        };
      }
      pool = (memory.negativeStreak || 0) >= 2 ? support.restart : support.lowScore;
      key = (memory.negativeStreak || 0) >= 2 ? "low-score-restart" : "low-score-support";
      reason = analysis.questionCount >= 3
        ? "连续问题较多，她会提醒你一次聊一个，同时主动留下一个可回答的入口。"
        : "这句话质量不高，但没有越界。她会适度配合训练，给出一个新的聊天抓手。";
    } else if (levelReplies) {''')
replace_once('fragments/app-15.txt', '''    } else {
      pool = currentSession.level.replies?.negative || dialogue.cold;
      key = "negative";
      reason = "表达存在明显问题，她的回复会变短或提醒你调整节奏。";
    }''', '''    } else {
      pool = support.lowScore || currentSession.level.replies?.negative || dialogue.cold;
      key = "negative-support";
      reason = "表达存在问题，但没有越界。她会指出节奏问题，同时保留一个继续交流的入口。";
    }''')
replace_once('fragments/app-16.txt', '''      CHARACTER_DIALOGUE,
      LEVELS,''', '''      CHARACTER_DIALOGUE,
      CONVERSATION_SUPPORT,
      LEVELS,''')

test_path = Path('tests/dialogue.test.js')
test_text = test_path.read_text(encoding='utf-8')
if '照片开场被识别为有效资料切入' not in test_text:
    tests = r'''

test("照片开场被识别为有效资料切入", () => {
  const session = make(1, "linxia");
  const { analysis, response } = runTurn(session, "看你照片是在西湖的吗 挺好看的啊");
  return analysis.flags.profileReference && analysis.relevant && analysis.score >= 60 && /头像|照片|旅行|西湖|风景|湖边|景色/.test(response.text) && /[？?]/.test(response.text) && !/不知道怎么接/.test(response.text);
});

test("询问想聊什么时角色会主动给入口", () => {
  const session = make(1, "linxia");
  const { analysis, response } = runTurn(session, "你想聊什么啊");
  return analysis.flags.conversationRepair && analysis.score >= 55 && /[？?]/.test(response.text) && /周末|探店|店|今天|下班|最近/.test(response.text) && !/不知道怎么接/.test(response.text);
});

test("连续救场不会循环同一句死回复", () => {
  const session = make(1, "linxia");
  const inputs = ["为什么不知道怎么接啊", "看你照片是在西湖的吗 挺好看的啊", "你想聊什么啊", "怎么一直提示不知道怎么接啊"];
  const replies = inputs.map(text => runTurn(session, text).response.text);
  return replies.every(text => !/不知道怎么接/.test(text)) && new Set(replies).size === replies.length && replies.every(text => /[？?]/.test(text));
});

test("普通低分表达仍获得一个可继续话题", () => {
  const session = make(1, "linxia");
  const { response } = runTurn(session, "随便聊聊");
  return !/不知道怎么接/.test(response.text) && /[？?]/.test(response.text);
});

test("真正催促和越界仍然触发边界而非迎合", () => {
  const session = make(11, "zhouning");
  const { analysis, response } = runTurn(session, "怎么这么久才回我，你必须马上回消息");
  return analysis.flags.pressure && /催|工作|压力|时间|手机|暂停|不适合/.test(response.text);
});

test("六名角色都有续接知识库", () => {
  return Object.keys(engine.CHARACTERS).every(id => {
    const item = engine.CONVERSATION_SUPPORT[id];
    return item && item.profile.length >= 2 && item.restart.length >= 3 && item.lowScore.length >= 3;
  });
});
'''
    marker = '\nlet failed = 0;'
    if marker not in test_text:
        raise SystemExit('Dialogue test insertion marker missing')
    test_path.write_text(test_text.replace(marker, tests + marker, 1), encoding='utf-8')

for name in ['index.html', 'manifest.json', 'sw.js']:
    p = Path(name)
    text = p.read_text(encoding='utf-8')
    text = text.replace('direct-v216', 'direct-v217').replace('v=216', 'v=217').replace('?v=216', '?v=217')
    p.write_text(text, encoding='utf-8')

print('V2.17 patch applied')
