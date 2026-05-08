import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import Timer, { MODES, MODE_LABELS, formatTime } from './components/Timer'
import TaskList from './components/TaskList'
import Statistics from './components/Statistics'
import Settings from './components/Settings'
import { playSound } from './utils/sound'

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

function showNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, silent: true })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') new Notification(title, { body, silent: true })
    })
  }
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
  const timerRef = useRef({ startedAt: null, startedWith: null })
  const intervalRef = useRef(null)

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

  const handleTimerComplete = useCallback((mode) => {
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
  }, [activeTaskId, mergedSettings.focusDuration, setStats, setTasks])

  const handleRunningTimerComplete = useCallback((completedMode, count) => {
    if (mergedSettings.soundEnabled) {
      playSound(completedMode === MODES.FOCUS ? 'focus' : 'break')
    }

    if (mergedSettings.notificationsEnabled) {
      if (completedMode === MODES.FOCUS) {
        showNotification('专注完成！', '休息一下吧 ☕')
      } else {
        showNotification('休息结束', '准备好开始下一个番茄了吗？')
      }
    }

    handleTimerComplete(completedMode)

    if (completedMode === MODES.FOCUS) {
      const newCount = count + 1
      const nextMode = newCount % mergedSettings.longBreakInterval === 0 ? MODES.LONG : MODES.SHORT
      const auto = mergedSettings.autoStartBreaks

      setTimerState(prev => ({
        ...prev,
        currentMode: nextMode,
        pomodoroCount: newCount,
        [completedMode]: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
        [nextMode]: { timeLeft: null, isRunning: auto, customTotal: null, hasStarted: auto },
      }))
      return
    }

    const auto = mergedSettings.autoStartFocus
    setTimerState(prev => ({
      ...prev,
      currentMode: MODES.FOCUS,
      [completedMode]: { timeLeft: null, isRunning: false, customTotal: null, hasStarted: false },
      [MODES.FOCUS]: { timeLeft: null, isRunning: auto, customTotal: null, hasStarted: auto },
    }))
  }, [
    handleTimerComplete,
    mergedSettings.autoStartBreaks,
    mergedSettings.autoStartFocus,
    mergedSettings.longBreakInterval,
    mergedSettings.notificationsEnabled,
    mergedSettings.soundEnabled,
  ])

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
    const mode = timerState.currentMode
    const current = timerState[mode]

    if (!current.isRunning) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      return undefined
    }

    const startTime = current.timeLeft ?? current.customTotal ?? getModeSettingsTotal(mergedSettings, mode)
    timerRef.current = { startedAt: Date.now(), startedWith: startTime }

    intervalRef.current = setInterval(() => {
      const { startedAt, startedWith } = timerRef.current
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, startedWith - elapsed)

      if (remaining === 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        handleRunningTimerComplete(mode, timerState.pomodoroCount)
      } else {
        setTimerState(prev => {
          const nextCurrent = prev[mode]
          if (nextCurrent.timeLeft === remaining) return prev
          return {
            ...prev,
            [mode]: { ...nextCurrent, timeLeft: remaining },
          }
        })
      }
    }, 200)

    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [
    handleRunningTimerComplete,
    mergedSettings.focusDuration,
    mergedSettings.longBreakDuration,
    mergedSettings.shortBreakDuration,
    timerState.currentMode,
    timerState.focus.isRunning,
    timerState.long.isRunning,
    timerState.pomodoroCount,
    timerState.short.isRunning,
  ])

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
