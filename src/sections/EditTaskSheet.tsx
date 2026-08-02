import { useEffect, useState } from 'react'
import type { Task } from '@/types/task'
import { URGENCY_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { X, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'

interface Props {
  task: Task | null
  onClose: () => void
  onSave: (id: string, patch: Partial<Omit<Task, 'id'>>) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
}

export default function EditTaskSheet({ task, onClose, onSave, onDelete, onComplete }: Props) {
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [timeHint, setTimeHint] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setProject(task.project)
      setStartDate(task.startDate)
      setEndDate(task.endDate)
      setTimeHint(task.timeHint ?? '')
      setUrgent(task.urgent)
      setConfirmDelete(false)
    }
  }, [task])

  if (!task) return null

  const meta = URGENCY_META[urgencyOf(task)]
  const dirty =
    title.trim() !== task.title ||
    project.trim() !== task.project ||
    startDate !== task.startDate ||
    endDate !== task.endDate ||
    timeHint !== (task.timeHint ?? '') ||
    urgent !== task.urgent

  const save = () => {
    if (!title.trim() || !startDate || !endDate) return
    const s = startDate <= endDate ? startDate : endDate
    const e = startDate <= endDate ? endDate : startDate
    onSave(task.id, {
      title: title.trim(),
      project: project.trim() || '日常',
      startDate: s,
      endDate: e,
      timeHint: timeHint.trim() || undefined,
      urgent,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-4 pb-8 max-w-lg mx-auto shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">编辑事项</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border ${meta.soft} ${meta.text}`}>{meta.label}</span>
            <button onClick={onClose} className="p-1.5 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">标题</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-gray-400 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">项目</label>
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="日常"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-gray-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">截止（节点）</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">时间点（选填）</label>
              <input
                value={timeHint}
                onChange={(e) => setTimeHint(e.target.value)}
                placeholder="如 15:00"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-gray-400"
              />
            </div>
            <button
              onClick={() => setUrgent(!urgent)}
              className={`mt-5 shrink-0 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                urgent ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              🔴 特别紧急
            </button>
          </div>
        </div>

        <button
          onClick={save}
          disabled={!dirty || !title.trim()}
          className={`mt-5 w-full py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
            dirty && title.trim() ? 'bg-gray-900 text-white active:bg-gray-700' : 'bg-gray-100 text-gray-300'
          }`}
        >
          保存修改
        </button>

        <div className="mt-2.5 flex gap-2.5">
          <button
            onClick={() => onComplete(task.id)}
            className={`flex-1 py-3 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              task.done ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'bg-emerald-500 text-white active:bg-emerald-600'
            }`}
          >
            {task.done ? (
              <>
                <RotateCcw className="w-4 h-4" /> 重新打开
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> 标记完成
              </>
            )}
          </button>
          <button
            onClick={() => (confirmDelete ? onDelete(task.id) : setConfirmDelete(true))}
            className={`px-4 py-3 rounded-2xl text-[15px] font-semibold flex items-center gap-1.5 transition-colors ${
              confirmDelete ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 active:bg-red-100'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? '确认删除' : '删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
