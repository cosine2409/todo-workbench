import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExternalItem, Task, Urgency } from '@/types/task'
import { diffDays, todayStr } from '@/lib/dateUtils'
import { SYNC_ENABLED, cloudGet, cloudPut, getSpace, newSpaceCode, saveSpace } from '@/lib/sync'

const KEY = 'todo-workbench.tasks.v1'
/** 一次性清理标记：v2 版本上线时清空所有已完成条目（此后完成的进归档页，不再自动删） */
const PURGE_KEY = 'todo-workbench.purged-done.v2'
/** 本地状态最后修改时间戳（用于云端新旧比较） */
const TS_KEY = 'todo-workbench.state.updatedAt'
/** 同步规则版本：v2 起首次拉取无条件以云端为准（避免修复前被污染的时间戳把旧数据推回云端） */
const EPOCH_KEY = 'todo-workbench.sync.v2'
/** 已删除的外部来源条目（飞书）墓碑：合并时跳过，防止删除后又被同步源灌回来 */
const DEL_EXT_KEY = 'todo-workbench.deleted-externals'

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error'

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

  // 已删除的外部条目墓碑（跨设备共享，防止飞书同步源把已删条目灌回来）
  const [delExt, setDelExt] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(DEL_EXT_KEY) || '[]') as string[]
    } catch {
      return []
    }
  })
  const delExtRef = useRef(delExt)
  delExtRef.current = delExt
  useEffect(() => {
    localStorage.setItem(DEL_EXT_KEY, JSON.stringify(delExt))
  }, [delExt])

  // 记录"真实本地修改"的时间；单纯打开应用/云端下发都不算本地修改
  const firstPersist = useRef(true)
  const dirtyRef = useRef(false) // 只有真实本地编辑才允许推送（打开应用绝不主动推）
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(tasks))
    // 首次挂载只是加载缓存，不算本地修改（否则旧数据会被误判为最新并覆盖云端）
    if (firstPersist.current) {
      firstPersist.current = false
      return
    }
    // 云端下发的数据不重算时间戳（否则会反过来覆盖云端）
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    const ts = Date.now()
    localStorage.setItem(TS_KEY, String(ts))
    dirtyRef.current = true
    setUpdatedAt(ts)
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
          const tombstoned = new Set(delExtRef.current)
          const fresh = data.items!.filter((it) => it.externalId && !known.has(it.externalId) && !tombstoned.has(it.externalId))
          // 已有条目不更新（以本地数据为准），唯一例外：本地没有阶段信息而外部有，只补填阶段
          const extStages = new Map(
            data.items!.filter((it) => it.externalId && it.stages?.length).map((it) => [it.externalId, it.stages!]),
          )
          let patched = false
          const withStages = prev.map((t) => {
            if (t.externalId && !t.stages?.length && extStages.has(t.externalId)) {
              patched = true
              return { ...t, stages: [...extStages.get(t.externalId)!].sort((a, b) => a.startDate.localeCompare(b.startDate)) }
            }
            return t
          })
          if (fresh.length === 0) return patched ? withStages : prev
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
          return [...added, ...withStages]
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

  /** 记录今日进度：note 为空字符串表示撤销今天的记录 */
  const logProgress = useCallback((id: string, note: string) => {
    const today = todayStr()
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const progress = { ...(t.progress ?? {}) }
        if (note.trim()) progress[today] = note.trim()
        else delete progress[today]
        return { ...t, progress }
      }),
    )
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const victim = prev.find((t) => t.id === id)
      // 外部来源（飞书）条目删除后记录墓碑，防止下次合并时被重新灌入
      if (victim?.externalId) {
        setDelExt((d) => (d.includes(victim.externalId!) ? d : [...d, victim.externalId!]))
      }
      return prev.filter((t) => t.id !== id)
    })
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

  // ---------------- 云端同步（Supabase，整份状态新者胜） ----------------
  const [updatedAt, setUpdatedAt] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(TS_KEY) || 0)
    } catch {
      return 0
    }
  })
  const [space, setSpace] = useState<string | null>(() => getSpace())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(space && SYNC_ENABLED ? 'idle' : 'off')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)

  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const updatedAtRef = useRef(updatedAt)
  updatedAtRef.current = updatedAt
  const spaceRef = useRef(space)
  spaceRef.current = space
  const applyingRemote = useRef(false)
  const pullingRef = useRef(false)

  /** 从云端拉取：云端更新则覆盖本地；云端为空或更旧则把本地推上去 */
  const pull = useCallback(async () => {
    const sp = spaceRef.current
    if (!SYNC_ENABLED || !sp || pullingRef.current) return
    pullingRef.current = true
    setSyncStatus('syncing')
    try {
      // v2 规则升级后的首次拉取：云端有数据就无条件以云端为准，防止旧时间戳污染
      const firstSync = !localStorage.getItem(EPOCH_KEY)
      const cloud = await cloudGet(sp)
      // 合并墓碑（任何一端删除的外部条目，所有端都不再导入）
      const tombstones = [...new Set([...delExtRef.current, ...(cloud?.deletedExternals ?? [])])]
      if (tombstones.length !== delExtRef.current.length) setDelExt(tombstones)
      const payload = () => ({
        tasks: tasksRef.current.filter((t) => !t.externalId || !tombstones.includes(t.externalId)),
        updatedAt: updatedAtRef.current,
        deletedExternals: tombstones,
      })
      if (!cloud) {
        await cloudPut(sp, payload())
      } else if (firstSync || cloud.updatedAt > updatedAtRef.current) {
        applyingRemote.current = true
        localStorage.setItem(TS_KEY, String(cloud.updatedAt))
        setUpdatedAt(cloud.updatedAt)
        setTasks(cloud.tasks.filter((t) => !t.externalId || !tombstones.includes(t.externalId)))
      } else if (cloud.updatedAt < updatedAtRef.current) {
        await cloudPut(sp, payload())
      }
      localStorage.setItem(EPOCH_KEY, '1')
      setSyncStatus('idle')
      setLastSyncAt(Date.now())
    } catch {
      setSyncStatus('error')
    } finally {
      pullingRef.current = false
    }
  }, [])

  // 本地真实改动后 1.5s 防抖推送到云端（打开应用不会触发：dirtyRef 把关）
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!SYNC_ENABLED || !space || updatedAt === 0 || !dirtyRef.current) return
    dirtyRef.current = false
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      try {
        setSyncStatus('syncing')
        await cloudPut(space, {
          tasks: tasksRef.current.filter((t) => !t.externalId || !delExtRef.current.includes(t.externalId)),
          updatedAt,
          deletedExternals: delExtRef.current,
        })
        setSyncStatus('idle')
        setLastSyncAt(Date.now())
      } catch {
        setSyncStatus('error')
      }
    }, 1500)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [updatedAt, space])

  // 进入空间后：立即拉一次，之后每 30s 轮询 + 页面回到前台时拉取
  useEffect(() => {
    if (!SYNC_ENABLED || !space) return
    pull()
    const iv = setInterval(pull, 30000)
    const onVis = () => {
      if (document.visibilityState === 'visible') pull()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [space, pull])

  /** 创建新同步空间：生成同步码并把当前本地数据上传 */
  const createSpace = useCallback(() => {
    const code = newSpaceCode()
    saveSpace(code)
    setSpace(code)
    return code
  }, [])

  /** 加入已有空间：若云端数据更新，将以云端为准 */
  const joinSpace = useCallback((code: string) => {
    const c = code.trim().toLowerCase()
    if (!c) return
    saveSpace(c)
    setSpace(c)
  }, [])

  /** 退出同步（数据保留在本机，不再上传） */
  const leaveSpace = useCallback(() => {
    saveSpace(null)
    setSpace(null)
    setSyncStatus('off')
  }, [])

  return {
    tasks,
    addTask,
    toggleDone,
    updateTask,
    logProgress,
    removeTask,
    sync: {
      enabled: SYNC_ENABLED,
      space,
      status: syncStatus,
      lastSyncAt,
      createSpace,
      joinSpace,
      leaveSpace,
      syncNow: pull,
    },
  }
}
