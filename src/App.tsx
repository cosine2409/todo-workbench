import { useEffect, useRef, useState } from 'react'
import { Routes, Route } from 'react-router'
import { ListTodo, CalendarDays, ChartGantt, Archive, Plus, Undo2 } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types/task'
import TodayView from '@/sections/TodayView'
import CalendarView from '@/sections/CalendarView'
import GanttView from '@/sections/GanttView'
import ArchiveView from '@/sections/ArchiveView'
import AddTaskSheet from '@/sections/AddTaskSheet'
import EditTaskSheet from '@/sections/EditTaskSheet'

type Tab = 'today' | 'calendar' | 'gantt' | 'archive'

const TABS: { key: Tab; label: string; icon: typeof ListTodo }[] = [
  { key: 'today', label: '今日', icon: ListTodo },
  { key: 'calendar', label: '日历', icon: CalendarDays },
  { key: 'gantt', label: '甘特图', icon: ChartGantt },
  { key: 'archive', label: '归档', icon: Archive },
]

function Workbench() {
  const [tab, setTab] = useState<Tab>('today')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ id: string; title: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { tasks, addTask, toggleDone, updateTask, removeTask } = useTasks()

  // 完成后 6 秒内可撤销，防止误触
  const completeWithUndo = (id: string) => {
    const t = tasks.find((x) => x.id === id)
    toggleDone(id)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    if (t && !t.done) {
      setUndoInfo({ id, title: t.title })
      undoTimer.current = setTimeout(() => setUndoInfo(null), 6000)
    } else {
      setUndoInfo(null)
    }
  }

  const undoComplete = () => {
    if (undoInfo) toggleDone(undoInfo.id)
    setUndoInfo(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }, [])

  // 编辑面板打开时，始终展示最新的任务数据（其他视图/标签页改动也会同步进来）
  const editingTask = editing ? tasks.find((t) => t.id === editing.id) ?? null : null

  return (
    <div className="min-h-dvh bg-white max-w-lg mx-auto relative">
      {tab === 'today' && <TodayView tasks={tasks} onEdit={setEditing} onComplete={completeWithUndo} />}
      {tab === 'calendar' && <CalendarView tasks={tasks} onEdit={setEditing} />}
      {tab === 'gantt' && <GanttView tasks={tasks} onEdit={setEditing} />}
      {tab === 'archive' && (
        <ArchiveView
          tasks={tasks}
          onEdit={setEditing}
          onRestore={toggleDone}
          onDelete={removeTask}
        />
      )}

      {/* 悬浮添加按钮 */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform sm:right-[calc(50%-16rem)]"
        aria-label="新建事项"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* 完成撤销条 */}
      {undoInfo && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-full pl-4 pr-2 py-2 flex items-center gap-3 shadow-xl max-w-[90vw]">
          <span className="text-sm truncate">已完成「{undoInfo.title}」</span>
          <button onClick={undoComplete} className="shrink-0 flex items-center gap-1 text-sm font-semibold bg-white/15 rounded-full px-3 py-1.5 active:bg-white/25">
            <Undo2 className="w-3.5 h-3.5" /> 撤销
          </button>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 pb-3 transition-colors ${
                tab === key ? 'text-gray-900' : 'text-gray-300'
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={tab === key ? 2.4 : 1.8} />
              <span className={`text-[11px] ${tab === key ? 'font-semibold' : ''}`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AddTaskSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={addTask} />
      <EditTaskSheet
        task={editingTask}
        onClose={() => setEditing(null)}
        onSave={updateTask}
        onDelete={(id) => {
          removeTask(id)
          setEditing(null)
        }}
        onComplete={(id) => {
          completeWithUndo(id)
          setEditing(null)
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Workbench />} />
    </Routes>
  )
}
