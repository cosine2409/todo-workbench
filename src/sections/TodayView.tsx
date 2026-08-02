import type { Task } from '@/types/task'
import { URGENCY_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { inRange, mdLabel, todayStr, weekdayCN, diffDays } from '@/lib/dateUtils'
import { CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react'

interface Props {
  tasks: Task[]
  onEdit: (task: Task) => void
  onComplete: (id: string) => void
}

function TaskRow({ task, onEdit, onComplete }: { task: Task; onEdit: (t: Task) => void; onComplete: (id: string) => void }) {
  const u = urgencyOf(task)
  const meta = URGENCY_META[u]
  const overdue = !task.done && task.endDate < todayStr()
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-3 ${meta.soft} ${task.done ? 'opacity-60' : ''}`}>
      {/* 完成按钮：仅此处的圆圈可勾选完成，点文字区只会打开编辑 */}
      <button onClick={() => onComplete(task.id)} className="shrink-0 p-1 active:scale-90 transition-transform" aria-label="完成">
        {task.done ? <CheckCircle2 className="w-6 h-6 text-gray-400" /> : <Circle className={`w-6 h-6 ${meta.text}`} />}
      </button>
      <button onClick={() => onEdit(task)} className="flex-1 min-w-0 text-left flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-medium leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span className={`inline-block w-2 h-2 rounded-full ${meta.dot}`} />
            <span>{task.project}</span>
            <span>·</span>
            <span>
              {task.startDate === task.endDate ? mdLabel(task.endDate) : `${mdLabel(task.startDate)} ~ ${mdLabel(task.endDate)}`}
            </span>
            {task.timeHint && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {task.timeHint}
              </span>
            )}
            {overdue && <span className="text-red-500 font-medium">已逾期 {-diffDays(task.endDate, todayStr())} 天</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </button>
    </div>
  )
}

export default function TodayView({ tasks, onEdit, onComplete }: Props) {
  const today = todayStr()
  const todays = tasks.filter((t) => inRange(today, t.startDate, t.endDate))
  const overdue = todays.filter((t) => !t.done && t.endDate < today)
  const active = todays.filter((t) => !t.done && t.endDate >= today)
  const done = todays.filter((t) => t.done)
  const order = { red: 0, yellow: 1, green: 2, done: 3 } as const
  active.sort((a, b) => order[urgencyOf(a)] - order[urgencyOf(b)] || a.endDate.localeCompare(b.endDate))

  const dateLabel = `${mdLabel(today)} 周${weekdayCN(today)}`

  return (
    <div className="px-4 pb-28">
      <div className="pt-5 pb-4">
        <div className="text-sm text-gray-400">{dateLabel}</div>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">今日待办</h1>
        <div className="text-sm text-gray-500 mt-1">
          {active.length + overdue.length > 0 ? (
            <>
              还剩 <span className="font-semibold text-gray-800">{active.length + overdue.length}</span> 项 · 已完成{' '}
              <span className="font-semibold text-gray-800">{done.length}</span> 项
            </>
          ) : (
            '今天的事项都处理完啦 🎉'
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <>
          <div className="text-xs font-semibold text-red-500 mb-2 mt-1">⚠️ 已逾期</div>
          <div className="space-y-2">{overdue.map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} onComplete={onComplete} />)}</div>
        </>
      )}

      {active.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-400 mb-2 mt-4">进行中</div>
          <div className="space-y-2">{active.map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} onComplete={onComplete} />)}</div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-400 mb-2 mt-4">已完成</div>
          <div className="space-y-2">{done.map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} onComplete={onComplete} />)}</div>
        </>
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
