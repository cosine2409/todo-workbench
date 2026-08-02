import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExternalItem, Task, Urgency } from '@/types/task'
import { diffDays, todayStr } from '@/lib/dateUtils'

const KEY = 'todo-workbench.tasks.v1'
/** 一次性清理标记：v2 版本上线时清空所有已完成条目（此后完成的进归档页，不再自动删） */
const PURGE_KEY = 'todo-workbench.purged-done.v2'

/** 紧急程度：已完成灰 / 特别紧急红（逾期、明天内到期或手动标记）/ 紧张黄（3天内）/ 充裕绿 */
export function urgencyOf(t: Task, today = todayStr()): Urgency {
  if (t.done) return 'done'
  const left = diffDays(today, t.endDate)
  if (t.urgent || left <= 1) return 'red'
  if (left <= 3) return 'yellow'
  return 'green'
}

function seed(): Task[] {
  const today = todayStr()
  const plus = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${d.getMonth() + 1 < 10 ? '0' : ''}${d.getMonth() + 1}-${d.getDate() < 10 ? '0' : ''}${d.getDate()}`
  }
  return [
    { id: 's1', title: '回复客户合同条款修改意见', project: '合同项目', startDate: today, endDate: today, timeHint: '18:00', urgent: true, done: false, createdAt: Date.now() - 4000 },
    { id: 's2', title: '完成产品需求文档初稿', project: '产品迭代', startDate: today, endDate: plus(2), urgent: false, done: false, createdAt: Date.now() - 3000 },
    { id: 's3', title: '季度汇报 PPT 制作', project: '季度汇报', startDate: plus(1), endDate: plus(6), urgent: false, done: false, createdAt: Date.now() - 2000 },
    { id: 's4', title: '团队周会纪要整理归档', project: '日常', startDate: plus(-1), endDate: plus(-1), urgent: false, done: true, createdAt: Date.now() - 1000 },
    { id: 's5', title: '新版官网视觉走查', project: '产品迭代', startDate: plus(2), endDate: plus(8), urgent: false, done: false, createdAt: Date.now() - 500 },
  ]
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as Task[]
    } catch {
      /* ignore */
    }
    const s = seed()
    localStorage.setItem(KEY, JSON.stringify(s))
    return s
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(tasks))
  }, [tasks])

  // 一次性清理：删除升级前遗留的所有已完成条目（含飞书同步的过期条目）
  useEffect(() => {
    if (localStorage.getItem(PURGE_KEY)) return
    localStorage.setItem(PURGE_KEY, '1')
    setTasks((prev) => (prev.some((t) => t.done) ? prev.filter((t) => !t.done) : prev))
  }, [])

  // 启动时合并外部同步数据（飞书）：只新增未见过的 externalId，已有条目不更新，以本地数据为准
  const syncedRef = useRef(false)
  useEffect(() => {
    if (syncedRef.current) return
    syncedRef.current = true
    fetch('data/feishu-tasks.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: ExternalItem[] } | null) => {
        if (!data?.items?.length) return
        setTasks((prev) => {
          const known = new Set(prev.map((t) => t.externalId).filter(Boolean))
          const fresh = data.items!.filter((it) => it.externalId && !known.has(it.externalId))
          if (fresh.length === 0) return prev
          const today = todayStr()
          const added: Task[] = fresh.map((it, i) => {
            const stages = it.stages?.length
              ? [...it.stages].sort((a, b) => a.startDate.localeCompare(b.startDate))
              : undefined
            const span = stages?.length
              ? {
                  startDate: stages[0].startDate,
                  endDate: stages.reduce((max, s) => (s.endDate > max ? s.endDate : max), stages[0].endDate),
                }
              : null
            return {
              id: `ext-${it.externalId}`,
              title: it.title,
              project: it.project || '飞书同步',
              startDate: span?.startDate ?? it.startDate ?? today,
              endDate: span?.endDate ?? it.endDate ?? it.startDate ?? today,
              timeHint: it.timeHint,
              urgent: it.urgent ?? false,
              done: it.done ?? false,
              createdAt: Date.now() + i,
              source: 'feishu' as const,
              externalId: it.externalId,
              stages,
            }
          })
          return [...added, ...prev]
        })
      })
      .catch(() => {
        /* 无外部数据文件时静默跳过 */
      })
  }, [])

  const addTask = useCallback((t: Omit<Task, 'id' | 'createdAt' | 'done'> & { done?: boolean }) => {
    setTasks((prev) => [
      { ...t, done: t.done ?? false, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() },
      ...prev,
    ])
  }, [])

  const toggleDone = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<Omit<Task, 'id'>>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 跨标签页 / 跨窗口同步：其他页面改动 localStorage 后，本页立即跟上
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        const incoming = JSON.parse(e.newValue) as Task[]
        setTasks((prev) => (JSON.stringify(prev) === e.newValue ? prev : incoming))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { tasks, addTask, toggleDone, updateTask, removeTask }
}
