/**
 * 拍表：整部影片的剧本。
 *
 * 一拍 = 一个可以独立看懂的小动作，外加这一拍要说的话。
 * 一拍的实际长度 = max(画面自己需要的秒数, 那些字幕读完需要的秒数)，
 * 所以把某句释义改长一点，它所在的那一拍会自动变长 —— 观众没读完，画面绝不切走。
 *
 * 每一拍都用**原文**说话：字幕的前半句是《千字文》的原句，后半句是本站的现代释义。
 */

import type { BeatSpec } from './cues'
import type { SceneId } from './timeline'

export const SCORE: Record<SceneId, BeatSpec[]> = {
  /* ------------------------------------------------------------- 解码 */
  decode: [
    {
      min: 2.6,
      chapter: true,
      slot: 'boot',
      cues: [
        { text: 'ARCHIVE FOUND' },
        { text: 'PARSING CHARACTERS' },
        { text: 'BUILDING WORLD MODEL' },
      ],
    },
    {
      min: 3.2,
      slot: 'scan',
      key: { text: '一千个字。一千个不重复的字。', tone: 'number' },
      cues: [{ text: '《千字文》：周兴嗣撰，四言一句，共二百五十句。' }],
      phrases: [0, 1],
    },
    {
      min: 3.4,
      slot: 'glyphs',
      key: { text: 'A thousand characters, scanned.', tone: 'term' },
      cues: [
        { text: '原文用繁体时，一千字互不重复。' },
        { text: '换成简体，有七处被合并成了同一个字。' },
      ],
      phrases: [0],
    },
    {
      min: 3.2,
      slot: 'tags',
      key: { text: '字符 → 语义标签 → 知识网络', tone: 'term' },
      cues: [
        { text: '本站给每一句标注语义标签，再按标签把句子连起来。' },
        { text: '这张网络是本站生成的，不是《千字文》原有的结构。' },
      ],
    },
    {
      min: 3.0,
      slot: 'title',
      key: { text: '千字文：世界的源代码', tone: 'statement' },
      cues: [{ text: 'QIANZI.EXE — DECODE AN ANCIENT WORLD MODEL', note: true }],
    },
  ],

  /* ------------------------------------------------------------- 天地 */
  cosmos: [
    {
      min: 3.0,
      chapter: true,
      slot: 'open',
      key: { text: 'COSMOS · 天地时序', tone: 'term' },
      cues: [{ text: '先看头顶这片天：昼夜、季节、历法、星辰。' }],
      phrases: [0, 1],
    },
    {
      min: 3.6,
      slot: 'starmap',
      key: { text: '辰宿列张', tone: 'term' },
      cues: [
        { text: '辰宿列张 —— 二十八宿像罗列的网标分周天。' },
        { text: '这是中国古代的星官分区，与现代星座并不重合。', note: true },
      ],
      phrases: [3],
    },
    {
      min: 3.4,
      slot: 'sunmoon',
      key: { text: '日月盈昃', tone: 'term' },
      cues: [
        { text: '日月盈昃 —— 日月的盈亏与西沉。' },
        { text: '现代天文学：月相由日、地、月三者的相对位置决定。', note: true },
      ],
      phrases: [2],
    },
    {
      min: 3.4,
      slot: 'seasons',
      key: { text: '寒来暑往，秋收冬藏', tone: 'term' },
      cues: [
        { text: '寒来暑往 —— 寒冷与暑热随季节交替。' },
        { text: '闰余成岁 —— 用闰余余日补足回归年与朔望月的差。' },
        { text: '回归年约 365.2422 日，故每 19 年设 7 个闰月。', note: true },
      ],
      phrases: [4, 5, 6],
    },
    {
      min: 3.0,
      slot: 'pipes',
      key: { text: '律吕调阳', tone: 'term' },
      cues: [
        { text: '律吕调阳 —— 十二律管与节令相配，按月令定音高。' },
        { text: '这是古代的「历—律」对应体系，不是物理定律。', note: true },
      ],
      phrases: [7],
    },
  ],

  /* ------------------------------------------------------------- 自然 */
  nature: [
    {
      min: 2.8,
      chapter: true,
      slot: 'open',
      key: { text: 'NATURE · 山川草木', tone: 'term' },
      cues: [{ text: '再落到脚下：云雨、霜露、江河、土壤与草木。' }],
      phrases: [8],
    },
    {
      min: 3.4,
      slot: 'weather',
      key: { text: '云腾致雨，露结为霜', tone: 'term' },
      cues: [
        { text: '云腾致雨 —— 云气升腾，雨水随之而降。' },
        { text: '露是水汽凝成液滴；霜是水汽直接结晶成冰晶。', note: true },
      ],
      phrases: [8, 9],
    },
    {
      min: 3.6,
      slot: 'terrain',
      key: { text: '岳宗泰岱', tone: 'term' },
      cues: [
        { text: '岳宗泰岱 —— 五岳以泰山为首。' },
        { text: '雁门紫塞，鸡田赤城；昆池碣石，巨野洞庭。' },
        { text: '旷远绵邈，岩岫杳冥。', note: true },
      ],
      phrases: [154, 155, 156, 157, 158, 159, 160, 161],
    },
    {
      min: 3.4,
      slot: 'water',
      key: { text: '海咸河淡，鳞潜羽翔', tone: 'term' },
      cues: [
        { text: '海咸河淡 —— 海水咸，河水淡。' },
        { text: '海水溶解岩石与海底沉积物中的盐类，蒸发把盐留下。', note: true },
        { text: '鳞潜羽翔 —— 有鳞的潜游，有羽的飞翔。' },
      ],
      phrases: [16, 17],
    },
    {
      min: 3.2,
      slot: 'plants',
      key: { text: '渠荷的历，园莽抽条', tone: 'term' },
      cues: [
        { text: '枇杷晚翠，梧桐蚤凋；陈根委翳，落叶飘摇。' },
        { text: '游鹍独运，凌摩绛霄。' },
      ],
      phrases: [188, 189, 190, 191, 192, 193, 194, 195],
    },
  ],

  /* --------------------------------------------------------- 文明与制度 */
  civilization: [
    {
      min: 3.0,
      chapter: true,
      slot: 'open',
      key: { text: 'CIVILIZATION · 文字与制度', tone: 'term' },
      cues: [{ text: '然后是人：文字、都邑、宫室、典籍、律令与史事。' }],
      phrases: [20],
    },
    {
      min: 3.8,
      slot: 'writing',
      key: { text: '始制文字，乃服衣裳', tone: 'term' },
      cues: [
        { text: '传说黄帝时代始制文字 —— 这是传说，不是记载。' },
        { text: '考古上最早的成熟汉字系统是商代甲骨文。', note: true },
        { text: '杜稿钟隶，漆书壁经：草书、隶书、漆书、壁上的经文。' },
      ],
      phrases: [20, 21, 120, 121],
    },
    {
      min: 4.0,
      slot: 'capital',
      key: { text: '都邑华夏，东西二京', tone: 'term' },
      cues: [
        { text: '背邙面洛，浮渭据泾：洛阳与长安，汉代的两京。' },
        { text: '宫殿盘郁，楼观飞惊；右通广内，左达承明。' },
      ],
      phrases: [102, 103, 104, 105, 106, 107, 116, 117],
    },
    {
      min: 4.0,
      slot: 'history',
      key: { text: '周发殷汤，百郡秦并', tone: 'term' },
      cues: [
        { text: '虚线是传说，实线是信史 —— 这一段把它们混着写，我们把它们分开。' },
        { text: '磻溪伊尹，佐时阿衡；奄宅曲阜，微旦孰营。' },
        { text: '九州禹迹，百郡秦并：秦始皇二十六年并天下，置三十六郡。' },
      ],
      phrases: [24, 25, 132, 133, 152, 153],
    },
    {
      min: 3.6,
      slot: 'law',
      key: { text: '礼别尊卑，法立有章', tone: 'term' },
      cues: [
        { text: '乐殊贵贱，礼别尊卑：礼乐制度用声音与仪节区分等级。' },
        { text: '何遵约法，韩弊烦刑；诛斩贼盗，捕获叛亡。' },
        { text: '祭祀烝尝：冬祭曰烝，秋祭曰尝。', note: true },
      ],
      phrases: [80, 81, 146, 147, 217, 226, 227],
    },
  ],

  /* --------------------------------------------------------- 修身与人事 */
  human: [
    {
      min: 2.8,
      chapter: true,
      slot: 'open',
      key: { text: 'HUMAN SYSTEMS · 修身与人事', tone: 'term' },
      cues: [{ text: '人被组织起来之后，先要把自己整理好。' }],
      phrases: [36],
    },
    {
      min: 3.6,
      slot: 'body',
      key: { text: '盖此身发，四大五常', tone: 'term' },
      cues: [
        { text: '盖此身发 —— 人的身体发肤受自父母。' },
        { text: '恭惟鞠养，岂敢毁伤：这是《孝经》一路的说法。' },
      ],
      phrases: [36, 37, 38, 39],
    },
    {
      min: 3.6,
      slot: 'echo',
      key: { text: '空谷传声，虚堂习听', tone: 'term' },
      cues: [
        { text: '空谷传声 —— 比喻有德者的话，即使无人听也会传开。' },
        { text: '虚堂习听 —— 空堂之中反复听自己的话。' },
        { text: '先慎独，而后能服人。', note: true },
      ],
      phrases: [54, 55],
    },
    {
      min: 3.6,
      slot: 'relations',
      key: { text: '交友投分，切磨箴规', tone: 'term' },
      cues: [
        { text: '孔怀兄弟，同气连枝；诸姑伯叔，犹子比儿。' },
        { text: '仁慈隐恻，造次弗离：语出《论语》「造次必于是」。' },
      ],
      phrases: [88, 89, 90, 91, 92, 93],
    },
    {
      min: 3.8,
      slot: 'retreat',
      key: { text: '两疏见机，解组谁逼', tone: 'term' },
      cues: [
        { text: '西汉疏广、疏昌父子（世称「二疏」）乞骸骨归乡里。' },
        { text: '索居闲处，沉默寂寥；求古寻论，散虑逍遥。' },
        { text: '这一段是伦理观念，不是行为科学。', note: true },
      ],
      phrases: [180, 181, 182, 183, 184, 185],
    },
  ],

  /* --------------------------------------------------------- 衣食器用 */
  daily: [
    {
      min: 2.8,
      chapter: true,
      slot: 'open',
      key: { text: 'DAILY LIFE · 衣食器用', tone: 'term' },
      cues: [{ text: '最后是生活：耕种、饮食、纺织、器物、宴乐与起居。' }],
      phrases: [162],
    },
    {
      min: 3.6,
      slot: 'farm',
      key: { text: '治本于农，务兹稼穑', tone: 'term' },
      cues: [
        { text: '俶载南亩，我艺黍稷：整治南田，种植粟与黍。' },
        { text: '税熟贡新 —— 粮食熟了献上新的贡赋。' },
      ],
      phrases: [162, 163, 164, 165, 166],
    },
    {
      min: 3.4,
      slot: 'table',
      key: { text: '具膳餐饭，适口充肠', tone: 'term' },
      cues: [
        { text: '饱饫烹宰，饥厌糟糠：富人宰牲，穷人连糟糠也满足。' },
        { text: '弦歌酒宴，接杯举觞。' },
      ],
      phrases: [200, 201, 202, 203, 212, 213],
    },
    {
      min: 3.4,
      slot: 'objects',
      key: { text: '纨扇圆洁，银烛炜煌', tone: 'term' },
      cues: [
        { text: '蓝笋象床：蓝草染的竹席，象牙装饰的床。' },
        { text: '布射僚丸，嵇琴阮啸；恬笔伦纸，钧巧任钓。' },
        { text: '嵇康抚琴，阮籍长啸 —— 竹林七贤的两位。', note: true },
      ],
      phrases: [208, 209, 210, 211, 228, 229, 230, 231],
    },
    {
      min: 3.0,
      slot: 'home',
      key: { text: '妾御绩纺，侍巾帷房', tone: 'term' },
      cues: [
        { text: '亲戚故旧，老少异粮 —— 这两句属于「修身与人事」，这里只借用它的生活场景。' },
        { text: '骸垢想浴，执热愿凉；驴骡犊特，骇跃超骧。' },
      ],
      phrases: [206, 207, 222, 223, 224, 225],
    },
  ],

  /* ------------------------------------------------------------- 全景 */
  whole: [
    {
      min: 3.2,
      chapter: true,
      slot: 'pullback',
      key: { text: 'THE WHOLE MODEL', tone: 'term' },
      keyY: 812,
      cues: [{ text: '把镜头拉远 —— 五个区域其实是同一张图。' }],
    },
    {
      min: 3.4,
      slot: 'clusters',
      key: { text: '二百五十句，一千个字，一张图', tone: 'number' },
      keyY: 812,
      cues: [{ text: '每一簇是一个主题，簇与簇之间的长线是共享的语义标签。' }],
    },
    {
      min: 3.4,
      slot: 'trace',
      key: { text: '点任何一个节点，都能追出它和其它句子的关系。', tone: 'statement' },
      keyY: 812,
      cues: [{ text: '例如「孝当竭力」连着「夙兴温凊」「资父事君」「入奉母仪」。' }],
      phrases: [62],
    },
    {
      min: 3.6,
      slot: 'end',
      key: { text: '千字文：世界的源代码', tone: 'statement' },
      cues: [
        { text: '谓语助者，焉哉乎也 —— 一千个字，最后四个字是四个语气词。' },
        { text: 'QIANZI.EXE — DECODE AN ANCIENT WORLD MODEL', note: true },
      ],
      phrases: [248, 249],
    },
  ],
}
