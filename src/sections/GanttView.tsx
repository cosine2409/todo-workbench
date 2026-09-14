import { useMemo, useRef, useEffect } from 'react'
import type { Task } from '@/types/task'
import { URGENCY_META, STAGE_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { sortedStages, stageProgress } from '@/lib/stages'
import { addDays, diffDays, parseDate, todayStr, weekdayCN } from '@/lib/dateUtils'

interface Props {
  tasks: Task[]
  onEdit: (task: Task) => void
}

const DAY_W = 34 // 每天宽度 px
const NAME_W = 104 // 左侧任务名列宽

export default function GanttView({ tasks, onEdit }: Props) {
  const today = todayStr()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { days, active, minDate } = useMemo(() => {
    // 已完成的任务在甘特图中隐藏（去「归档」页查看）
    const active = [...tasks]
      .filter((t) => !t.done)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
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
    return { days, active, minDate: min }
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
        <div className="text-sm text-gray-500 mt-1">横轴为时间，左右滑动查看</div>
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

            {active.map((t) => {
                  const meta = URGENCY_META[urgencyOf(t)]
                  const stages = sortedStages(t)
                  const prog = stageProgress(t)
                  const startIdx = Math.max(0, diffDays(minDate, t.startDate))
                  const span = Math.max(1, diffDays(t.startDate, t.endDate) + 1)
                  return (
                    <button key={t.id} onClick={() => onEdit(t)} className="flex w-full border-b border-gray-50 text-left">
                      <div className="sticky left-0 z-20 shrink-0 bg-white px-2 py-2.5 border-r border-gray-100" style={{ width: NAME_W }}>
                        <div className="text-xs leading-tight line-clamp-2 text-gray-700">
                          {t.title}
                        </div>
                        {prog.total > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            阶段 {prog.done}/{prog.total}
                          </div>
                        )}
                      </div>
                      <div className="relative h-11 shrink-0" style={{ width: days.length * DAY_W }}>
                        {/* 周末底纹 */}
                        {days.map((d, i) => {
                          const wd = parseDate(d).getDay()
                          if (wd !== 0 && wd !== 6) return null
                          return <div key={d} className="absolute top-0 bottom-0 bg-gray-50" style={{ left: i * DAY_W, width: DAY_W }} />
                        })}

                        {stages.length === 0 ? (
                          <>
                            {/* 无阶段：整条任务条，按紧急度着色 */}
                            <div
                              className={`absolute top-2 h-7 rounded-full ${meta.bar} shadow-sm flex items-center px-2 overflow-hidden`}
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
                          </>
                        ) : (
                          <>
                            {/* 有阶段：按阶段分段着色 */}
                            {stages.map((s, si) => {
                              const sIdx = Math.max(0, diffDays(minDate, s.startDate))
                              const sSpan = Math.max(1, diffDays(s.startDate, s.endDate) + 1)
                              const sm = STAGE_META[s.key]
                              const isLast = si === stages.length - 1
                              return (
                                <div key={si}>
                                  <div
                                    className={`absolute top-2 h-7 ${si === 0 ? 'rounded-l-full' : ''} ${isLast ? 'rounded-r-full' : ''} ${sm.bar} ${s.done ? 'opacity-35' : 'shadow-sm'} flex items-center px-1.5 overflow-hidden border border-white/40`}
                                    style={{ left: sIdx * DAY_W + 2, width: sSpan * DAY_W - 4 }}
                                  >
                                    <span className={`text-[10px] text-white font-medium whitespace-nowrap ${s.done ? 'line-through' : ''}`}>
                                      {sSpan >= 3 ? sm.label : ''}
                                    </span>
                                  </div>
                                  {/* 阶段节点 */}
                                  <div
                                    className={`absolute top-1.5 w-2 h-2 rounded-full border-2 border-white ${sm.dot} ${s.done ? 'opacity-35' : ''}`}
                                    style={{ left: (sIdx + sSpan - 1) * DAY_W + DAY_W / 2 - 4 }}
                                  />
                                </div>
                              )
                            })}
                          </>
                        )}
                      </div>
                    </button>
                  )
            })}

            {active.length === 0 && <div className="text-center text-sm text-gray-300 py-10">暂无进行中的任务（已完成见「归档」）</div>}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-500">
        {(['red', 'yellow', 'green'] as const).map((u) => (
          <span key={u} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${URGENCY_META[u].dot}`} />
            {URGENCY_META[u].label}
          </span>
        ))}
        <span className="text-gray-300">|</span>
        {(['script', 'shoot', 'post'] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STAGE_META[k].dot}`} />
            {STAGE_META[k].label}阶段
          </span>
        ))}
      </div>
    </div>
  )
}
