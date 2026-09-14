import { useState } from 'react'
import type { Task } from '@/types/task'
import { URGENCY_META, STAGE_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { currentStage } from '@/lib/stages'
import { inRange, mdLabel, todayStr, weekdayCN, diffDays } from '@/lib/dateUtils'
import { CheckCircle2, Circle, Clock, ChevronRight, NotebookPen, X } from 'lucide-react'

interface Props {
  tasks: Task[]
  onEdit: (task: Task) => void
  onComplete: (id: string) => void
  onLog: (id: string, note: string) => void
}

/** 今日已记录进度的标识色（区别于红黄绿灰）：靛蓝 */
const LOGGED = {
  soft: 'bg-indigo-50 border-indigo-200',
  dot: 'bg-indigo-500',
  text: 'text-indigo-600',
}

function TaskRow({
  task,
  onEdit,
  onComplete,
  onLog,
}: {
  task: Task
  onEdit: (t: Task) => void
  onComplete: (id: string) => void
  onLog: (id: string, note: string) => void
}) {
  const today = todayStr()
  const u = urgencyOf(task)
  const meta = URGENCY_META[u]
  const overdue = !task.done && task.endDate < today
  const stage = currentStage(task)
  const loggedNote = task.progress?.[today]
  const logged = !task.done && !!loggedNote
  const [logging, setLogging] = useState(false)
  const [draft, setDraft] = useState('')

  const startLog = () => {
    setDraft(loggedNote ?? '')
    setLogging(true)
  }
  const saveLog = () => {
    onLog(task.id, draft)
    setLogging(false)
  }

  return (
    <div className={`rounded-xl border px-3 py-3 ${logged ? LOGGED.soft : meta.soft} ${task.done ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        {/* 完成按钮：仅此处的圆圈可勾选完成，点文字区只会打开编辑 */}
        <button onClick={() => onComplete(task.id)} className="shrink-0 p-1 active:scale-90 transition-transform" aria-label="完成">
          {task.done ? <CheckCircle2 className="w-6 h-6 text-gray-400" /> : <Circle className={`w-6 h-6 ${logged ? LOGGED.text : meta.text}`} />}
        </button>
        <button onClick={() => onEdit(task)} className="flex-1 min-w-0 text-left flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <div className={`text-[15px] font-medium leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {task.title}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              <span className={`inline-block w-2 h-2 rounded-full ${logged ? LOGGED.dot : meta.dot}`} />
              <span>
                {task.startDate === task.endDate ? mdLabel(task.endDate) : `${mdLabel(task.startDate)} ~ ${mdLabel(task.endDate)}`}
              </span>
              {stage && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${STAGE_META[stage.key].soft} ${STAGE_META[stage.key].text}`}>
                  {STAGE_META[stage.key].label}阶段
                </span>
              )}
              {task.timeHint && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {task.timeHint}
                </span>
              )}
              {overdue && <span className="text-red-500 font-medium">已逾期 {-diffDays(task.endDate, today)} 天</span>}
              {logged && <span className={`font-medium ${LOGGED.text}`}>已记录</span>}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>
        {/* 记进度按钮 */}
        {!task.done && (
          <button
            onClick={startLog}
            className={`shrink-0 p-1.5 rounded-lg active:scale-90 transition-transform ${logged ? LOGGED.text : 'text-gray-300'}`}
            aria-label="记进度"
          >
            <NotebookPen className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 今日进度内容 */}
      {logged && !logging && (
        <div className="mt-2 ml-9 text-xs text-indigo-700 bg-white/70 rounded-lg px-2.5 py-1.5 border border-indigo-100">
          {loggedNote}
        </div>
      )}

      {/* 就地记录输入 */}
      {logging && (
        <div className="mt-2 ml-9">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="今天推进了什么？一句话就行"
            rows={2}
            className="w-full text-sm rounded-lg border border-indigo-200 bg-white px-2.5 py-2 outline-none focus:border-indigo-400 resize-none"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              onClick={saveLog}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold active:bg-indigo-600"
            >
              保存
            </button>
            {loggedNote && (
              <button
                onClick={() => {
                  onLog(task.id, '')
                  setLogging(false)
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 text-xs active:bg-gray-50"
              >
                清除记录
              </button>
            )}
            <button onClick={() => setLogging(false)} className="ml-auto p-1.5 text-gray-300 active:text-gray-500" aria-label="取消">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TodayView({ tasks, onEdit, onComplete, onLog }: Props) {
  const today = todayStr()
  const todays = tasks.filter((t) => inRange(today, t.startDate, t.endDate))
  const overdue = todays.filter((t) => !t.done && t.endDate < today)
  const activeAll = todays.filter((t) => !t.done && t.endDate >= today)
  const done = todays.filter((t) => t.done)
  // 今日已记录进度的排到最后（含逾期组内同样规则）
  const isLogged = (t: Task) => !!t.progress?.[today]
  const order = { red: 0, yellow: 1, green: 2, done: 3 } as const
  const byUrgency = (a: Task, b: Task) => order[urgencyOf(a)] - order[urgencyOf(b)] || a.endDate.localeCompare(b.endDate)
  const sortWithLogged = (list: Task[]) => {
    const fresh = list.filter((t) => !isLogged(t)).sort(byUrgency)
    const logged = list.filter(isLogged).sort(byUrgency)
    return [...fresh, ...logged]
  }
  const overdueSorted = sortWithLogged(overdue)
  const active = sortWithLogged(activeAll)
  const loggedCount = todays.filter((t) => !t.done && isLogged(t)).length
  const remaining = activeAll.length + overdue.length - loggedCount

  const dateLabel = `${mdLabel(today)} 周${weekdayCN(today)}`

  return (
    <div className="px-4 pb-28">
      <div className="pt-5 pb-4">
        <div className="text-sm text-gray-400">{dateLabel}</div>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">今日待办</h1>
        <div className="text-sm text-gray-500 mt-1">
          {activeAll.length + overdue.length > 0 ? (
            <>
              待处理 <span className="font-semibold text-gray-800">{remaining}</span> 项
              {loggedCount > 0 && (
                <>
                  {' '}· 已记录 <span className="font-semibold text-indigo-600">{loggedCount}</span> 项
                </>
              )}
              {' '}· 已完成 <span className="font-semibold text-gray-800">{done.length}</span> 项
            </>
          ) : (
            '今天的事项都处理完啦 🎉'
          )}
        </div>
      </div>

      {overdueSorted.length > 0 && (
        <>
          <div className="text-xs font-semibold text-red-500 mb-2 mt-1">⚠️ 已逾期</div>
          <div className="space-y-2">{overdueSorted.map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} onComplete={onComplete} onLog={onLog} />)}</div>
        </>
      )}

      {active.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-400 mb-2 mt-4">进行中</div>
          <div className="space-y-2">{active.map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} onComplete={onComplete} onLog={onLog} />)}</div>
        </>
      )}

      {done.length > 0 && (
        <div className="text-xs text-gray-300 mb-2 mt-4 text-center">
          已完成 {done.length} 项 → 已移入「归档」页
        </div>
      )}

      {todays.length === 0 && (
        <div className="mt-16 text-center text-gray-300">
          <div className="text-5xl mb-3">🌤️</div>
          <div className="text-sm">今天还没有安排事项，点右下角 + 添加一条吧</div>
        </div>
      )}
    </div>
  )
}
