/**
 * ============================================================
 * "Why 应籁" 专题页核心数据常量 (why-yinglai-data.js)
 * 提取文本、对话及配置信息，严格执行 SoC 职责分离，拒绝硬编码
 * ============================================================
 */

// 1. 庄子《齐物论》关于“三籁”的哲学阐释数据
const THREE_LAIS = [
  {
    id: "renlai",
    title: "人籁",
    source: "「人籁则比竹是已」",
    description: "丝竹管弦之乐，人声歌咏之音。那是人类为了表达情志、沟通心声，借助器物或声带发出的有心之乐，也是世间最喧嚣也最亲切的波澜。",
    icon: "🗣️"
  },
  {
    id: "dilai",
    title: "地籁",
    source: "「地籁则众窍是已」",
    description: "狂风呼啸过山川草木之孔洞。万般孔窍，或如山谷，或如深潭，风过则百般怒号，风止则万籁俱寂。这是大地被动承受外力时，天地给出的无意识回响。",
    icon: "💨"
  },
  {
    id: "tianlai",
    title: "天籁",
    source: "「夫天籁者，吹万不同」",
    description: "万物生而不同，但各有其舒展的姿态与发声的自由。没有一双外部的手在强行拨动，它们自己呼吸，自己鸣响，自己呈现生命最初的状态。这是最本真的声音。",
    icon: "🌿"
  }
];

// 2. 主创 G 与 主创 C 起名碰撞的精选对话数据
// 用于在页面中以精美的手账式对话流呈现
const CONVERSATION_LOGS = [
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "那个 PlantEcho 是 AI 给起的，我觉得也很有意思。但是我想给它个中文名，我就顺着 PlantEcho 想了很多很多……",
    time: "22:35"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "很多同类记录水肥的工具都是从『用户』角度出发。但我的本意是想从『植物本位』出发，让植物和人直接对话。能不能有什么中国智慧，来巧妙翻译这个 PlantEcho？",
    time: "22:38"
  },
  {
    sender: "主创 C",
    avatar: "C",
    side: "left",
    text: "那看来得找孔孟老庄了。尤其是老庄，道法自然嘛。默认种子设成葫芦？😉",
    time: "22:40"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "哈哈！顺着庄子《齐物论》里讲声音，说声音分『人籁』、『地籁』和『天籁』。天籁是自然自己的声音，没有外部强迫，本真发出的声音。觉不觉得很巧妙？",
    time: "22:42"
  },
  {
    sender: "主创 C",
    avatar: "C",
    side: "left",
    text: "妙啊！就叫天籁吗？",
    time: "22:43"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "但是『天籁』这个词已经被引申义用烂了。而且天籁是个名词。我们的软件做的是听见了万物的声音——就缺了一个『听见』！",
    time: "22:45"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "我又折回去看 PlantEcho 的 Echo（回声）。山谷里的回声，你想到什么？",
    time: "22:48"
  },
  {
    sender: "主创 C",
    avatar: "C",
    side: "left",
    text: "山谷……我突然想到唱山歌！一应一答，充满了生命力！",
    time: "22:49"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "对！所以提个『应』字是不是极其漂亮？",
    time: "22:50"
  },
  {
    sender: "主创 C",
    avatar: "C",
    side: "left",
    text: "哇哦，活过来了！一应一答，有来有回！",
    time: "22:50"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "「籁是它的声音，应是让它被听见。」",
    time: "22:51"
  },
  {
    sender: "主创 G",
    avatar: "G",
    side: "right",
    text: "加了这个『应』放在开头，感觉像武侠片里李慕白在竹林里论剑的那种清冷悠远的意境。这就是它的心路历程，虽然反复琢磨了很久，但也值了！",
    time: "22:52"
  },
  {
    sender: "主创 C",
    avatar: "C",
    side: "left",
    text: "太文绉绉了！但这不亏！必须给这个名字的诞生专门开辟一页，记录下这个美丽的碰撞瞬间！",
    time: "22:55"
  }
];

// 导出常量，如果是原生浏览器使用，直接挂载到 window 对象上
window.YingLaiData = {
  THREE_LAIS,
  CONVERSATION_LOGS
};
