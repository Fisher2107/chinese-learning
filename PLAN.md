# 中国通 · Plan

**Status:** final plan, v1 · 21 Nov 2026

**Contents:** 1 The loop · 2 Game design · 3 Signature series · 4 What you read · 5 App layout · 6 Design system · 7 Exploring · 8 Reading · 9 Saving · 10 Poems · 11 AI tutor · 12 Flashcards & notes · 13 Progress · 14 The map · 15 The timeline · 16 How it's built · 17 Daily updater · 18 Build phases · 19 Decisions

A reading game for exploring China's geography, history and poetry, **entirely in Chinese**. You wander the map, read long Du Chinese-style stories written for your level, open up the real sources behind them when you want, save what you want to keep, and an AI tutor makes you recall it later. The goal is to hold real conversations with Chinese people about where they're from, the stories they grew up with, and the idioms and poems they quote.

**Three rules:**
- **Everything is Chinese**: stories, menus, buttons, flashcards and the tutor.
- **Every word can be tapped**: its meaning, pinyin and sound; ⭐ add it to your flashcards (with its sentence); or 💬 ask the AI about it.
- **Pitched at HSK 5.** The main stories are written at your level, about what's worth knowing for conversation. Real sources (classic texts, Wikipedia) appear as short sections inside them, and you tap a section to open the full document.

---

## 1. The loop

```
探索 explore  →  阅读 read  →  收藏 save  →  回忆 recall  →  (back to exploring)
 map, timeline,   stories at      words, idioms,   flashcards +
 poems, wiki      your level +    facts, stories,  AI tutor
                  real sources    poems
```

- **Everything is open from day one.** Nothing is locked and there's no fixed order.
- **Nothing is tested unless you've read it or saved it.**
- **Suggestions are optional.** "随便逛逛" (random wander) and the tutor's "you might like…" are there when you don't know where to go next.

---

## 2. Why you'll keep coming back

The app borrows its hooks from three kinds of things people can't put down: short-video feeds, Chinese micro-dramas, and Stardew Valley. Every hook is tied to a learning action, so time spent hooked is time spent learning.

### From Reels and 抖音: the 刷一刷 feed
- **A vertical feed of short cards.** Each card is a 60–90 second read (150–300 characters) with a photo or a map, about one surprising thing: a 冷知识, a meme, an idiom's origin, a trending story. Swipe up for the next one.
- **A hook in the first line.** Every card opens with a question you need answered: "为什么一个城市最有名的景点是超市？" · "为什么现在年轻人不爱喝白酒了？" · "一碗面，零元？"
- **An open loop at the end.** Cards end on a question that leads into a longer series. Tap 继续看 to go deeper, or keep swiping.
- **You never know what's next.** A story, a meme, a 你猜, a poem line, a message from a friend. Reviews are mixed in as cards too (finish this line of 静夜思; which province is 皖?).
- **It learns what you like.** The feed notices what you linger on and save, and serves more of it.

### From 短剧 (Chinese micro-dramas): stories as episodes
- **Episodes, not chapters.** Long stories come as 第1集, 第2集… of 300–600 characters (2–4 minutes each). Every episode turns on a twist (反转) and ends on a cliffhanger (卡点): "萧何对韩信说：'大家都进宫庆贺，你也来吧。'韩信……"
- **爽点 payoffs.** Stories are picked and told for satisfying turns: 韩信 rising from 胯下之辱 to 大将军; a supermarket compensating an employee a customer hit.
- **The "paywall" is a recall.** Micro-dramas stop you at the cliffhanger and ask you to pay. Here, the next episode unlocks when you recall 3 words or facts from the last one. It takes about 30 seconds, and that's exactly the moment that makes them stick.
- **追剧 (following a series).** Series you follow get 更新 badges, and something new comes out every day.

### From Stardew Valley: a cozy world that grows
- **A daily rhythm.** A short morning routine (今日复习, the app's version of watering crops, about 5 minutes), then free time to explore, then a day summary of what grew.
- **A 生词 garden.** Saved words are seeds. Reviews water them, and remembered words grow into plants and then fruit trees. Nothing dies if you miss a day: plants just wait.
- **The Chinese calendar is the seasons.** The 24 节气 change every ~15 days and bring seasonal content (冬至: 饺子 or 汤圆? the classic north–south argument). Real festivals become events: 中秋 opens moon poems and 嫦娥, 端午 opens 屈原 and the 雄黄酒 scene of 白蛇传, 春节 opens hometown customs.
- **Friends with hearts.** A small cast of characters from different provinces (a 成都 student, a 许昌 guy who won't stop talking about 胖东来, a 杭州 grandmother…) message you WeChat-style. The more you learn about their hometown, the more hearts you earn and the more they open up. They're played by the AI tutor, so this is where role-play lives.
- **Collections.** 集章 passport stamps for every city (stamp collecting at tourist sites is a real trend in China), a 美食图鉴 of foods from every province, the 成语图鉴, the 诗词本.
- **Bundles.** Like Stardew's community center: complete a set (江南 = 杭州 + 苏州 + 绍兴 stories + 3 江南 poems) to unlock something: a new friend, a map skin, a new series.

### Keeping it on your side
- Every hook pays out in learning: unlocks cost a recall, the feed mixes in reviews, and friends only open up when you know their hometown.
- Streaks have a grace day, and push notifications are opt-in per series ("你追的《胖东来》更新了").

---

## 3. Signature series: 来我家乡，必须做的一件事

The format comes from street-interview reels like ur.chinese.unc's "What do I have to do when I visit your hometown?": ask a local the one thing you must do in their hometown, then follow the surprising answer.

**One city = one short series of 4–6 episodes:**

| 集 | Beat | Example: 许昌 |
|---|---|---|
| 1 | **钩子 The ask**: a local's answer that makes no sense yet | "来许昌必须做的一件事？""去逛超市。" 超市？ |
| 2 | **揭晓 The reveal**: what it is, and where the city is | 胖东来, the supermarket people travel to 许昌 for. 许昌 itself was 曹操's capital, 许都 |
| 3 | **深挖 Why it's special** | Its staff: 10 days of 不开心假 ("unhappy leave"), stores closed on Tuesdays, pay well above the local average, profit-sharing, and hiring former prisoners. Its goods: strict limits on pesticide residue and produce traced back to the farm, standards that push its suppliers to raise their own quality |
| 4 | **故事 The story everyone tells** | An employee is hit while removing an abusive customer. 胖东来 publishes compensation standards for violations of staff dignity, and pays out |
| 5 | **新闻 In the news** | It's brought in to remodel 永辉 supermarkets (调改); a hygiene scandal at a food stall in its 新乡 store, and how it handled it |
| 6 | **反转 The twist** | 2026: a well-known consumer activist claims its eggs fail a standard. 胖东来 sends eggs from the brands it sells to three independent labs and publishes about 150 reports. Then the bigger question: can the 胖东来 model be copied? |
| 读后 | **What to keep** | Words like 委屈, 调改, 打卡, 良心企业, 内卷; a 聊天工具包 ("你去过胖东来吗？听说他们有'不开心假'，真的假的？"); 🎬 the reel that started it; 🔗 news links |

**Where episodes come from:**
- **Street-interview reels** like the channels below. The question and the answer give the topic. The episode is written fresh from public sources (news, Wikipedia, official sites) and links back to the reel.
- **小红书 and 抖音 "家乡必去" posts**, used the same way.
- **Your own friends.** Ask a Chinese friend "来你家乡，我必须做的一件事是什么？", type in their answer, and the AI researches and drafts a new series (marked AI 草稿). The real conversation becomes an episode, and the episode gives you something to talk about next time.

**Channels looked at so far** (a quick look, not a full survey; the daily updater adds more):

| Channel | What it does |
|---|---|
| ur.chinese.unc (Ur Chinese Unc, ~358k followers) | China culture and trending stories explained in English, including the "what do I have to do in your hometown?" street interviews and the 许昌 supermarket reel |
| pengpengxiaohui | Chinese-language street challenges about regional stereotypes (街头趣味挑战，对路人的一些刻板印象), good material for 聊天工具包 |
| joemi.in.chengdu | A young 成都 local interviewing visitors about the city |
| chinesezerotohero | Street interviews made for Mandarin learners |

ur.chinese.unc's other topics show what makes a good feed hook: a zero-yuan noodle shop, a wedding thousands of strangers turned up to, why people are skipping mooncakes and 白酒.

**最后一问 · The last question.** Before any series, city or province is called finished, ask: *what else would make a great conversation with someone from here?* A food fight with the next province, a dialect word everyone uses, a famous local, a meme, a rivalry, something locals are quietly proud of. Whatever comes up goes into a **聊天彩蛋** (conversation easter eggs) list on the series' 读后 and on the province page.

---

## 4. What you read

Pages are built in layers. The real material is all there, but it isn't the wall of text you start with:

| Layer | What it is | Label |
|---|---|---|
| **讲解** the main story | Long, Du Chinese-style stories written at HSK 5 about what's interesting and useful in conversation: the story, the people, the idioms, what locals are proud of. Written for the app with AI help and checked against the sources it cites | ✍️ 讲解 |
| **原文片段** real excerpts | Short sections from real texts, placed where they fit in the story: a paragraph of 冯梦龙's 白蛇传, the opening of 鲁迅's essay, one section of a Wikipedia article. Tap **阅读全文** to open the full document | 📖 原文 · 🌐 维基 |
| **全文** full documents | The complete texts, in the long-text reader. Public-domain texts and Chinese Wikipedia (CC BY-SA, credited) | 📖 · 🌐 |
| **我的导入** your imports | Anything you paste in: articles, 百度百科, 知乎 answers, 百家讲坛 transcripts, graded stories. Kept on **your device only** | 📥 |
| **AI 回答** AI answers | When you ask about a word or sentence, and the tutor | 🤖 |
| **视频** videos | Reels, 抖音 and 小红书 posts that inspired an episode | 🎬 看原视频 (a link) |

**Videos and social posts are inspiration, never copied.** Browsing Instagram, 抖音 and 小红书 for ideas is fine, the way you'd scroll yourself, and the daily updater does it through your account (§17). What comes back is only the interesting part: a city, the surprising answer, the facts worth checking. That gets researched from public sources and written fresh in our own words, with a 🎬 link to the original. Videos, captions and transcripts are never copied word for word, and people interviewed on the street aren't named or quoted, because they're private individuals.

**Why imports stay on your device:** this repo is public, so anything committed to it is republished to the world. Copyrighted stories (Du Chinese's included, plus news sites and 百度百科) can't go in it. Pasting them into your own copy of the app is personal reading, the way tools like LingQ and Readlang work. You still get tap-to-translate, saving and the tutor on everything you import.

**What counts as public domain** (checked before any text is committed): classical and pre-modern texts; modern works published in 1930 or earlier; and works by writers who died in 1945 or earlier (鲁迅, 萧红, 郁达夫…). These are free to share in both China and the US, where GitHub is based.

---

## 5. App layout

### Navigation

Five tabs along the bottom, like Duolingo, labelled in Chinese:

| Tab | What's there |
|---|---|
| **今天** | The home screen: today's review, the series you're following, friends' messages, the current 节气 |
| **刷一刷** | The vertical feed |
| **地图** | The map (switch to 时间轴 at the top), province pages, the wiki, search |
| **朋友** | WeChat-style chats with your friends |
| **我的** | Garden, passport stamps, collections, 生词本, 书架, settings |

Reviews start from 今天 rather than having their own tab, the way Duolingo puts practice inside the path.

### Screens

The sketches below are rough. The symbols stand in for icons.

**1 · 今天 (home)**
```
🔥 12    🌱 86    🪙 340                          ⚙
冬至 · 今天吃饺子还是汤圆？                ← 节气 banner
▐  今日复习 · 5 分钟 · 开始  ▌             ← one big primary button
追剧中   [胖东来 3/6 · 更新]   [白蛇传 1/4]   →
💬 小王：你去过胖东来吗？
新的家乡：景德镇 →
──────────────────────────────────────────
 今天     刷一刷     地图     朋友     我的
```
🔥 is your streak, 🌱 the words growing in your garden, and 🪙 铜钱: coins earned from recalls, spent on garden items and map skins.

**2 · Series path** (tap a series)
```
许昌 · 胖东来                         3 / 6
          ● 1 ✓
              ● 2 ✓
          ◉ 3          ← you are here
      🔒 4             ← unlocks with a 30-second recall
          ○ 5
      ○ 6
          🏮 集章       ← passport stamp at the end
```

**3 · Episode reader**
```
✕    ▓▓▓▓▓▓▓░░░░░    第3集 · 深挖
     bù kāixīn jià
胖东来的员工有一种假，叫"不开心假"……
……
▸ 原文片段 · 新华社 · 阅读全文 →
──────────────────────────────────────────
 🔊 朗读      Aa 字号      ☰ 目录
```
Story text is set in a book-like font on cream paper. Pinyin never shows over the text: tap a word and its card shows the pinyin.

**4 · Word card** (a half-height bottom sheet; swipe down to close)
```
委屈   wěiqu   🔊
to feel wronged; a grievance
本句：员工受了委屈，公司会给补偿。
[ ⭐ 加入生词本 ]        [ 💬 问AI ]
相关：委屈奖 · 受委屈          百科 →
```

**5 · Cliffhanger and recall gate**
```
……韩信相信了萧何。他走进了长乐宫——
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 第4集
先回忆一下：「国士无双」是什么意思？
 ( ) 全国最好的士兵
 ( ) 国家里没有第二个这样的人才
 ( ) 一个国家只有一个将军
▐  检查  ▌
```
After you answer, a Duolingo-style banner slides up from the bottom: green with 「对了！」, or red with the right answer. Then 继续.

**6 · Episode complete**
```
🎉 第3集 看完了！
[ +4 生词 ]   [ +20 🪙 ]   [ 🔥 13 天 ]
明天更新：第4集 · 故事
▐  继续  ▌
```

**7 · 刷一刷** (full screen; swipe up for the next card)
```
[ photo ]
为什么一个城市最有名的景点是超市？                ⭐ 收藏
许昌人说，来许昌一定要去……（150–300 字）          💬 问AI
                                                ▶ 看系列
                                                ↗ 原视频
```

**8 · 地图**
```
[ 地图 | 时间轴 ]                                🔍
[ map of China: explored provinces glow; pins for series and stories ]
─────── drag-up sheet ───────
河南 · 豫 · 省会 郑州                     点亮 40%
必做：许昌 · 胖东来 →     故事 3     诗词 1
```

**9 · Province page**
A header photo, then chips for 简称 · 省会 · 邻省, then sections in this order: 必做的一件事 (its series) · 故事 · 诗词 · 人物 · 美食 · 聊天工具包 · 今天的河南 · 维基.

**10 · 朋友**
```
小王 · 许昌     ♥♥♥♡♡     你去过胖东来吗？
阿婆 · 杭州     ♥♡♡♡♡     断桥你走过没有？
```
Chats use WeChat-style bubbles, and every word is tappable. Friends also post 朋友圈-style updates about their hometowns.

**11 · 我的**
```
🌱 生词园      🏮 集章册      📖 书架
成语图鉴 · 美食图鉴 · 诗词本 · 生词本
本周：读了 4,200 字 · 回忆 86 次 · 🔥 13
设置：OpenAI 密钥 · 通知 · 备份
```

**12 · Reviews and poems**
These use Duolingo's exercise layout: a progress bar on top, one question per screen, a big 检查 button and the green/red feedback banner. Exercise types: choose the meaning, type the word, 接下句, tap the province on the map, put events in order, and the poem method's fading-hint recitation.

---

## 6. Design system

**Start from proven patterns, the way a Framer site starts from a template.** Every screen copies a layout people already know, and components come from established libraries instead of being invented:

| Screen | Borrowed from | What we take |
|---|---|---|
| 今天 | Duolingo home | Stats along the top, one big primary action |
| Series path | Duolingo's learning path | Winding nodes, locked nodes, a reward at the end |
| Reader, word card | Du Chinese, Apple Books | Tappable text, pinyin toggle, half-height bottom sheet |
| Recall gate, reviews | Duolingo exercises | One question per screen, 检查 button, green/red feedback banner |
| Episode complete | Duolingo lesson complete | Celebration animation, stat tiles |
| 刷一刷 | Instagram Reels, 抖音 | Full-screen vertical snap, action rail on the right |
| 地图 | Apple Maps | Map with a draggable bottom sheet |
| 朋友 | WeChat | Chat list, bubbles, 朋友圈 |
| Garden, calendar | Stardew Valley | Tile garden, seasonal colours, festival banners |
| 我的 | Duolingo profile | Stat tiles, collection grids |

**Look and feel (Duolingo-like):**
- Bright, flat colours on white; thick rounded shapes (16px corners); big tap targets.
- **Chunky buttons**: solid colour with a darker 4px bottom edge that presses down when tapped.
- One main action per screen, big type, generous spacing.
- Instant feedback: springy taps, a bottom banner for right/wrong, small celebrations.

**Colours from 中国传统色 (traditional Chinese colours)**, so it doesn't look like every other app:

| Role | Colour | Hex (starting point) |
|---|---|---|
| Primary buttons, streak | 朱红 vermilion | `#ED5126` |
| Correct, progress | 铜绿 verdigris | `#2BAE85` |
| Coins, rewards | 藤黄 gamboge | `#FFD111` |
| Accents, map water | 黛蓝 indigo | `#425066` |
| Reading background | 乳白 cream | `#F9F4DC` |
| Text | 墨 ink | `#2B2B2B` |

A dark mode uses the same palette.

**Type:**
- **Interface**: the phone's own Chinese font (PingFang SC on iPhone) in bold weights, with Nunito for Latin letters and numbers. Nunito is rounded and close to Duolingo's feel.
- **Story text**: 霞鹜文楷 (LXGW WenKai), an open-source font that reads like a printed book. It's trimmed to the characters actually used, so it loads fast.

**Icons, images and animation:**
- **Icons**: Phosphor, fill style. No emoji in the actual interface.
- **Images**: real photos from Wikimedia Commons and Unsplash, credited. No AI-generated images.
- **Animation**: Motion (Framer's animation library, formerly Framer Motion) for taps, sheets and page transitions, and ready-made Lottie animations for celebrations.
- **Components**: Radix primitives for dialogs and tabs, and Vaul for bottom sheets, styled with the tokens above.

**What to avoid** (the "AI-generated" look): purple-blue gradients, frosted glass, emoji used as icons, gradient text, generic stock hero images, everything centred, everything in Inter.

---

## 7. Exploring

### 🗺️ 地图 Map (the home screen)
- A full map of China. Tap a province to open its page; zoom in to see cities and pins: 📖 texts, 🧑 people, ⚔️ events, 📜 poems, 🐍 legends.
- **Province page**: 简称, 省会, neighbours, a 讲解 introduction written for you (with sections of its Wikipedia article you can open), every story / person / poem pinned there, a conversation kit, and "今天的X省" (food, dialect, memes, stereotypes).
- **The map fills in as you explore.** A province gets brighter the more you've read and saved there.

### 📜 历史 Timeline
A scrollable timeline built on the **朝代歌** (夏商与西周，东周分两段……), the rhyme every Chinese kid memorises. Tap an era to see its events, people, idioms and texts. Every event is also pinned on the map.

### 🖌️ 诗词 Poems
A poem shelf plus a method built for remembering poems word for word (§10). Poems are pinned where they were written: 早发白帝城 at 奉节, 枫桥夜泊 at 苏州.

### 📚 百科 Wiki
Every place, person, event, idiom, legend, poem, text and dynasty has a page, with typed links (出生于, 发生在, 出自, 写于…), backlinks, your notes, and search by 汉字, pinyin or English. You can keep following links: 韩信 → 兔死狗烹 → 勾践 → 卧薪尝胆 → 绍兴 → 鲁迅 → 雷峰塔 → 白蛇传 → 杭州…

---

## 8. Reading

### Every word opens a card

Tap any word anywhere (in a story, an excerpt, a button, a flashcard or an AI answer) to open its card:

- **汉字, pinyin, 🔊**, and the meaning (English from the dictionary, or 中文解释 on request)
- **⭐ 加入生词本**: saves it as a flashcard, together with the sentence it was in
- **💬 问AI**: opens a short chat about this word *in this sentence*. Quick buttons: 这里是什么意思？ · 怎么用？给我几个例句 · 和……有什么区别？ · 有没有相关的成语？ You can also type your own question. The AI's replies are tappable too, so you can save words straight from them.
- **📖 百科**: jumps to the word's page if it's a person, place, idiom or event

Select a whole sentence to get the same idea for the sentence: **解释** (simpler Chinese), **翻译** (English) and **💬 问AI**. Answers are saved on your device, so asking about the same thing again is free.

The interface is Chinese too (首页, 地图, 复习, 生词本, 设置…), and every menu label and button can be tapped like any other word.

### Long stories

- **Split into sittings.** Long stories and texts are cut into parts of about 1,500–2,500 characters, so one chapter of 西游记 becomes 4–5 sittings. A progress bar shows where you are, and you resume where you stopped.
- **Difficulty before you start**: how many words are above HSK 5, how many you haven't met yet, and an estimated reading time.
- **Pinyin** appears only on words above HSK 5 that you haven't marked as known. One tap marks a word as known everywhere.
- **Help with older Chinese.** Excerpts and full texts in Ming–Qing vernacular or 文言 get notes on old usages (道 = 说, 曰 = 说, …).
- **Listen** sentence by sentence.

### How a story page looks

A long 讲解 story told in parts, with real excerpts dropped in where they belong. Each excerpt opens into the full document.

**Example: 杭州 · 白蛇传**

> **白蛇传：一把伞，一座塔，一千年** · ✍️ 讲解 · 4 集 · about 6,000 characters · 难度：HSK 5
>
> **第1集 · 西湖借伞**
> ✍️ The rainy day at 西湖 when 许宣 lends his umbrella to a woman in white, told at HSK 5 with dialogue and 🤔 你猜 moments.
> ▸ 📖 **原文片段 · 冯梦龙《白娘子永镇雷峰塔》**(1624): the umbrella passage, about 300 characters of Ming vernacular with notes · **阅读全文 →**
>
> **第2集 · 法海**
> ✍️ The monk who is sure she's a demon, and the choice 许宣 has to make.
>
> **第3集 · 故事是怎么变的**
> ✍️ How the white snake went from monster to heroine over the centuries, and how 许宣 became the 许仙 everyone knows today.
> ▸ 🌐 **维基百科《白蛇传》**: the section on how the story changed · **阅读全文 →**
>
> **第4集 · 雷峰塔倒了**
> ✍️ 1924: the real tower collapses, and 鲁迅 celebrates.
> ▸ 📖 **原文片段 · 鲁迅《论雷峰塔的倒掉》**: the opening paragraphs · **阅读全文 →**
>
> **读后**: the idioms and phrases to keep; 法海 as a modern meme (《法海你不懂爱》); how 断桥 comes up when people talk about 杭州; what the story says about love versus the rules.
>
> **📥 Your imports** on 白蛇传 show up at the bottom of the page.

### Full texts behind the stories

These are the real texts the first 讲解 stories draw on. Each one appears as excerpts inside a story and as a full document you can read whenever you want. Difficulty is my rough estimate; the app measures it properly once a text is in.

| Place | Text | Type | Difficulty |
|---|---|---|---|
| 杭州 | 冯梦龙《白娘子永镇雷峰塔》 | Ming vernacular story | ★★★★ |
| 杭州 | 鲁迅《论雷峰塔的倒掉》 | essay, short | ★★★ |
| 绍兴 | 鲁迅《故乡》 | short story | ★★★ |
| 绍兴 | 鲁迅《社戏》 | short story | ★★★ |
| 绍兴 | 鲁迅《孔乙己》 (the 咸亨酒店 is still there) | short story | ★★★ |
| 绍兴 | 鲁迅《从百草园到三味书屋》 | memoir essay | ★★★ |
| 南京 | 朱自清《背影》 (浦口 station) | essay, short | ★★★ |
| 南京 | 朱自清《桨声灯影里的秦淮河》 | essay | ★★★★ |
| 北京 | 朱自清《荷塘月色》 (清华园) | essay | ★★★ |
| 北京 | 郁达夫《故都的秋》 | essay | ★★★★ |
| 黑龙江 呼兰 | 萧红《呼兰河传》 | novel, a long read | ★★★ |
| 山东 阳谷 | 《水浒传》第23回 · 武松打虎 | Ming novel | ★★★★ |
| 湖北 赤壁 | 《三国演义》第46回 · 草船借箭 | Ming novel, semi-classical | ★★★★★ |
| 西游 (连云港 / 吐鲁番) | 《西游记》第27回 · 三打白骨精 | Ming novel | ★★★★ |
| 红楼 | 《红楼梦》· 刘姥姥进大观园 | Qing novel | ★★★★★ |
| 青岛 崂山 | 蒲松龄《聊斋志异》· 崂山道士 | classical ghost story, short | ★★★★★ |
| 淮安 | 🌐 韩信 article + 📖 famous lines from 《史记·淮阴侯列传》 (国士无双, 多多益善, 狡兔死，走狗烹) | encyclopedia + 文言 lines | ★★★★ |

**Good things to import yourself** (copyrighted, so device only): 百家讲坛 transcripts (e.g. 王立群读《史记》 for 韩信, 易中天品三国), 知乎 answers about a city, 中国国家地理 articles, and news features about a place you're reading about.

---

## 9. What you can save

| Save a… | What gets stored | How it comes back |
|---|---|---|
| **Word** | word, pinyin, meaning, **the sentence you found it in**, a link back to that spot | flashcard |
| **Idiom / saying** | the idiom, its story, a modern example | flashcard + the tutor's 情景用语 |
| **Fact** (知识点) | e.g. "浙江的简称是浙" | flashcard + the tutor's 说说看 |
| **Whole text** | its key points | the tutor asks you to retell it |
| **Poem** | the poem, line by line | the poem method (§10) |

---

## 10. Poems: how to learn them and keep them

Memorising a whole poem in one go is hard, and it fades fast. The method below is built from well-established memory research: understand it before memorising, learn small chunks and chain them, recall from memory instead of rereading, remove the hints step by step, space out reviews, and practise recall in different ways.

### Stage 1 · 懂 Understand (day 1, about 5 minutes)
- **The story behind it.** 静夜思: 李白 is in his twenties and far from home. The story usually told is that he wrote it in an inn in 扬州, looking at the moonlight.
- **Line by line**: what each line means and what the picture is (moonlight on the floor looks like frost).
- **Key words**: 疑 (to suspect, to think something is), 举头 (raise your head), 故乡 (hometown).
- **Listen and chant** with the rhythm marked: 床前 / 明月光 · 疑是 / 地上霜.
- **Conversation tidbits**: people still argue about what 床 means (a bed, a well's railing, or a folding stool?). The version every child learns isn't the oldest one either: early editions read 床前**看**月光 … 举头望**山**月.

### Stage 2 · 背 Memorise (day 1, about 5 minutes)
Build the poem up a line at a time, fading the hints as you go:

| Level | What you see |
|---|---|
| 0 · read | 床前明月光，疑是地上霜。举头望明月，低头思故乡。 |
| 1 · some hidden | 床前明□光，疑是□上霜。举头□明月，低头□故乡。 |
| 2 · first character only | 床□□□□，疑□□□□。举□□□□，低□□□□。 |
| 3 · nothing | □□□□□，□□□□□。□□□□□，□□□□□。 |

Learn line 1 down to level 3. Then recite lines 1–2 from nothing, then 1–3, then the whole poem. Stop once you've recited it once with no hints at all.

### Stage 3 · 留 Keep (spaced reviews)
- The poem comes back roughly after 1 day, 3 days, 1 week, 3 weeks and 2 months. The scheduler stretches or shortens the gaps based on how you do.
- Every review starts from a blank screen. **Each line is tracked separately**: if you stumble on line 3, only line 3 drops back to hints and gets practised.
- You check yourself by **typing it**, **saying it aloud** (speech recognition), or **revealing it and rating yourself** (fastest).

### Stage 4 · 用 Use it (mostly with the AI tutor)
- **接下句**: the tutor says one line, you say the next. This is how Chinese people actually quiz each other.
- **飞花令**: say any line containing 月 (or 春, 山…) from any poem you know. It's a game from the TV show 中国诗词大会.
- **情景**: "中秋节你在国外，朋友发微信问你想不想家。" → 举头望明月，低头思故乡。
- **谁写的？在哪儿？**: the poet, the dynasty, and where it is on the map.
- **讲给我听**: explain what the poem means in your own words.

Long poems are learned one couplet or verse per day and then chained together.

### Starter poems (pinned on the map)

| Poem | Poet | Where |
|---|---|---|
| 静夜思 | 李白 | 扬州 (traditionally) |
| 春晓 | 孟浩然 | 襄阳, the poet's home |
| 咏鹅 | 骆宾王 | 义乌, written at age 7 |
| 登鹳雀楼 | 王之涣 | 永济 鹳雀楼, 山西 |
| 黄鹤楼送孟浩然之广陵 | 李白 | 武汉 → 扬州 |
| 早发白帝城 | 李白 | 奉节, 重庆 |
| 望庐山瀑布 | 李白 | 庐山, 江西 |
| 枫桥夜泊 | 张继 | 苏州 寒山寺 |
| 回乡偶书 | 贺知章 | 萧山, 杭州 |
| 九月九日忆山东兄弟 | 王维 | 长安 (the "山东" here isn't Shandong province!) |
| 凉州词 | 王翰 | 武威, 甘肃 |
| 春望 | 杜甫 | 长安 |
| 春夜喜雨 | 杜甫 | 成都 |
| 清明 | 杜牧 | 杏花村 (two provinces claim it) |
| 饮湖上初晴后雨 | 苏轼 | 杭州 西湖 |
| 题西林壁 | 苏轼 | 庐山 |
| 水调歌头·明月几时有 | 苏轼 | 密州, 山东 |
| 念奴娇·赤壁怀古 | 苏轼 | 黄州, 湖北 |
| 过零丁洋 | 文天祥 | 珠江口, 广东 |
| 敕勒歌 | 北朝民歌 | 阴山, 内蒙古 |

---

## 11. The AI tutor (AI 老师)

The tutor's job is to make you **pull knowledge out of your head**, which is what makes it stick, using only what you've read and saved, including your imports.

### What it does

**说说看 · Tell me what you know**
> 老师：说说你对浙江了解多少？
> You type or say everything you remember, in Chinese (English is fine when you're stuck).
> 老师：✅ what you got right · 💡 a *hint* for something you missed ("你读过一篇鲁迅的文章，跟一座塔有关……"), with the answer only if you're still stuck · ❌ corrections · then one follow-up question.

**情景用语 · Use it in a situation**
> 老师：你朋友说："我们公司那个产品，一开始靠直播火了，现在也因为直播出了大问题。"用一个你学过的俗语回应他。
> You: 真是成也萧何，败也萧何啊！
> 老师: whether it's the right idiom, whether it sounds natural, and how a native speaker might say it ("成也直播，败也直播").

**复习课 · Daily recap (about 10 minutes)**
A mixed session made from whatever is due: flashcards, a 说说看, a couple of 情景, a 接下句. It's different every day.

**讲故事 · Retell**
"用你自己的话讲讲《故乡》里闰土的变化。" You get feedback on both the content and your Chinese.

**聊天 · Role-play**
Chat with a 绍兴人 or a 成都人. They bring up things from their province, and the tutor nudges you to use what you've saved. You get feedback at the end.

**问AI · Ask about any word or sentence**
Tap 💬 on a word card, or select a sentence and ask "鲁迅为什么高兴雷峰塔倒了？". The answer draws on the page you're reading and your notes, and says when it's going beyond them.

The tutor's messages go through the same reader as everything else, so you can tap its words and save them. The saved sentence is the tutor's sentence.

### How the tutor knows what you need to recap

The app keeps a **learner record**, and each session it hands the tutor only the relevant slice:

| The app tracks… | Example |
|---|---|
| **知识点 knowledge points**: each text and page is split into small checkable facts | `浙江·简称=浙`, `论雷峰塔的倒掉·鲁迅同情白娘子`, `静夜思·第3句` |
| **Memory state** of each saved item and knowledge point | due tomorrow, stable for 20 days, failed twice |
| **What you've read and saved** | read 《故乡》 parts 1–3, saved 18 words from it |
| **Your notes** | your own mnemonic for 皖 |
| **Mistakes you keep making** | mixes up 皖 and 赣; confuses 萧何 and 张良 |
| **Tutor notes**: 2–3 lines it writes after each session | "接下句 fine; struggles to use 成语 in context" |

Each session's packet contains your level, the ~20 most due or weakest items, their knowledge-point text and source sentences, your notes on them, recent mistakes, and the last tutor notes. It never sends your whole history.

**Who decides what:**
- **The scheduler decides *what* is due.** It's predictable and doesn't drift.
- **The tutor decides *how* to ask.** It writes the situations, hints and follow-ups.
- **The tutor grades free answers into a structured result**: which knowledge points you recalled, right / partly / wrong, and what the mistakes were. The app saves that into your memory state, the same way a flashcard review would.

**Ground rules for the tutor:**
- It only tests what you've read or saved.
- It gives a hint before the answer.
- It speaks Chinese first, pitched at HSK 5.
- It keeps turns short, one question at a time.
- It says 史实 / 传说 / 演义 when it matters.

### Model: OpenAI GPT-6 Luna
- **Model ID `gpt-6-luna`**, called through OpenAI's Responses API straight from the app, with **your own OpenAI API key stored only on your device**. There's no server, and the key never touches the repo. OpenAI's JavaScript SDK allows browser use with an explicit opt-in.
- **Effort**: low reasoning effort for quick drills and sentence explanations, medium for grading 说说看 and for role-play.
- **Structured outputs** for grading, so the memory record updates reliably.
- **Prompt caching** for the fixed instructions and texts. Cached input is billed at a tenth of the normal input price.
- **Cost**: $0.10 per million input tokens and $0.50 per million output. A 10-minute tutor session should cost around a cent.
- OpenAI doesn't publish anything about Luna's Chinese specifically, so Phase 4 starts by testing its grading and explanations on real answers. The model is a single setting, so it can be swapped if it falls short.

---

## 12. Flashcards & notes

- **Flashcards** come from your saves. Card types:
  - **生词**: the sentence with the word highlighted → pinyin and meaning
  - **成语**: idiom ↔ story
  - **地图**: click the province, 简称, 省会, silhouette
  - **诗词**: lines and 接下句
  - **历史**: order events, figure → idiom
- **Scheduling** uses **FSRS** (the algorithm Anki now offers). Flashcard reviews and tutor-graded answers update the same memory record.
- **Notes**: attach them to any page, text, sentence or card. They show up on your flashcards *and* are given to the tutor, so your own mnemonics come back to you.

## 13. Progress you can see

The game design is in §2. At a glance, the app shows:

- **点亮中国 + 集章**: provinces glow as you explore and remember them, and each city you finish stamps your passport
- **生词 garden**: how your saved words are growing
- **追剧**: the series you're following and what's new
- **书架**: texts you've finished, with how many words you saved from each
- **成语图鉴 · 美食图鉴 · 诗词本**: your collections, with a strength bar for each poem line
- **Friends**: how many hearts you have with each one
- **时间轴**: the timeline fills in as you explore eras

---

## 14. What's on the map

All 34 provincial-level divisions get a basic page from day one: key facts plus a short 讲解 introduction, with Wikipedia sections you can open. Full stories are added over time.

**Big-picture pages:** 中国像一只公鸡 (the country's shape) · 简称 and licence plates (京A, 沪B, 粤B…) · 三级阶梯 (the three-step staircase from Tibet to the sea) · 长江 & 黄河 · **秦岭–淮河**, the north/south line that decides who gets central heating (暖气), sweet vs. salty 豆腐脑, rice vs. noodles.

| Region | Province / city | 简称 | 省会 | Story hooks |
|---|---|---|---|---|
| **华北** | 北京 | 京 | — | 紫禁城, 长城 ("不到长城非好汉"), 胡同, 卢沟桥事变, 开国大典, 2008 奥运 |
| | 天津 | 津 | — | 天津卫, 九国租界, 相声, 狗不理包子 |
| | 河北 | 冀 | 石家庄 | 燕赵, 荆轲 ("风萧萧兮易水寒"), 邯郸学步, 完璧归赵 (赵国), 赵州桥, 雄安 |
| | 山西 | 晋 | 太原 | 三家分晋 (the start of 战国), 晋商, 关羽, 洪洞大槐树, 老陈醋 |
| | 内蒙古 | 蒙 | 呼和浩特 | 成吉思汗, 昭君墓, 敕勒歌 ("风吹草低见牛羊") |
| **东北** | 辽宁 | 辽 | 沈阳 | 沈阳故宫 (the Qing before the Qing), 九一八事变, 张学良, 共和国长子 & 下岗 |
| | 吉林 | 吉 | 长春 | 伪满洲国 & 溥仪, 长白山, 一汽 |
| | 黑龙江 | 黑 | 哈尔滨 | 中东铁路 & 中央大街, 冰雪节, 北大荒, 萧红's 呼兰, "南方小土豆" |
| **华东** | 上海 | 沪 | — | 沪渎, 外滩 & 租界, 中共一大, 浦东, "魔都" |
| | 江苏 | 苏 | 南京 | 六朝古都, 南京大屠杀, 苏州 & 吴王夫差, 淮安 & 韩信, 扬州, 连云港 花果山, 红楼梦, "散装江苏" |
| | 浙江 | 浙 | 杭州 | 白蛇传 (断桥, 雷峰塔), 岳飞 & 秦桧, 苏轼 & 苏堤, 绍兴 (勾践, 鲁迅, 兰亭), 宁波 梁祝, 义乌, 阿里巴巴 |
| | 安徽 | 皖 | 合肥 | 黄山, 徽商, 包拯, 曹操 & 华佗 (亳州), 朱元璋 (凤阳), 小岗村 |
| | 福建 | 闽 | 福州 | the 虫 inside 闽, 妈祖, 土楼, 武夷茶, 林则徐, 郑成功, 下南洋 |
| | 江西 | 赣 | 南昌 | 景德镇 (china = porcelain), 八一南昌起义, 井冈山, 庐山 ("不识庐山真面目"), 滕王阁 |
| | 山东 | 鲁 | 济南 | 孔子 & 曲阜, 泰山 ("有眼不识泰山"), 水浒 梁山 & 武松打虎, 诸葛亮's hometown, 青岛啤酒, 崂山道士, 八仙过海, 考公 meme |
| | 台湾 | 台 | 台北 | 郑成功, 1895 & 1945, 两岸 (with a note on how to handle this topic) |
| **华中** | 河南 | 豫 | 郑州 | 豫 = a man leading an elephant, 中原, 洛阳 (洛阳纸贵), 开封 & 包青天, 殷墟 甲骨文, 少林寺, 愚公移山, 岳飞, 杜甫 |
| | 湖北 | 鄂 | 武汉 | 武昌起义, 赤壁, 大意失荆州, 屈原 & 端午, 黄鹤楼, 三峡, 九头鸟, 热干面 |
| | 湖南 | 湘 | 长沙 | 毛泽东, 曾国藩 & 湘军, 岳阳楼 ("先天下之忧而忧"), 马王堆, 张家界, 汨罗江 |
| **华南** | 广东 | 粤 | 广州 | 虎门销烟, 孙中山, 黄埔军校, 深圳 & 南巡, 粤语, 早茶, 康有为 & 梁启超 |
| | 广西 | 桂 | 南宁 | "桂林山水甲天下", 壮族 & 刘三姐, 灵渠, 金田起义, 螺蛳粉 |
| | 海南 | 琼 | 海口 | 天涯海角, 苏轼 in 儋州, 海瑞 (→《海瑞罢官》→ 文革), 文昌 launch site |
| | 香港 | 港 | — | 南京条约, 1997 回归, 一国两制, 港片 (李小龙, 成龙, 周星驰) |
| | 澳门 | 澳 | — | 妈阁 → "Macau", 1999 回归, 葡式蛋挞 |
| **西南** | 重庆 | 渝 | — | 山城, 火锅, 抗战陪都, 钓鱼城 ("上帝折鞭处"), 轻轨穿楼 |
| | 四川 | 川/蜀 | 成都 | 蜀汉 & 诸葛亮, 乐不思蜀, "蜀道难", 都江堰, 三星堆, 熊猫, 湖广填四川, 汶川地震 |
| | 贵州 | 黔 | 贵阳 | 黔驴技穷, 夜郎自大, 遵义会议, 茅台, 黄果树 |
| | 云南 | 滇 | 昆明 | 25 minority peoples, 西南联大, 大理 & 天龙八部, 郑和's hometown, 七擒孟获, 野生菌 memes |
| | 西藏 | 藏 | 拉萨 | 文成公主 & 松赞干布, 布达拉宫, 珠峰 (with a note on how to handle this topic) |
| **西北** | 陕西 | 陕/秦 | 西安 | 长安, 兵马俑, 大雁塔 & 玄奘, 华清池 (杨贵妃 *and* 西安事变), 延安, biángbiáng 面 |
| | 甘肃 | 甘/陇 | 兰州 | 河西走廊, 敦煌, 嘉峪关, 酒泉 (霍去病's wine), 得陇望蜀, 牛肉面 |
| | 青海 | 青 | 西宁 | 青海湖, 三江源 (where the 长江 and 黄河 begin), 塔尔寺 |
| | 宁夏 | 宁 | 银川 | 西夏, 回族, 枸杞, "塞上江南", 镇北堡 & 大话西游 |
| | 新疆 | 新 | 乌鲁木齐 | 张骞 & 西域, 班超 ("不入虎穴，焉得虎子"), 火焰山 (西游记), 楼兰, 吐鲁番葡萄 (with a note on how to handle this topic) |

Legends and novels are pinned to places: 白蛇传 (杭州, 镇江), 梁祝 (宁波), 西游记 (连云港, 吐鲁番), 水浒传 (梁山), 红楼梦 (南京), 八仙过海 (蓬莱), 孟姜女 (山海关), 妈祖 (莆田), 刘三姐 (广西), 阿诗玛 (石林).

## 15. What's on the timeline

| Era | Key events & people | Idioms & sayings |
|---|---|---|
| 神话 & 上古 | 盘古, 女娲, 炎黄, 大禹治水 | 三过家门而不入, 精卫填海, 愚公移山 |
| 夏商周 | 纣王, 武王伐纣, 周幽王 | 酒池肉林, 烽火戏诸侯 |
| 春秋 | 齐桓公 & 管仲, 吴越争霸, 孔子, 老子, 孙子 | 管鲍之交, 卧薪尝胆, 兔死狗烹 |
| 战国 | 七雄, 商鞅变法, 长平之战, 屈原, 荆轲 | 立木为信, 完璧归赵, 负荆请罪, 纸上谈兵, 围魏救赵, 毛遂自荐, 狐假虎威, 鹬蚌相争, 图穷匕见 |
| 秦 | 统一, 书同文, 长城, 赵高, 陈胜吴广 | 指鹿为马, 王侯将相宁有种乎 |
| 楚汉相争 | 项羽 vs 刘邦, 韩信, 萧何, 张良 | 破釜沉舟, 鸿门宴, 项庄舞剑意在沛公, 约法三章, 明修栈道暗度陈仓, 背水一战, 四面楚歌, 霸王别姬, 成也萧何败也萧何 |
| 汉 | 汉武帝, 张骞, 卫青 & 霍去病, 司马迁, 昭君, 苏武 | 匈奴未灭何以家为, 重于泰山轻于鸿毛, 投笔从戎, 凿壁偷光 |
| 三国 | 曹操, 刘备, 孙权, 诸葛亮, 关羽, 赤壁 | 三顾茅庐, 望梅止渴, 草船借箭, 万事俱备只欠东风, 刮目相看, 乐不思蜀, 说曹操曹操到, 司马昭之心, 鞠躬尽瘁 |
| 魏晋南北朝 | 竹林七贤, 王羲之, 淝水之战, 花木兰 | 草木皆兵, 风声鹤唳, 闻鸡起舞, 东山再起, 入木三分 |
| 隋唐 | 大运河, 玄武门之变, 唐太宗, 武则天, 杨贵妃, 安史之乱, 李白, 杜甫, 玄奘 | 以人为镜, 口蜜腹剑, "一骑红尘妃子笑" |
| 宋 | 赵匡胤, 包拯, 范仲淹, 王安石, 苏轼, 岳飞, 靖康之耻 | 黄袍加身, 杯酒释兵权, 精忠报国, 莫须有, 先天下之忧而忧 |
| 元 | 成吉思汗, 忽必烈, 文天祥, 马可·波罗 | 留取丹心照汗青, 比窦娥还冤 |
| 明 | 朱元璋, 郑和, 王阳明, 海瑞, 戚继光, 李自成, 吴三桂 | 知行合一, 冲冠一怒为红颜 |
| 清 | 康乾盛世, 和珅, 闭关锁国, 曹雪芹 | — |
| 近代 | **鸦片战争**, 林则徐, 南京条约, 太平天国, 火烧圆明园, 洋务运动, 甲午战争, 戊戌变法, 八国联军, 慈禧, 辛亥革命 | 师夷长技以制夷, 落后就要挨打, 百年国耻 |
| 民国 | 五四运动, 鲁迅, 长征, 西安事变, 抗日战争, 国共内战 | 阿Q精神 |
| 新中国 | 开国大典, 抗美援朝, 大跃进, 文化大革命, 恢复高考, 改革开放, 南巡, 香港回归, 北京奥运 | 黑猫白猫, 摸着石头过河, 下海 |

Modern topics come with a **聊天提示 (conversation tip)**: what's a point of pride, what older people lived through, and what's sensitive or censored, so you know how to handle it at the dinner table.

---

## 16. How it's built

**A website that installs like an app** (a PWA). You open it in your phone's browser once and tap "Add to Home Screen". From then on it has its own icon, opens full-screen without browser bars, and works offline (except the AI features), like an app. The same thing works on a laptop. It's hosted free on GitHub Pages from this repo, so there's no App Store and no install review, and updates appear the next time you open it. If you ever want it in the App Store, the same code can be wrapped as a native app later.

| Piece | Choice | Why |
|---|---|---|
| App | Vite + React + TypeScript | Fast, simple, widely supported |
| UI | Tailwind CSS with the design tokens, Motion, Radix, Vaul, Phosphor icons, Lottie | Proven building blocks (see the design system) |
| Your data (saves, notes, imports, memory record, API key) | IndexedDB via Dexie, on your device | Personal data and copyrighted imports never touch the public repo. Export/import as a backup file. Don't use `uniqueKeys()` / `eachUniqueKey()`: iPhone Safari (WebKit 26) can't open those cursors and the app fails to start. Read with `toArray()` and dedupe in JS |
| Spaced repetition | `ts-fsrs` | FSRS algorithm |
| Pinyin | `pinyin-pro` | Handles words with more than one reading (行 háng/xíng, 长 cháng/zhǎng) using context. Runs in the browser, so imports and tutor messages get pinyin too |
| Word splitting | `Intl.Segmenter`, plus manual fixes for committed texts | Built into browsers, so it also works on imports and tutor messages |
| Traditional → simplified | OpenCC | Many public-domain sources are in traditional characters |
| Dictionary | CC-CEDICT | Free, about 120k entries (CC BY-SA, credited in the app) |
| Difficulty | HSK word lists | "% above HSK 5" and each word's level in its card |
| Map | d3-geo + province boundaries from Natural Earth (public domain), simplified | Clickable SVG provinces that are light enough for a phone |
| Audio | Browser text-to-speech (zh-CN); browser speech recognition for answering aloud | Free and needs no setup |
| AI | OpenAI `gpt-6-luna` via the official `openai` SDK, your own key | See §11 |

### Content format

A story (讲解):

```markdown
---
id: baishezhuan
type: story
title: 白蛇传：一把伞，一座塔，一千年
places: [hangzhou, zhenjiang]
sources: [bai-niangzi, lun-leifengta, wiki-baishezhuan]
points:            # 知识点 the tutor grades against
  - ...
---
## 西湖借伞
The story, one paragraph per line…
::原文[bai-niangzi#借伞]      ← drops in an excerpt with a 阅读全文 link
```

A full text:

```markdown
---
id: guxiang
type: text
title: 故乡
author: 鲁迅
year: 1921
source: <link to the copy it was taken from, e.g. 维基文库>
license: public-domain
places: [shaoxing]
points:            # 知识点 the tutor grades against, written when the text is added
  - ...
---
One paragraph per line, converted to simplified characters.
Manual fixes where needed: [[闰土]] makes a wiki link, {长|zhǎng} forces a pinyin reading.
```

A province page (`content/places/<id>.md`, one per province) and a 刷一刷 card (`content/feed/<slug>.md`):

```markdown
---
id: henan
name: 河南
full: 河南省
type: 省            # 省 / 自治区 / 直辖市 / 特别行政区
short: 豫
alias: 秦           # optional second 简称
capital: 郑州       # left out for 直辖市 and 特别行政区
region: 华中        # 华北 东北 华东 华中 华南 西南 西北
---
The intro paragraph.

## 聊天彩蛋
- One conversation starter per bullet.
  问：The question its flashcard asks (required).
  查：Search words for 深入 (optional).
```

```markdown
---
id: zaocha          # same as the file name
date: 2026-11-21
title: "在广东喝早茶，为什么要用手指敲桌子？"
province: guangdong # optional
series: pangdonglai # optional
tags: [美食, 民俗]
sources:
  - { title: "维基百科：飲茶", url: "https://zh.wikipedia.org/wiki/飲茶" }
inspiration: []     # reel URLs, as links only
---
150–300 字 in our own words, ending on an open question.
```

Series link to provinces with `provinces: [henan]` in their index.md.

A build script turns each file into JSON: it splits the text into sittings and words, adds pinyin, attaches dictionary meanings, checks every link points to a real page, and measures difficulty.

### Repo layout

```
content/
  series/     episode series (家乡必做, 白蛇传…), with excerpts embedded
  feed/       刷一刷 cards
  stories/    讲解 pages for places, people and events
  texts/      real texts, one file each, with source & licence
  wiki/       Chinese Wikipedia articles used for excerpts (CC BY-SA)
  places/     basic facts for the 34 provinces & key cities
  poems/      one file per poem, with line-by-line notes
scripts/      build-content.ts
src/
  reader/     story & long-text reader, word card (save, 问AI), explain/translate, import
  feed/       刷一刷 feed
  world/      daily rhythm, 生词 garden, 节气 & festivals, friends, stamps, bundles
  map/        China map, province pages
  timeline/
  poems/      the 4-stage poem method
  wiki/       pages, links, backlinks, search
  srs/        flashcards, FSRS, memory record
  tutor/      OpenAI client, context packets, session modes, grading
  notes/
  storage/    IndexedDB, export/import
public/data/  CC-CEDICT, HSK lists, map boundaries
```

Licensing: the code is MIT, Wikipedia-derived pages stay CC BY-SA 4.0, and the committed texts are public domain. Each file says which.

---

## 17. The daily updater (每日更新)

A scheduled task in the Claude desktop app on your Mac runs every morning at 8:00 and keeps the app growing.

**Each run:**
1. **Pull** the latest version of the repo.
2. **Stroll for inspiration** (about 10 minutes). In your Chrome, it scrolls a few of the channels in §3 and Instagram searches like 家乡必去 · 家乡必做 · china street interview · 中国冷知识, plus news. It notes only topics and facts: a city, the surprising answer, the claims worth checking, and the link. It's read-only: no likes, follows, comments or messages, and no downloads.
3. **Research** each new topic from public sources (news, official sites, Wikipedia) and check the facts.
4. **Write**, in our own words at HSK 5: a new 刷一刷 card every day, plus the next episode of a 家乡必做 series. Every item lists its sources and links the reel that inspired it. Before finishing, it asks the 最后一问 and adds any new 聊天彩蛋.
5. **Check**: the build passes, links work, and no sentence is copied from a source.
6. **Publish**: commit to `main` and push, which redeploys the site. If a check fails, it pushes to a separate branch instead and says why.
7. **Log** what it added in `content/CHANGELOG.md`, and keep a queue of researched topics in `content/backlog.md`.

**Until Phase 1 exists**, it only gathers, researches and queues topics in `content/backlog.md`, so there's material ready when the app is.

**It needs** the Claude app open (a missed run happens the next time you open it) and Chrome running with Claude in Chrome connected. Without Chrome, it uses web search only.

---

## 18. Build phases

Each phase ends with something you can actually use.

**Phase 1 · Read, tap, save, in episodes**
- App scaffold, PWA, auto-deploy to GitHub Pages
- Chinese interface; every word anywhere opens a word card with ⭐ save and 💬 问AI
- Episode reader: 集 with cliffhangers, unlock-by-recall, 追剧 progress; full texts in sittings; pinyin only on hard words; listen
- Save → flashcard (keeping the sentence), FSRS review, notes, backup
- Paste-to-import, private to your device
- OpenAI key setting; 问AI, 解释 and 翻译 with Luna, saved on your device
- First two series: **许昌 · 胖东来** (家乡必做, 6 集) and **杭州 · 白蛇传** (4 集, with excerpts and the full 冯梦龙 and 鲁迅 texts)
- ✅ Done when you can binge the 胖东来 series on your phone, unlocking each episode with a quick recall, save words along the way, and review them the next day

**Phase 2 · The hooks**
- 刷一刷 feed with the first ~30 cards, mixing new cards and reviews
- Daily rhythm (morning review, day summary), the 生词 garden, streaks with a grace day
- Map home screen with all 34 provinces, 集章 stamps and 点亮中国
- Opt-in notifications for series you follow
- ✅ Done when opening the app gives you a 5-minute morning routine and a feed you want to keep swiping

**Phase 3 · Poems**
- Poem pages and the 4-stage method (fading hints, per-line tracking, spaced recitation)
- First five poems: 静夜思, 春晓, 登鹳雀楼, 黄鹤楼送孟浩然之广陵, 枫桥夜泊
- ✅ Done when you can learn 静夜思 in one sitting and the app brings it back on schedule, line by line

**Phase 4 · AI tutor and friends**
- Test Luna's grading and explanations on real answers first
- The learner record and 知识点 for everything so far
- 说说看, 情景用语, 接下句, 复习课, 问AI
- The first three friends with hearts (成都, 许昌, 杭州)
- ✅ Done when the tutor runs a 10-minute recap built only from what you've read and saved, and a friend's messages change as you learn about their hometown

**Phase 5 · The world grows**
- A new 家乡必做 city series every week; more stories (淮安 · 韩信, 绍兴 · 鲁迅, 南京, 西游记…)
- 节气 seasons and festival events, 美食图鉴, bundles
- Wiki: 讲解 pages, links, backlinks, search, 随便逛逛, 成语图鉴
- 问你的朋友: turn a friend's answer into a new series
- A "send to 中国通" bookmarklet to import any article you're reading in the browser

**Phase 6 · Timeline and conversation**
- Timeline with 朝代歌, eras pinned to the map
- Retelling (讲故事), speaking your answers, sync between devices

---

## 19. Decisions

| Topic | Decision |
|---|---|
| Platform | A website that installs like an app (PWA), hosted on GitHub Pages |
| Level | HSK 5 |
| Characters | Simplified |
| AI | OpenAI GPT-6 Luna (`gpt-6-luna`), with your own key stored only on your device |
| Content | Our own words. Real texts appear as excerpts that open into full documents. Social media is inspiration only: linked, never copied |
| Look | Duolingo-style energy, traditional Chinese colours, patterns borrowed from apps people know, no AI look |
| Updates | The daily updater adds content every morning at 8:00 and redeploys |
| Your data | Kept on one device with a backup file; sync later |
| Voice | Typing first; speaking answers in Phase 6 |
| First build | Phase 1: episode reader with unlock-by-recall, word card, flashcards, and the 许昌 · 胖东来 and 杭州 · 白蛇传 series |
