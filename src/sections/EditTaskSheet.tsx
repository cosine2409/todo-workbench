import { useEffect, useState } from 'react'
import type { StageKey, Task, TaskStage } from '@/types/task'
import { URGENCY_META, STAGE_META } from '@/types/task'
import { urgencyOf } from '@/hooks/useTasks'
import { spanFromStages } from '@/lib/stages'
import { X, CheckCircle2, RotateCcw, Trash2, Plus } from 'lucide-react'

interface Props {
  task: Task | null
  onClose: () => void
  onSave: (id: string, patch: Partial<Omit<Task, 'id'>>) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
}

const STAGE_KEYS: StageKey[] = ['script', 'shoot', 'post']

/** 编辑中的阶段行（带本地行 id 方便增删） */
interface StageRow extends TaskStage {
  rowId: number
}

export default function EditTaskSheet({ task, onClose, onSave, onDelete, onComplete }: Props) {
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [timeHint, setTimeHint] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [stages, setStages] = useState<StageRow[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setProject(task.project)
      setStartDate(task.startDate)
      setEndDate(task.endDate)
      setTimeHint(task.timeHint ?? '')
      setUrgent(task.urgent)
      setStages(
        (task.stages ?? []).map((s, i) => ({ ...s, rowId: i })),
      )
      setConfirmDelete(false)
    }
  }, [task])

  if (!task) return null

  const meta = URGENCY_META[urgencyOf(task)]
  const cleanStages = (): TaskStage[] =>
    stages
      .filter((s) => s.startDate && s.endDate)
      .map((s) => ({
        key: s.key,
        startDate: s.startDate <= s.endDate ? s.startDate : s.endDate,
        endDate: s.startDate <= s.endDate ? s.endDate : s.startDate,
        done: s.done ?? false,
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const stagesChanged = JSON.stringify(cleanStages()) !== JSON.stringify(
    [...(task.stages ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((s) => ({
      key: s.key,
      startDate: s.startDate,
      endDate: s.endDate,
      done: s.done ?? false,
    })),
  )

  const dirty =
    title.trim() !== task.title ||
    project.trim() !== task.project ||
    startDate !== task.startDate ||
    endDate !== task.endDate ||
    timeHint !== (task.timeHint ?? '') ||
    urgent !== task.urgent ||
    stagesChanged

  const addStage = () => {
    const used = new Set(stages.map((s) => s.key))
    const key = STAGE_KEYS.find((k) => !used.has(k)) ?? 'script'
    const base = endDate || startDate || task.endDate
    setStages((prev) => [...prev, { rowId: Date.now(), key, startDate: base, endDate: base, done: false }])
  }

  const patchStage = (rowId: number, patch: Partial<StageRow>) => {
    setStages((prev) => prev.map((s) => (s.rowId === rowId ? { ...s, ...patch } : s)))
  }

  const removeStage = (rowId: number) => {
    setStages((prev) => prev.filter((s) => s.rowId !== rowId))
  }

  const save = () => {
    if (!title.trim()) return
    const finalStages = cleanStages()
    const span = spanFromStages(finalStages)
    let s = startDate
    let e = endDate
    if (span) {
      s = span.startDate
      e = span.endDate
    } else {
      if (!s || !e) return
      if (s > e) [s, e] = [e, s]
    }
    onSave(task.id, {
      title: title.trim(),
      project: project.trim() || '日常',
      startDate: s,
      endDate: e,
      timeHint: timeHint.trim() || undefined,
      urgent,
      stages: finalStages.length ? finalStages : undefined,
    })
    onClose()
  }

  const hasStages = stages.length > 0

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-4 pb-8 max-w-lg mx-auto shadow-2xl max-h-[92dvh] overflow-y-auto">
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

          {/* 阶段编辑 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">阶段（脚本 / 拍摄 / 后期，可分别设时间）</label>
              {!hasStages && (
                <button onClick={addStage} className="text-xs font-semibold text-gray-700 flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 active:bg-gray-200">
                  <Plus className="w-3 h-3" /> 拆分阶段
                </button>
              )}
            </div>

            {!hasStages && (
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
            )}

            {hasStages && (
              <div className="space-y-2">
                {stages.map((s) => {
                  const sm = STAGE_META[s.key]
                  return (
                    <div key={s.rowId} className={`rounded-xl border px-2.5 py-2 ${sm.soft} ${s.done ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        {/* 阶段类型切换 */}
                        <div className="flex rounded-lg overflow-hidden border border-white/60 bg-white/70">
                          {STAGE_KEYS.map((k) => (
                            <button
                              key={k}
                              onClick={() => patchStage(s.rowId, { key: k })}
                              className={`px-2 py-1 text-xs font-medium ${
                                s.key === k ? `${STAGE_META[k].bar} text-white` : 'text-gray-400'
                              }`}
                            >
                              {STAGE_META[k].label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => patchStage(s.rowId, { done: !s.done })}
                          className={`ml-auto text-xs px-2 py-1 rounded-full border font-medium ${
                            s.done ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white/70 border-gray-200 text-gray-400'
                          }`}
                        >
                          {s.done ? '✓ 已完成' : '完成'}
                        </button>
                        <button onClick={() => removeStage(s.rowId)} className="p-1 text-gray-300 active:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={s.startDate}
                          onChange={(e) => patchStage(s.rowId, { startDate: e.target.value })}
                          className="rounded-lg border border-white/60 bg-white/80 px-2 py-1.5 text-sm outline-none"
                        />
                        <input
                          type="date"
                          value={s.endDate}
                          onChange={(e) => patchStage(s.rowId, { endDate: e.target.value })}
                          className="rounded-lg border border-white/60 bg-white/80 px-2 py-1.5 text-sm outline-none"
                        />
                      </div>
                    </div>
                  )
                })}
                {stages.length < 3 && (
                  <button
                    onClick={addStage}
                    className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 flex items-center justify-center gap-1 active:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" /> 添加阶段
                  </button>
                )}
              </div>
            )}
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
