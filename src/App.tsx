import { useState } from 'react'
import { Routes, Route } from 'react-router'
import { ListTodo, CalendarDays, ChartGantt, Plus } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import TodayView from '@/sections/TodayView'
import CalendarView from '@/sections/CalendarView'
import GanttView from '@/sections/GanttView'
import AddTaskSheet from '@/sections/AddTaskSheet'

type Tab = 'today' | 'calendar' | 'gantt'

const TABS: { key: Tab; label: string; icon: typeof ListTodo }[] = [
  { key: 'today', label: '今日', icon: ListTodo },
  { key: 'calendar', label: '日历', icon: CalendarDays },
  { key: 'gantt', label: '甘特图', icon: ChartGantt },
]

function Workbench() {
  const [tab, setTab] = useState<Tab>('today')
  const [sheetOpen, setSheetOpen] = useState(false)
  const { tasks, addTask, toggleDone, removeTask } = useTasks()

  return (
    <div className="min-h-dvh bg-white max-w-lg mx-auto relative">
      {tab === 'today' && <TodayView tasks={tasks} onToggle={toggleDone} onRemove={removeTask} />}
      {tab === 'calendar' && <CalendarView tasks={tasks} onToggle={toggleDone} />}
      {tab === 'gantt' && <GanttView tasks={tasks} onToggle={toggleDone} />}

      {/* 悬浮添加按钮 */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform sm:right-[calc(50%-16rem)]"
        aria-label="新建事项"
      >
        <Plus className="w-7 h-7" />
      </button>

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
