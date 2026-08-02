/** 阶段：脚本 / 拍摄 / 后期 */
export type StageKey = 'script' | 'shoot' | 'post'

export interface TaskStage {
  key: StageKey
  /** 阶段开始 YYYY-MM-DD */
  startDate: string
  /** 阶段截止 YYYY-MM-DD */
  endDate: string
  /** 该阶段是否已完成 */
  done?: boolean
}

export interface Task {
  id: string
  /** 事项标题 */
  title: string
  /** 所属项目，用于甘特图分组 */
  project: string
  /** 开始日期 YYYY-MM-DD（有阶段时为各阶段最早开始） */
  startDate: string
  /** 截止/结束日期 YYYY-MM-DD（有阶段时为各阶段最晚截止） */
  endDate: string
  /** 可选时间点，如 "15:00" */
  timeHint?: string
  /** 用户标记或解析出的"特别紧急" */
  urgent: boolean
  done: boolean
  createdAt: number
  note?: string
  /** 外部来源（如飞书同步） */
  source?: 'feishu'
  /** 外部条目唯一 ID，用于去重：已存在的不更新、只加新条目 */
  externalId?: string
  /** 阶段列表（脚本/拍摄/后期），为空表示未拆分阶段 */
  stages?: TaskStage[]
}

/** 外部同步文件（data/feishu-tasks.json）的条目结构 */
export interface ExternalItem {
  externalId: string
  title: string
  project?: string
  startDate?: string
  endDate?: string
  timeHint?: string
  urgent?: boolean
  done?: boolean
  stages?: TaskStage[]
}

/** 阶段配色（与紧急度红黄绿区分）：脚本蓝 / 拍摄橙 / 后期紫 */
export const STAGE_META: Record<StageKey, { label: string; bar: string; dot: string; text: string; soft: string }> = {
  script: { label: '脚本', bar: 'bg-sky-500', dot: 'bg-sky-500', text: 'text-sky-600', soft: 'bg-sky-50 border-sky-200' },
  shoot: { label: '拍摄', bar: 'bg-orange-500', dot: 'bg-orange-500', text: 'text-orange-600', soft: 'bg-orange-50 border-orange-200' },
  post: { label: '后期', bar: 'bg-violet-500', dot: 'bg-violet-500', text: 'text-violet-600', soft: 'bg-violet-50 border-violet-200' },
}

/** 紧急程度：done=已完成灰 / red=特别紧急 / yellow=时间紧张 / green=时间充裕 */
export type Urgency = 'done' | 'red' | 'yellow' | 'green'

export const URGENCY_META: Record<
  Urgency,
  { label: string; dot: string; bar: string; soft: string; text: string; ring: string }
> = {
  red: {
    label: '特别紧急',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    soft: 'bg-red-50 border-red-200',
    text: 'text-red-600',
    ring: 'border-red-500',
  },
  yellow: {
    label: '时间紧张',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
    soft: 'bg-amber-50 border-amber-200',
    text: 'text-amber-600',
    ring: 'border-amber-400',
  },
  green: {
    label: '时间充裕',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-600',
    ring: 'border-emerald-500',
  },
  done: {
    label: '已完成',
    dot: 'bg-gray-400',
    bar: 'bg-gray-400',
    soft: 'bg-gray-50 border-gray-200',
    text: 'text-gray-400',
    ring: 'border-gray-400',
  },
}
