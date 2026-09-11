import type { Task } from '@/types/task'

/**
 * 云端同步配置（Supabase PostgREST）。
 * url / anonKey 在建好云端项目后填入；anonKey 是设计上可公开的匿名 Key，
 * 数据空间由「同步码」隔离：知道同步码即可读写该空间，请勿分享给无关人员。
 */
export const SYNC_CONF = {
  url: 'https://fomkorvduqsfuxobffym.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvbWtvcnZkdXFzZnV4b2JmZnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTUyMTYsImV4cCI6MjEwNDYzMTIxNn0.K4MQSlAR0XD4lFuSbmOvQlX4vLk1dId7Z-cO7-0u5ZQ',
  table: 'kv',
}

export const SYNC_ENABLED = !!SYNC_CONF.url && !!SYNC_CONF.anonKey

const SPACE_KEY = 'todo-workbench.sync.space'

export function getSpace(): string | null {
  try {
    return localStorage.getItem(SPACE_KEY)
  } catch {
    return null
  }
}

export function saveSpace(code: string | null) {
  try {
    if (code) localStorage.setItem(SPACE_KEY, code)
    else localStorage.removeItem(SPACE_KEY)
  } catch {
    /* ignore */
  }
}

/** 云端存储的完整状态：整份任务数组 + 最后修改时间戳（新者胜） */
export interface CloudState {
  tasks: Task[]
  updatedAt: number
}

/** 生成易读易输的同步码，如 wuma-k7p2x9 */
export function newSpaceCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `wuma-${s}`
}

function headers() {
  return {
    apikey: SYNC_CONF.anonKey,
    Authorization: `Bearer ${SYNC_CONF.anonKey}`,
  }
}

export async function cloudGet(space: string): Promise<CloudState | null> {
  const r = await fetch(
    `${SYNC_CONF.url}/rest/v1/${SYNC_CONF.table}?space=eq.${encodeURIComponent(space)}&select=state`,
    { headers: headers(), cache: 'no-store' },
  )
  if (!r.ok) throw new Error(`cloud get ${r.status}`)
  const rows = (await r.json()) as { state: CloudState }[]
  return rows?.[0]?.state ?? null
}

export async function cloudPut(space: string, state: CloudState): Promise<void> {
  const r = await fetch(`${SYNC_CONF.url}/rest/v1/${SYNC_CONF.table}`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ space, state }),
  })
  if (!r.ok) throw new Error(`cloud put ${r.status}`)
}
