import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import Timer, { MODES } from './components/Timer'
import TaskList from './components/TaskList'
import Statistics from './components/Statistics'
import Settings from './components/Settings'

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'midnight',
  opacity: 1,
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

const NAV_ITEMS = [
  {
    id: 'timer',
    label: '计时器',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: '任务',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: '统计',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '设置',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
]

export default function App() {
  const [tab, setTab] = useState('timer')
  const [pinned, setPinned] = useState(false)
  const [settings, setSettings] = useLocalStorage('pt_settings', DEFAULT_SETTINGS)
  const [tasks, setTasks] = useLocalStorage('pt_tasks', [])
  const [stats, setStats] = useLocalStorage('pt_stats', {})
  const [activeTaskId, setActiveTaskId] = useLocalStorage('pt_active_task', null)

  // Per-mode timer state lifted here so it survives tab switches
  const [timerState, setTimerState] = useState({
    focus: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
    short: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
    long: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
    currentMode: MODES.FOCUS,
    pomodoroCount: 0,
  })

  // Merge any new default keys into saved settings (handles upgrades)
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }

  // Apply theme to <html> element whenever it changes
  useEffect(() => {
    const theme = mergedSettings.theme
    if (theme === 'midnight') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [mergedSettings.theme])

  // Apply opacity to the window
  useEffect(() => {
    window.electronAPI?.setOpacity(mergedSettings.opacity ?? 1)
  }, [mergedSettings.opacity])

  function handleTimerComplete(mode) {
    if (mode !== 'focus') return

    // Update today's stats
    const key = todayKey()
    setStats(prev => ({
      ...prev,
      [key]: {
        completed: ((prev[key] || {}).completed || 0) + 1,
        focusedMinutes: ((prev[key] || {}).focusedMinutes || 0) + mergedSettings.focusDuration,
      },
    }))

    // Increment active task's pomodoro count
    if (activeTaskId) {
      setTasks(prev =>
        prev.map(t =>
          t.id === activeTaskId
            ? { ...t, completedPomodoros: t.completedPomodoros + 1 }
            : t
        )
      )
    }
  }

  const isMac = navigator.platform.toLowerCase().includes('mac')

  return (
    <div className="app">
      {pinned ? (
        <Timer
          settings={mergedSettings}
          tasks={tasks}
          activeTaskId={activeTaskId}
          onComplete={handleTimerComplete}
          pinned={pinned}
          onPinChange={setPinned}
          timerState={timerState}
          onTimerStateChange={setTimerState}
        />
      ) : (
        <>
          {isMac && <div className="drag-region" />}

          <div className="app-content">
            {tab === 'timer' && (
              <Timer
                settings={mergedSettings}
                tasks={tasks}
                activeTaskId={activeTaskId}
                onComplete={handleTimerComplete}
                pinned={pinned}
                onPinChange={setPinned}
                timerState={timerState}
                onTimerStateChange={setTimerState}
              />
            )}
            {tab === 'tasks' && (
              <TaskList
                tasks={tasks}
                activeTaskId={activeTaskId}
                onTasksChange={setTasks}
                onSetActive={setActiveTaskId}
              />
            )}
            {tab === 'stats' && <Statistics stats={stats} />}
            {tab === 'settings' && (
              <Settings settings={mergedSettings} onChange={setSettings} />
            )}
          </div>

          <nav className="tab-bar">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`tab-btn ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  )
}
