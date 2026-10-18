/**
 * 碳与硅：真实数据，不是编出来的设定。
 *
 * 这一幕最容易犯的错是把两种原子说成「可以一比一替换」。
 * 事实是：它们同属第 14 族、都有 4 个价电子、都能形成四个共价键，
 * 这是相似性；但硅的原子更大、3p 轨道更弥散，成键更长更弱、很难形成稳定的 π 键，
 * 于是硅的化学与碳的化学完全不是一回事。这些差别就摆在这里。
 */

export interface ElementData {
  symbol: string
  name: string
  atomicNumber: number
  protons: number
  neutrons: number
  electrons: number
  /** 各电子层的电子数 */
  shells: number[]
  valence: number
  /** 共价半径（皮米） */
  covalentRadiusPm: number
  /** 同核单键键长（皮米） */
  homonuclearBondPm: number
  /** 同核单键键能（千焦每摩尔） */
  homonuclearBondKJ: number
  color: string
}

export const CARBON: ElementData = {
  symbol: 'C',
  name: '碳',
  atomicNumber: 6,
  protons: 6,
  neutrons: 6,
  electrons: 6,
  shells: [2, 4],
  valence: 4,
  covalentRadiusPm: 76,
  homonuclearBondPm: 154,
  homonuclearBondKJ: 348,
  color: '#7fe3c4',
}

export const SILICON: ElementData = {
  symbol: 'Si',
  name: '硅',
  atomicNumber: 14,
  protons: 14,
  neutrons: 14,
  electrons: 14,
  shells: [2, 8, 4],
  valence: 4,
  covalentRadiusPm: 111,
  homonuclearBondPm: 235,
  homonuclearBondKJ: 226,
  color: '#9fb6ff',
}

export interface ElementComparison {
  label: string
  carbon: string
  silicon: string
  /** 这一条对假想硅基生命意味着什么 */
  meaning: string
  /** 相似还是不同 */
  same: boolean
}

export const ELEMENT_COMPARISON: readonly ElementComparison[] = [
  {
    label: '原子序数 / 核电荷',
    carbon: '6',
    silicon: '14',
    meaning: '元素本身就不同，这一点不存在「替换」的说法。',
    same: false,
  },
  {
    label: '电子排布',
    carbon: '2, 4',
    silicon: '2, 8, 4',
    meaning: '最外层都是 4 个价电子，所以两者都能形成四个共价键。',
    same: true,
  },
  {
    label: '同核单键键长',
    carbon: '154 pm',
    silicon: '235 pm',
    meaning: '硅的原子更大，键明显更长，长键更容易绕动、也更容易断。',
    same: false,
  },
  {
    label: '同核单键键能',
    carbon: '348 kJ/mol',
    silicon: '226 kJ/mol',
    meaning: '硅—硅键更弱。要维持同样复杂的骨架，硅需要别的办法。',
    same: false,
  },
  {
    label: '与氧的结合',
    carbon: 'CO2 是独立分子',
    silicon: 'SiO2 是三维网络',
    meaning: '硅的二氧化物没有独立分子，而是连成整体的固体网络 —— 这是最要命的一处不同。',
    same: false,
  },
]

export interface MoleculeAtom {
  element: 'C' | 'Si' | 'O' | 'H'
  x: number
  y: number
  /** z 用来表现四面体的立体感 */
  z?: number
}

export interface MoleculeData {
  id: string
  name: string
  formula: string
  shape: 'tetrahedral' | 'linear' | 'network'
  atoms: MoleculeAtom[]
  bonds: Array<[number, number]>
  note: string
}

/** 甲烷与硅烷：几何上都是正四面体，这是最直接的一处相似 */
export const METHANE: MoleculeData = {
  id: 'ch4',
  name: '甲烷',
  formula: 'CH4',
  shape: 'tetrahedral',
  atoms: [
    { element: 'C', x: 0, y: 0, z: 0 },
    { element: 'H', x: -1, y: -1, z: 0.45 },
    { element: 'H', x: 1, y: -1, z: -0.45 },
    { element: 'H', x: -1, y: 1, z: -0.45 },
    { element: 'H', x: 1, y: 1, z: 0.45 },
  ],
  bonds: [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  note: '碳居中，四个氢指向正四面体的四个角。',
}

export const SILANE: MoleculeData = {
  id: 'sih4',
  name: '硅烷',
  formula: 'SiH4',
  shape: 'tetrahedral',
  atoms: [
    { element: 'Si', x: 0, y: 0, z: 0 },
    { element: 'H', x: -1, y: -1, z: 0.45 },
    { element: 'H', x: 1, y: -1, z: -0.45 },
    { element: 'H', x: -1, y: 1, z: -0.45 },
    { element: 'H', x: 1, y: 1, z: 0.45 },
  ],
  bonds: [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  note: '几何形状与甲烷一模一样 —— 相似性到此为止。',
}

/** 二氧化碳：一个独立的小分子，可以整体在气体里飘 */
export const CARBON_DIOXIDE: MoleculeData = {
  id: 'co2',
  name: '二氧化碳',
  formula: 'CO2',
  shape: 'linear',
  atoms: [
    { element: 'O', x: -1, y: 0 },
    { element: 'C', x: 0, y: 0 },
    { element: 'O', x: 1, y: 0 },
  ],
  bonds: [
    [1, 0],
    [1, 2],
  ],
  note: '碳与两个氧以双键结合，三个原子是一条直线，是一个能整体移动的独立分子。',
}

/** 二氧化硅：没有独立分子，每个硅被四个氧包围，氧又把硅连起来，织成三维网络 */
export const SILICON_DIOXIDE: MoleculeData = {
  id: 'sio2',
  name: '二氧化硅',
  formula: 'SiO2',
  shape: 'network',
  atoms: [
    { element: 'Si', x: 0, y: 0 },
    { element: 'O', x: -1, y: -0.5 },
    { element: 'O', x: 1, y: -0.5 },
    { element: 'O', x: -1, y: 0.5 },
    { element: 'O', x: 1, y: 0.5 },
    { element: 'Si', x: 2, y: 0 },
    { element: 'Si', x: -2, y: 0 },
    { element: 'O', x: -1, y: -1.5 },
    { element: 'O', x: 1, y: 1.5 },
    { element: 'O', x: 1, y: -1.5 },
    { element: 'O', x: -1, y: 1.5 },
  ],
  bonds: [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [5, 2],
    [5, 4],
    [6, 1],
    [6, 3],
    [0, 7],
    [5, 8],
    [0, 9],
    [5, 10],
  ],
  note: '氧原子把硅原子一个接一个连起来，形成没有终点、也没有独立分子的三维网络。',
}

export const MOLECULES: readonly MoleculeData[] = [METHANE, SILANE, CARBON_DIOXIDE, SILICON_DIOXIDE]

export const ELEMENT_COLOR: Record<string, string> = {
  C: CARBON.color,
  Si: SILICON.color,
  O: '#ffcf8a',
  H: '#d7e3f2',
}
