import { useMemo, useRef, useEffect } from 'react'
import type { Task } from '@/types/task'
import { URGENCY_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { addDays, diffDays, parseDate, todayStr, weekdayCN } from '@/lib/dateUtils'

interface Props {
  tasks: Task[]
  onToggle: (id: string) => void
}

const DAY_W = 34 // 每天宽度 px
const NAME_W = 104 // 左侧任务名列宽

export default function GanttView({ tasks, onToggle }: Props) {
  const today = todayStr()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { days, groups, minDate } = useMemo(() => {
    const active = [...tasks].sort((a, b) => a.project.localeCompare(b.project) || a.startDate.localeCompare(b.startDate))
    let min = addDays(today, -2)
    let max = addDays(today, 13)
    for (const t of active) {
      if (t.startDate < min) min = t.startDate
      if (t.endDate > max) max = t.endDate
    }
    if (diffDays(min, max) > 60) min = addDays(max, -60)
    const days: string[] = []
    let d = min
    while (d <= max) {
      days.push(d)
      d = addDays(d, 1)
    }
    const groups: { project: string; tasks: Task[] }[] = []
    for (const t of active) {
      const g = groups.find((x) => x.project === t.project)
      if (g) g.tasks.push(t)
      else groups.push({ project: t.project, tasks: [t] })
    }
    return { days, groups, minDate: min }
  }, [tasks, today])

  // 初次渲染滚动到今天附近
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      const offset = diffDays(minDate, today) * DAY_W - el.clientWidth / 3
      el.scrollLeft = Math.max(0, offset)
    }
  }, [minDate, today])

  const todayIdx = diffDays(minDate, today)

  return (
    <div className="px-4 pb-28">
      <div className="pt-5 pb-3">
        <h1 className="text-2xl font-bold text-gray-900">甘特图</h1>
        <div className="text-sm text-gray-500 mt-1">按项目分组，横轴为时间，左右滑动查看</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <div style={{ width: NAME_W + days.length * DAY_W }} className="relative">
            {/* 表头：日期轴 */}
            <div className="flex sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="shrink-0 sticky left-0 bg-white z-20 border-r border-gray-100 px-2 py-2 text-xs text-gray-400" style={{ width: NAME_W }}>
                任务 / 日期
              </div>
              {days.map((d) => {
                const isToday = d === today
                const dd = parseDate(d)
                return (
                  <div key={d} className={`shrink-0 text-center py-1 ${isToday ? 'bg-blue-50' : ''}`} style={{ width: DAY_W }}>
                    <div className={`text-[10px] ${isToday ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                      {dd.getMonth() + 1}/{dd.getDate()}
                    </div>
                    <div className={`text-[10px] ${isToday ? 'text-blue-600 font-bold' : 'text-gray-300'}`}>{weekdayCN(d)}</div>
                  </div>
                )
              })}
            </div>

            {/* 今天竖线 */}
            <div
              className="absolute top-0 bottom-0 w-px bg-blue-400 z-[5] pointer-events-none"
              style={{ left: NAME_W + todayIdx * DAY_W + DAY_W / 2 }}
            />

            {groups.map((g) => (
              <div key={g.project}>
                <div className="flex bg-gray-50 border-b border-gray-100">
                  <div className="sticky left-0 z-20 shrink-0 bg-gray-50 px-2 py-1.5 text-xs font-semibold text-gray-600 border-r border-gray-100" style={{ width: NAME_W }}>
                    📁 {g.project}
                  </div>
                  <div style={{ width: days.length * DAY_W }} />
                </div>
                {g.tasks.map((t) => {
                  const meta = URGENCY_META[urgencyOf(t)]
                  const startIdx = Math.max(0, diffDays(minDate, t.startDate))
                  const span = Math.max(1, diffDays(t.startDate, t.endDate) + 1)
                  return (
                    <button key={t.id} onClick={() => onToggle(t.id)} className="flex w-full border-b border-gray-50 text-left">
                      <div className={`sticky left-0 z-20 shrink-0 bg-white px-2 py-2.5 border-r border-gray-100 ${t.done ? 'opacity-50' : ''}`} style={{ width: NAME_W }}>
                        <div className={`text-xs leading-tight line-clamp-2 ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {t.title}
                        </div>
                      </div>
                      <div className="relative h-11 shrink-0" style={{ width: days.length * DAY_W }}>
                        {/* 周末底纹 */}
                        {days.map((d, i) => {
                          const wd = parseDate(d).getDay()
                          if (wd !== 0 && wd !== 6) return null
                          return <div key={d} className="absolute top-0 bottom-0 bg-gray-50" style={{ left: i * DAY_W, width: DAY_W }} />
                        })}
                        {/* 任务条 */}
                        <div
                          className={`absolute top-2 h-7 rounded-full ${meta.bar} ${t.done ? 'opacity-50' : 'shadow-sm'} flex items-center px-2 overflow-hidden`}
                          style={{ left: startIdx * DAY_W + 2, width: span * DAY_W - 4 }}
                        >
                          <span className="text-[10px] text-white font-medium whitespace-nowrap">
                            {span > 2 ? `${t.endDate.slice(5)} 止` : ''}
                          </span>
                        </div>
                        {/* 节点标记 */}
                        <div
                          className={`absolute top-1.5 w-2 h-2 rounded-full border-2 border-white ${meta.dot}`}
                          style={{ left: (startIdx + span - 1) * DAY_W + DAY_W / 2 - 4 }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}

            {tasks.length === 0 && <div className="text-center text-sm text-gray-300 py-10">暂无任务，点右下角 + 添加</div>}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        {(['red', 'yellow', 'green', 'done'] as const).map((u) => (
          <span key={u} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${URGENCY_META[u].dot}`} />
            {URGENCY_META[u].label}
          </span>
        ))}
      </div>
    </div>
  )
}
