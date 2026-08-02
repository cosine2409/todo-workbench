import { useMemo, useState } from 'react'
import type { Task } from '@/types/task'
import { mdLabel } from '@/lib/dateUtils'
import { Archive, RotateCcw, Trash2, ChevronRight } from 'lucide-react'

interface Props {
  tasks: Task[]
  onEdit: (task: Task) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export default function ArchiveView({ tasks, onEdit, onRestore, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // 归档页只展示已完成任务，按项目分组、截止日倒序
  const groups = useMemo(() => {
    const done = tasks.filter((t) => t.done).sort((a, b) => b.endDate.localeCompare(a.endDate))
    const map: { project: string; tasks: Task[] }[] = []
    for (const t of done) {
      const g = map.find((x) => x.project === t.project)
      if (g) g.tasks.push(t)
      else map.push({ project: t.project, tasks: [t] })
    }
    return map
  }, [tasks])

  const total = groups.reduce((n, g) => n + g.tasks.length, 0)

  return (
    <div className="px-4 pb-28">
      <div className="pt-5 pb-3">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Archive className="w-6 h-6 text-gray-400" /> 归档
        </h1>
        <div className="text-sm text-gray-500 mt-1">
          已完成的事项会移到这里（{total} 项），不占用今日和甘特图
        </div>
      </div>

      {groups.length === 0 && (
        <div className="mt-16 text-center text-gray-300">
          <div className="text-5xl mb-3">🗃️</div>
          <div className="text-sm">还没有归档的事项</div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.project} className="mt-4">
          <div className="text-xs font-semibold text-gray-400 mb-2">📁 {g.project}（{g.tasks.length}）</div>
          <div className="space-y-2">
            {g.tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <button onClick={() => onEdit(t)} className="flex-1 min-w-0 text-left flex items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-500 line-through truncate">{t.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.startDate === t.endDate ? mdLabel(t.endDate) : `${mdLabel(t.startDate)} ~ ${mdLabel(t.endDate)}`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
                <button
                  onClick={() => onRestore(t.id)}
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1.5 active:bg-emerald-100"
                >
                  <RotateCcw className="w-3 h-3" /> 恢复
                </button>
                <button
                  onClick={() => {
                    if (confirmId === t.id) {
                      onDelete(t.id)
                      setConfirmId(null)
                    } else {
                      setConfirmId(t.id)
                      setTimeout(() => setConfirmId((cur) => (cur === t.id ? null : cur)), 3000)
                    }
                  }}
                  className={`shrink-0 flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1.5 border transition-colors ${
                    confirmId === t.id
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'text-red-400 bg-red-50 border-red-100 active:bg-red-100'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  {confirmId === t.id ? '确认' : ''}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
