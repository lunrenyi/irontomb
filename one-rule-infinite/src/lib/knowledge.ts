/**
 * 第二幕：知识依赖网络 —— 全片的主体。
 *
 * 这里要讲清楚一件事：**知识的增长不只是分叉，更是连接。**
 *
 * 一棵树只能表达「一个父节点生出若干子节点」。
 * 但知识的真实依赖是另一回事：
 *   - 一项发现常常同时打开好几个方向（出度 > 1）；
 *   - 一个成果往往建立在好几个前置之上（入度 > 1）；
 *   - 一项基础技术会被多个下游反复复用。
 *
 * 所以这张图最后长成的是一张**有向无环图**，而不是一棵树。
 *
 * 结构上分四层：
 *   L0 基础科学          —— 唯一的起点
 *   L1 五个方向          —— 材料 / 能源 / 电磁 / 计算 / 制造
 *   L2 具体技术积累      —— 每个方向两条
 *   L3 五个技术模块      —— 开始跨领域互相依赖（这是全片的关键转折）
 *   L4 智能手机          —— 全部汇聚
 *   L5 移动应用          —— 成果又变成新的起点
 *
 * 诚实声明（页面与影片都写出来了）：
 * 这是一张**简化的概念模型**，用来讲清「依赖 / 复用 / 汇合」这三件事，
 * 不是严格的技术史谱系，也不主张精确的先后顺序。
 */

import { growBounds, type Bounds, EMPTY_BOUNDS } from './geometry'

export interface KnowledgeNode {
  id: string
  label: string
  note: string
  /** 世界坐标（由层级 + 所属方向算出，见 layout） */
  x: number
  y: number
  /** 依赖层级：0 是起点 */
  layer: number
  /** 属于哪个方向（0-4）；手机与应用横跨多个方向 */
  domain: number
  /** 它依赖谁（可以不止一个） */
  prereqs: string[]
  /** 它解锁了谁 */
  unlocks: string[]
  /** 顺着枝条长出来，还是跨枝条的汇合 */
  origin: 'branch' | 'merge'
  /** 全片时间轴上什么时候出现（0-1） */
  appear: number
}

export interface KnowledgeEdge {
  from: string
  to: string
  kind: 'branch' | 'merge'
  appear: number
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  byId: Record<string, KnowledgeNode>
  /** 每层有哪些节点（讲课时用） */
  layers: KnowledgeNode[][]
  /** 智能手机由哪几个模块组成（视觉高潮用） */
  phoneParts: string[]
  /** 手机的五个应用 */
  apps: string[]
  bounds: Bounds
}

/** 五个方向的名字，按 domain 0-4 排列 */
export const DOMAINS = ['材料', '能源', '电磁', '计算', '制造']

/** 手机的五个模块，也是第二幕视觉高潮的组装顺序 */
export const PHONE_PARTS = ['chip', 'battery', 'radio', 'display', 'os']

/** 手机的五个应用：成果本身又成了新的起点 */
export const APP_IDS = ['photo', 'map', 'pay', 'collab']

interface Spec {
  id: string
  label: string
  note: string
  layer: number
  domain: number
  prereqs: string[]
}

/**
 * 全部节点。
 *
 * 关键在 L3 的 prereqs：几乎每个都横跨了不同方向，
 * 「树变成网络」这件事就是从这里真正发生的。
 */
const SPECS: Spec[] = [
  { id: 'root', label: '基础科学', note: '物理与数学。后面所有的方向，都是从几条基本原理分出去的。', layer: 0, domain: 2, prereqs: [] },

  { id: 'd0', label: '材料科学', note: '有哪些材料能用，以及它们各自的性质。', layer: 1, domain: 0, prereqs: ['root'] },
  { id: 'd1', label: '能源化学', note: '能量怎么存进去，怎么放出来。', layer: 1, domain: 1, prereqs: ['root'] },
  { id: 'd2', label: '电磁理论', note: '电与磁如何传播，这是所有无线通信的地基。', layer: 1, domain: 2, prereqs: ['root'] },
  { id: 'd3', label: '计算理论', note: '什么可以算，以及怎样算得又快又省。', layer: 1, domain: 3, prereqs: ['root'] },
  { id: 'd4', label: '精密制造', note: '把上面的东西真的做出来，靠的是工艺。', layer: 1, domain: 4, prereqs: ['root'] },

  { id: 'mat0', label: '半导体材料', note: '能被精确掺杂、做成 pn 结的材料体系。', layer: 2, domain: 0, prereqs: ['d0'] },
  { id: 'mat1', label: '晶体与薄膜', note: '屏幕、太阳能电池、射频滤波器都要用的薄层材料。', layer: 2, domain: 0, prereqs: ['d0'] },
  { id: 'chem0', label: '电化学', note: '电极反应与离子迁移，决定电池能存多少电。', layer: 2, domain: 1, prereqs: ['d1'] },
  { id: 'chem1', label: '电池材料', note: '正负极材料与电解液，直接决定能量密度。', layer: 2, domain: 1, prereqs: ['d1'] },
  { id: 'em0', label: '射频电路', note: '把信号调制到无线频段并收发。', layer: 2, domain: 2, prereqs: ['d2'] },
  { id: 'em1', label: '无线协议', note: '让两端能「听懂」彼此的一整套约定。', layer: 2, domain: 2, prereqs: ['d2'] },
  { id: 'cs0', label: '算法', note: '让有限的算力产出有用的结果。', layer: 2, domain: 3, prereqs: ['d3'] },
  { id: 'cs1', label: '编译技术', note: '把人写的代码变成机器能执行的东西。', layer: 2, domain: 3, prereqs: ['d3'] },
  { id: 'mfg0', label: '光刻工艺', note: '把电路图案印到硅片上，尺寸决定了能放多少晶体管。', layer: 2, domain: 4, prereqs: ['d4'] },
  { id: 'mfg1', label: '封装工艺', note: '把芯片、存储与各种器件可靠地连成一体。', layer: 2, domain: 4, prereqs: ['d4'] },

  // L3 是关键：几乎每个模块都同时依赖不止一个方向的知识
  { id: 'chip', label: '半导体与芯片', note: '同时需要材料、光刻、薄膜与算法才能被设计出来。', layer: 3, domain: 0, prereqs: ['mat0', 'mfg0', 'mat1', 'cs0'] },
  { id: 'battery', label: '电池与储能', note: '电化学给出原理，材料决定容量，卷绕与涂布工艺把它做出来。', layer: 3, domain: 1, prereqs: ['chem0', 'chem1', 'd4'] },
  { id: 'radio', label: '无线通信模块', note: '射频电路负责收发，无线协议负责协作，薄膜材料做滤波器。', layer: 3, domain: 2, prereqs: ['em0', 'em1', 'mat1'] },
  { id: 'display', label: '屏幕与传感器', note: '薄膜与封装工艺之外，还需要芯片来驱动和读数。', layer: 3, domain: 4, prereqs: ['mat1', 'mfg1', 'chip'] },
  { id: 'os', label: '软件与操作系统', note: '算法与编译技术之上，还要芯片提供算力和存储抽象。', layer: 3, domain: 3, prereqs: ['cs0', 'cs1', 'chip'] },

  { id: 'phone', label: '智能手机', note: '五个方向、十几年积累，在一个小盒子里汇合。', layer: 4, domain: 2, prereqs: ['chip', 'battery', 'radio', 'display', 'os'] },

  { id: 'photo', label: '移动摄影', note: '屏幕、传感器与算法共同支撑的能力，没有它就没有手机上的摄像头。', layer: 5, domain: 4, prereqs: ['phone', 'display', 'os', 'chip'] },
  { id: 'map', label: '数字地图', note: '通信定位加上软件处理，把地图送到每个人手上。', layer: 5, domain: 2, prereqs: ['phone', 'radio', 'os', 'chip'] },
  { id: 'pay', label: '移动支付', note: '安全芯片与通信链路共同保证一次扣款。', layer: 5, domain: 0, prereqs: ['phone', 'chip', 'radio', 'os'] },
  { id: 'collab', label: '远程协作', note: '算力、通信与软件同时到位，工作方式随之改变。', layer: 5, domain: 3, prereqs: ['phone', 'chip', 'radio', 'os'] },
]

/** 跨领域、跨层的边：全片「树变成网络」的那一下就发生在这里 */
export const CROSS_EDGES: [string, string][] = [
  ['display', 'chip'],
  ['os', 'chip'],
  ['radio', 'mat1'],
  ['battery', 'd4'],
]

// 布局参数：五个方向各占一条竖直扇区，逐层向上。
// 好处是「树」的形状一眼可见（底窄上宽的五条线），
// 而跨领域的连线会明显地横穿过去 —— 这正是我们要展示的东西。
const SECTOR = 340
const ROW = 198
/** 手机机身有半屏高，应用那一层必须往上让开，否则正中间的数字地图会压在机身顶上。 */
const APP_CLEARANCE = 160
const LAYER_OF: Record<string, number> = {}

export function layoutNode(layer: number, domain: number, orderInLayer: number, countInLayer: number) {
  const y = -layer * ROW - (layer >= 5 ? APP_CLEARANCE : 0)
  const centre = (domain - 2) * SECTOR
  // 起点与智能手机收在正中：一个是唯一的源头，一个是全部汇聚的终点
  if (layer === 0 || layer === 4) return { x: 0, y }
  // 第二层每个方向有两条积累，左右分开形成锯齿，指向感更强
  if (layer === 2) {
    const offset = orderInLayer % 2 === 1 ? 0.5 : -0.5
    return { x: centre + offset * SECTOR * 0.52, y }
  }
  // 其余各层正好落在扇区中心
  void countInLayer
  return { x: centre, y }
}

export function buildKnowledgeGraph(): KnowledgeGraph {
  const nodes: KnowledgeNode[] = []
  const byId: Record<string, KnowledgeNode> = {}

  const byLayer = new Map<number, Spec[]>()
  for (const spec of SPECS) {
    const list = byLayer.get(spec.layer) ?? []
    list.push(spec)
    byLayer.set(spec.layer, list)
  }

  // 同一层里按方向排序，让相邻的两个节点落在同一个扇区，视觉上成束
  for (const list of byLayer.values()) list.sort((a, b) => a.domain - b.domain || a.id.localeCompare(b.id))

  const layerLists: KnowledgeNode[][] = []
  for (const layer of [...byLayer.keys()].sort((a, b) => a - b)) {
    const list = byLayer.get(layer) as Spec[]
    const out: KnowledgeNode[] = []
    list.forEach((spec, i) => {
      const spot = layoutNode(spec.layer, spec.domain, i, list.length)
      const node: KnowledgeNode = {
        id: spec.id,
        label: spec.label,
        note: spec.note,
        x: spot.x,
        y: spot.y,
        layer: spec.layer,
        domain: spec.domain,
        prereqs: spec.prereqs.filter((p) => SPECS.some((s) => s.id === p)),
        unlocks: [],
        origin: 'branch',
        appear: 0,
      }
      out.push(node)
      nodes.push(node)
      byId[node.id] = node
      LAYER_OF[node.id] = spec.layer
    })
    layerLists[layer] = out
  }

  // 出场顺序：按层由早到晚，同层内按扇区从左到右
  // 边的出现时间 = 两端都出现之后一点点，于是「先有节点，再连线」永远成立
  const order = layerLists.flat()
  const last = Math.max(1, order.length - 1)
  order.forEach((node, i) => {
    node.appear = i / last
    for (const p of node.prereqs) byId[p].unlocks.push(node.id)
  })

  const edges: KnowledgeEdge[] = []
  for (const node of nodes) {
    node.prereqs.forEach((from, i) => {
      const isCross = i > 0 || CROSS_EDGES.some(([a, b]) => a === node.id && b === from)
      edges.push({
        from,
        to: node.id,
        kind: isCross ? 'merge' : 'branch',
        appear: Math.max(byId[from].appear, node.appear) + 0.025,
      })
    })
  }

  let bounds = EMPTY_BOUNDS
  for (const n of nodes) bounds = growBounds(bounds, n.x, n.y, 96)

  return { nodes, edges, byId, layers: layerLists, phoneParts: PHONE_PARTS.slice(), apps: APP_IDS.slice(), bounds }
}

/** 最深的一层：讲课时用来确认版面还够用 */
export function computeMaxLevel(): number {
  return Math.max(...buildKnowledgeGraph().nodes.map((n) => n.layer))
}
