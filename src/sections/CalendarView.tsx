import { useMemo, useState } from 'react'
import type { Task } from '@/types/task'
import { URGENCY_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { fmt, inRange, mdLabel, pad, parseDate, todayStr, weekdayCN } from '@/lib/dateUtils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  tasks: Task[]
  onToggle: (id: string) => void
}

const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六']

export default function CalendarView({ tasks, onToggle }: Props) {
  const today = todayStr()
  const [cursor, setCursor] = useState(() => {
    const d = parseDate(today)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(today)

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const startOffset = first.getDay()
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const list: (string | null)[] = []
    for (let i = 0; i < startOffset; i++) list.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(d)}`)
    }
    while (list.length % 7 !== 0) list.push(null)
    return list
  }, [cursor])

  /** 每天的任务节点：截止日当天为主节点，周期内为延续 */
  const dayInfo = useMemo(() => {
    const map: Record<string, { dots: string[]; count: number }> = {}
    for (const t of tasks) {
      const u = urgencyOf(t)
      const meta = URGENCY_META[u]
      // 节点日（截止日）
      const node = map[t.endDate] ?? { dots: [], count: 0 }
      node.dots.push(meta.dot)
      node.count++
      map[t.endDate] = node
      // 周期延续日
      if (t.startDate !== t.endDate) {
        let d = t.startDate
        let guard = 0
        while (d < t.endDate && guard++ < 370) {
          const m = map[d] ?? { dots: [], count: 0 }
          m.dots.push(t.done ? 'bg-gray-300' : 'bg-gray-300')
          map[d] = m
          const nd = parseDate(d)
          nd.setDate(nd.getDate() + 1)
          d = fmt(nd)
        }
      }
    }
    return map
  }, [tasks])

  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((t) => inRange(selected, t.startDate, t.endDate))
        .sort((a, b) => Number(a.done) - Number(b.done) || a.endDate.localeCompare(b.endDate)),
    [tasks, selected],
  )

  const shiftMonth = (n: number) => {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() + n)
    setCursor(d)
  }

  return (
    <div className="px-4 pb-28">
      <div className="pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">日历</h1>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-full active:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold min-w-[88px] text-center">
            {cursor.getFullYear()}年{cursor.getMonth() + 1}月
          </span>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-full active:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
        {WEEK_HEAD.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const info = dayInfo[day]
          const isToday = day === today
          const isSel = day === selected
          return (
            <button
              key={day}
              onClick={() => setSelected(day)}
              className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                isSel ? 'bg-gray-900 text-white' : isToday ? 'bg-gray-100' : 'active:bg-gray-50'
              }`}
            >
              <span className={`text-[15px] ${isSel ? 'font-semibold' : ''} ${isToday && !isSel ? 'text-blue-600 font-semibold' : ''}`}>
                {Number(day.slice(8))}
              </span>
              <span className="flex gap-0.5 h-1.5 mt-0.5">
                {info?.dots.slice(0, 3).map((c, j) => (
                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/80' : c}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          {mdLabel(selected)} 周{weekdayCN(selected)} · {selectedTasks.length} 项
        </div>
        {selectedTasks.length === 0 ? (
          <div className="text-sm text-gray-300 text-center py-6">这一天没有任务节点</div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map((t) => {
              const meta = URGENCY_META[urgencyOf(t)]
              const isNode = t.endDate === selected
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 ${meta.soft} ${t.done ? 'opacity-60' : ''}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${t.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {t.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t.project} · {isNode ? '节点日' : '进行中'}
                      {t.timeHint ? ` · ${t.timeHint}` : ''}
                    </div>
                  </div>
                  <span className={`text-xs ${meta.text}`}>{meta.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
