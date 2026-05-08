import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import Timer, { MODES, MODE_LABELS, formatTime } from './components/Timer'
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

function getModeSettingsTotal(settings, mode) {
  return {
    [MODES.FOCUS]: settings.focusDuration * 60,
    [MODES.SHORT]: settings.shortBreakDuration * 60,
    [MODES.LONG]: settings.longBreakDuration * 60,
  }[mode]
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

  const [timerState, setTimerState] = useState({
    focus: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
    short: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
    long: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
    currentMode: MODES.FOCUS,
    pomodoroCount: 0,
  })

  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }

  useEffect(() => {
    const theme = mergedSettings.theme
    if (theme === 'midnight') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [mergedSettings.theme])

  useEffect(() => {
    window.electronAPI?.setOpacity(mergedSettings.opacity ?? 1)
  }, [mergedSettings.opacity])

  const switchMode = useCallback((newMode) => {
    setTimerState(prev => (
      prev.currentMode === newMode
        ? prev
        : { ...prev, currentMode: newMode }
    ))
  }, [])

  const startCurrentMode = useCallback(() => {
    setTimerState(prev => {
      const mode = prev.currentMode
      const cleared = { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false }
      const next = { ...prev }

      for (const currentMode of Object.values(MODES)) {
        next[currentMode] = currentMode === mode
          ? { ...prev[currentMode], isRunning: true, hasStarted: true }
          : cleared
      }

      return next
    })
  }, [])

  const pauseCurrentMode = useCallback(() => {
    setTimerState(prev => {
      const mode = prev.currentMode
      if (!prev[mode].isRunning) return prev
      return {
        ...prev,
        [mode]: { ...prev[mode], isRunning: false },
      }
    })
  }, [])

  const resetCurrentMode = useCallback(() => {
    setTimerState(prev => {
      const mode = prev.currentMode
      const current = prev[mode]
      const nextTimeLeft = current.customTotal ?? getModeSettingsTotal(mergedSettings, mode)

      if (current.timeLeft === nextTimeLeft && !current.isRunning && !current.hasStarted) {
        return prev
      }

      return {
        ...prev,
        [mode]: {
          ...current,
          timeLeft: nextTimeLeft,
          isRunning: false,
          hasStarted: false,
        },
      }
    })
  }, [mergedSettings])

  const toggleCurrentRun = useCallback(() => {
    setTimerState(prev => {
      const mode = prev.currentMode
      const current = prev[mode]

      if (current.isRunning) {
        return {
          ...prev,
          [mode]: { ...current, isRunning: false },
        }
      }

      const cleared = { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false }
      const next = { ...prev }

      for (const currentMode of Object.values(MODES)) {
        next[currentMode] = currentMode === mode
          ? { ...prev[currentMode], isRunning: true, hasStarted: true }
          : cleared
      }

      return next
    })
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onMenuBarCommand) return undefined

    return window.electronAPI.onMenuBarCommand((command) => {
      if (command === 'toggle-run') {
        toggleCurrentRun()
      }
      if (command === 'reset') {
        resetCurrentMode()
      }
    })
  }, [resetCurrentMode, toggleCurrentRun])

  useEffect(() => {
    if (!window.electronAPI?.syncTrayState) return

    const mode = timerState.currentMode
    const current = timerState[mode]
    const defaultTotal = getModeSettingsTotal(mergedSettings, mode)
    const displayTimeLeft = current.timeLeft !== null ? current.timeLeft : defaultTotal
    const activeTask = tasks.find(task => task.id === activeTaskId)

    window.electronAPI.syncTrayState({
      mode,
      modeLabel: MODE_LABELS[mode],
      timeText: formatTime(displayTimeLeft),
      isRunning: current.isRunning,
      hasStarted: current.hasStarted,
      activeTaskName: activeTask?.name ?? null,
    })
  }, [activeTaskId, mergedSettings, tasks, timerState])

  function handleTimerComplete(mode) {
    if (mode !== 'focus') return

    const key = todayKey()
    setStats(prev => ({
      ...prev,
      [key]: {
        completed: ((prev[key] || {}).completed || 0) + 1,
        focusedMinutes: ((prev[key] || {}).focusedMinutes || 0) + mergedSettings.focusDuration,
      },
    }))

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
          onStart={startCurrentMode}
          onPause={pauseCurrentMode}
          onReset={resetCurrentMode}
          onSwitchMode={switchMode}
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
                onStart={startCurrentMode}
                onPause={pauseCurrentMode}
                onReset={resetCurrentMode}
                onSwitchMode={switchMode}
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
