import type { Task, TaskStage } from '@/types/task'
import { STAGE_META } from '@/types/task'
import { inRange, todayStr } from '@/lib/dateUtils'

/** 按开始日期排序的阶段列表 */
export function sortedStages(task: Task): TaskStage[] {
  if (!task.stages?.length) return []
  return [...task.stages].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** 由阶段推算整体周期 */
export function spanFromStages(stages: TaskStage[]): { startDate: string; endDate: string } | null {
  if (!stages.length) return null
  const sorted = [...stages].sort((a, b) => a.startDate.localeCompare(b.startDate))
  return {
    startDate: sorted[0].startDate,
    endDate: sorted.reduce((max, s) => (s.endDate > max ? s.endDate : max), sorted[0].endDate),
  }
}

/** 当前所处阶段（今天落在阶段周期内）；否则取下一个未开始的阶段 */
export function currentStage(task: Task, today = todayStr()): TaskStage | null {
  const stages = sortedStages(task)
  if (!stages.length) return null
  const cur = stages.find((s) => inRange(today, s.startDate, s.endDate))
  if (cur) return cur
  return stages.find((s) => s.startDate > today) ?? null
}

/** 阶段进度：已完成阶段数 / 总阶段数 */
export function stageProgress(task: Task): { done: number; total: number } {
  const stages = sortedStages(task)
  return { done: stages.filter((s) => s.done).length, total: stages.length }
}

export function stageLabel(key: TaskStage['key']): string {
  return STAGE_META[key].label
}
