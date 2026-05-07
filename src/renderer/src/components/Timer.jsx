import { useState, useEffect, useRef, useCallback } from 'react'
import { playSound } from '../utils/sound'

const MODES = { FOCUS: 'focus', SHORT: 'short', LONG: 'long' }

const MODE_LABELS = {
  [MODES.FOCUS]: '专注',
  [MODES.SHORT]: '短休',
  [MODES.LONG]: '长休',
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function showNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, silent: true })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body, silent: true })
    })
  }
}

export default function Timer({ settings, tasks, activeTaskId, onComplete, pinned, onPinChange }) {
  const [mode, setMode] = useState(MODES.FOCUS)
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  // customTotal overrides settings duration for the current session
  const [customTotal, setCustomTotal] = useState(null)
  const [editingDuration, setEditingDuration] = useState(false)
  const [editInput, setEditInput] = useState('')

  const settingsTotal = {
    [MODES.FOCUS]: settings.focusDuration * 60,
    [MODES.SHORT]: settings.shortBreakDuration * 60,
    [MODES.LONG]: settings.longBreakDuration * 60,
  }[mode]

  const effectiveTotal = customTotal ?? settingsTotal
  const [timeLeft, setTimeLeft] = useState(settingsTotal)

  const timerRef = useRef({ startedAt: null, startedWith: null })
  const intervalRef = useRef(null)
  const prevModeRef = useRef(mode)

  // Reset when mode changes
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode
      setIsRunning(false)
      setCustomTotal(null)
      setTimeLeft(settingsTotal)
    }
  }, [mode, settingsTotal])

  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(timeLeft)} — ${MODE_LABELS[mode]}`
      : '番茄钟'
  }, [timeLeft, isRunning, mode])

  const handleComplete = useCallback((completedMode, count) => {
    if (settings.soundEnabled) playSound(completedMode === MODES.FOCUS ? 'focus' : 'break')
    if (settings.notificationsEnabled) {
      if (completedMode === MODES.FOCUS) {
        showNotification('专注完成！', '休息一下吧 ☕')
      } else {
        showNotification('休息结束', '准备好开始下一个番茄了吗？')
      }
    }

    onComplete(completedMode, count)

    if (completedMode === MODES.FOCUS) {
      const newCount = count + 1
      const nextMode = newCount % settings.longBreakInterval === 0 ? MODES.LONG : MODES.SHORT
      setMode(nextMode)
      setCustomTotal(null)
      const nextSecs = nextMode === MODES.LONG
        ? settings.longBreakDuration * 60
        : settings.shortBreakDuration * 60
      setTimeLeft(nextSecs)
      if (settings.autoStartBreaks) {
        setTimeout(() => {
          timerRef.current = { startedAt: Date.now(), startedWith: nextSecs }
          setIsRunning(true)
        }, 50)
      } else {
        setIsRunning(false)
      }
    } else {
      setMode(MODES.FOCUS)
      setCustomTotal(null)
      const nextSecs = settings.focusDuration * 60
      setTimeLeft(nextSecs)
      if (settings.autoStartFocus) {
        setTimeout(() => {
          timerRef.current = { startedAt: Date.now(), startedWith: nextSecs }
          setIsRunning(true)
        }, 50)
      } else {
        setIsRunning(false)
      }
    }
  }, [settings, onComplete])

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current)
      return
    }

    const currentMode = mode
    const currentCount = pomodoroCount

    intervalRef.current = setInterval(() => {
      const { startedAt, startedWith } = timerRef.current
      if (!startedAt) return
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, startedWith - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(intervalRef.current)
        setIsRunning(false)
        if (currentMode === MODES.FOCUS) setPomodoroCount(c => c + 1)
        handleComplete(currentMode, currentMode === MODES.FOCUS ? currentCount : pomodoroCount)
      }
    }, 200)

    return () => clearInterval(intervalRef.current)
  }, [isRunning]) // eslint-disable-line

  function start() {
    timerRef.current = { startedAt: Date.now(), startedWith: timeLeft }
    setIsRunning(true)
  }

  function pause() {
    clearInterval(intervalRef.current)
    setIsRunning(false)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setTimeLeft(effectiveTotal)
  }

  function switchMode(newMode) {
    if (newMode === mode) return
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setMode(newMode)
    prevModeRef.current = newMode
    setCustomTotal(null)
    setTimeLeft({
      [MODES.FOCUS]: settings.focusDuration * 60,
      [MODES.SHORT]: settings.shortBreakDuration * 60,
      [MODES.LONG]: settings.longBreakDuration * 60,
    }[newMode])
  }

  function togglePin() {
    const next = !pinned
    onPinChange(next)
    window.electronAPI?.setAlwaysOnTop(next)
  }

  // Custom duration editing
  function startEdit() {
    if (isRunning) return
    setEditInput(String(Math.ceil(timeLeft / 60)))
    setEditingDuration(true)
  }

  function confirmEdit() {
    const mins = parseInt(editInput)
    if (mins >= 1 && mins <= 180) {
      const secs = mins * 60
      setCustomTotal(secs)
      setTimeLeft(secs)
    }
    setEditingDuration(false)
  }

  function handleEditKey(e) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') setEditingDuration(false)
  }

  // ── Mini view ────────────────────────────────────────────────
  const isMac = navigator.platform.toLowerCase().includes('mac')

  // IPC-based window drag — smooth, works everywhere in the mini window
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, rafId: null, pending: null })

  function shouldSkipMiniDrag(target) {
    return target.closest('button, input, textarea, select, label, [contenteditable="true"], [role="button"]')
  }

  function handleMiniMouseDown(e) {
    if (e.button !== 0 || editingDuration || shouldSkipMiniDrag(e.target)) return
    const d = dragRef.current
    d.active = true
    d.lastX = e.screenX
    d.lastY = e.screenY
    d.pending = null

    function onMove(e) {
      if (!d.active) return
      const dx = e.screenX - d.lastX
      const dy = e.screenY - d.lastY
      d.lastX = e.screenX
      d.lastY = e.screenY
      if (d.pending === null) {
        d.pending = { dx: 0, dy: 0 }
        d.rafId = requestAnimationFrame(() => {
          window.electronAPI?.moveWindow(Math.round(d.pending.dx), Math.round(d.pending.dy))
          d.pending = null
        })
      }
      d.pending.dx += dx
      d.pending.dy += dy
    }

    function onUp() {
      d.active = false
      if (d.rafId) { cancelAnimationFrame(d.rafId); d.rafId = null }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (pinned) {
    return (
      <div
        className="mini-wrap"
        data-mode={mode}
        style={{ paddingTop: isMac ? 32 : 16 }}
        onMouseDown={handleMiniMouseDown}
      >
        {/* Row 1: mode label + unpin */}
        <div className="mini-header">
          <span className="mini-dot" />
          <span className="mini-mode-name">{MODE_LABELS[mode]}</span>
          <button
            className="mini-unpin"
            onClick={togglePin}
            onMouseDown={e => e.stopPropagation()}
            title="退出置顶"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="11" height="11">
              <path d="M12 2l3 7h5l-4 5 2 7-6-4-6 4 2-7-4-5h5z" />
            </svg>
          </button>
        </div>

        {/* Row 2: big centered time — double-click to edit */}
        <div
          className={`mini-time ${!isRunning ? 'mini-time--editable' : ''}`}
          onDoubleClick={!isRunning ? startEdit : undefined}
          title={!isRunning ? '双击修改时长' : undefined}
        >
          {editingDuration ? (
            <span className="mini-edit" onMouseDown={e => e.stopPropagation()}>
              <input
                type="number"
                value={editInput}
                min={1}
                max={180}
                onChange={e => setEditInput(e.target.value)}
                onKeyDown={handleEditKey}
                onBlur={confirmEdit}
                autoFocus
                className="mini-edit-input"
              />
              <span className="mini-edit-unit">分</span>
            </span>
          ) : (
            formatTime(timeLeft)
          )}
        </div>

        {/* Row 3: controls */}
        <div className="mini-controls">
          <button
            className="mini-play"
            onClick={isRunning ? pause : start}
            onMouseDown={e => e.stopPropagation()}
          >
            {isRunning
              ? <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5,3 19,12 5,21"/></svg>
            }
            {isRunning ? '暂停' : (timeLeft === effectiveTotal ? '开始' : '继续')}
          </button>
          <button
            className="mini-reset"
            onClick={reset}
            onMouseDown={e => e.stopPropagation()}
            title="重置"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
              <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
            </svg>
          </button>
        </div>

        <style>{`
          .mini-wrap {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding-left: 14px;
            padding-right: 12px;
            padding-bottom: 14px;
            background: var(--bg);
            box-sizing: border-box;
            overflow: hidden;
            cursor: move;
            user-select: none;
          }

          .mini-header {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
          }

          .mini-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--accent);
            flex-shrink: 0;
          }

          .mini-mode-name {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.03em;
            color: var(--accent);
            flex: 1;
          }

          .mini-unpin {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent-dim);
            color: var(--accent);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            flex-shrink: 0;
            cursor: pointer;
          }

          .mini-unpin:hover {
            background: var(--accent);
            color: white;
          }

          .mini-time {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: 800;
            letter-spacing: -2px;
            font-variant-numeric: tabular-nums;
            color: var(--text);
            line-height: 1;
            min-height: 0;
          }

          .mini-time--editable:hover {
            color: var(--accent);
          }

          .mini-edit {
            display: inline-flex;
            align-items: baseline;
            gap: 3px;
          }

          .mini-edit-input {
            width: 56px;
            font-size: 40px;
            font-weight: 800;
            letter-spacing: -2px;
            background: none;
            border: none;
            border-bottom: 2px solid var(--accent);
            border-radius: 0;
            color: var(--accent);
            padding: 0;
            outline: none;
            text-align: center;
            user-select: text;
            cursor: text;
          }

          .mini-edit-unit {
            font-size: 14px;
            color: var(--text-muted);
          }

          .mini-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .mini-play {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 5px 14px;
            background: var(--accent);
            color: white;
            border-radius: var(--radius-full);
            font-size: 11px;
            font-weight: 600;
            transition: all 0.15s;
            white-space: nowrap;
            cursor: pointer;
          }

          .mini-play:hover {
            filter: brightness(1.1);
          }

          .mini-reset {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: var(--surface-2);
            color: var(--text-muted);
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            flex-shrink: 0;
            cursor: pointer;
          }

          .mini-reset:hover {
            background: var(--border);
            color: var(--text);
          }
        `}</style>
      </div>
    )
  }

  // ── Full view ────────────────────────────────────────────────
  const progress = timeLeft / effectiveTotal
  const R = 110
  const circumference = 2 * Math.PI * R
  const dashOffset = circumference * (1 - progress)
  const activeTask = tasks.find(t => t.id === activeTaskId)

  return (
    <div className="timer-page" data-mode={mode}>
      <div className="mode-selector">
        {[MODES.FOCUS, MODES.SHORT, MODES.LONG].map(m => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => switchMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <button
          className="pin-btn"
          onClick={togglePin}
          title="迷你置顶"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M12 2l3 7h5l-4 5 2 7-6-4-6 4 2-7-4-5h5z" />
          </svg>
        </button>
        <div className="timer-circle-wrap">
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
            <circle
              cx="130" cy="130" r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className="timer-center">
            <div
              className={`timer-time ${!isRunning ? 'timer-time--editable' : ''}`}
              onClick={startEdit}
              title={!isRunning ? '点击修改时长' : undefined}
            >
              {editingDuration ? (
                <span className="full-edit">
                  <input
                    type="number"
                    value={editInput}
                    min={1}
                    max={180}
                    onChange={e => setEditInput(e.target.value)}
                    onKeyDown={handleEditKey}
                    onBlur={confirmEdit}
                    autoFocus
                    className="full-edit-input"
                  />
                  <span className="full-edit-unit">分钟</span>
                </span>
              ) : (
                formatTime(timeLeft)
              )}
            </div>
            <div className="timer-label">{MODE_LABELS[mode]}</div>
          </div>
        </div>
      </div>

      <div className="cycle-indicator">
        第 {(pomodoroCount % settings.longBreakInterval) + (mode === MODES.FOCUS ? 1 : 0)} / {settings.longBreakInterval} 个番茄
      </div>

      <div className="timer-controls">
        <button className="btn-icon" onClick={reset} title="重置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
        {isRunning ? (
          <button className="btn btn-primary timer-main-btn" onClick={pause}>暂停</button>
        ) : (
          <button className="btn btn-primary timer-main-btn" onClick={start}>
            {timeLeft === effectiveTotal ? '开始' : '继续'}
          </button>
        )}
        <div style={{ width: 36 }} />
      </div>

      {activeTask && (
        <div className="active-task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>{activeTask.name}</span>
          <span className="task-pomo-count">
            {activeTask.completedPomodoros}/{activeTask.estimatedPomodoros}
          </span>
        </div>
      )}

      <style>{`
        .timer-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 8px;
        }

        .pin-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 1;
          width: 30px;
          height: 30px;
          border-radius: var(--radius-full);
          background: var(--surface-2);
          color: var(--text-dim);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .pin-btn:hover {
          background: var(--accent-dim);
          color: var(--accent);
          border-color: var(--accent);
        }

        .mode-selector {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          padding: 3px;
          gap: 2px;
          margin-bottom: 28px;
        }

        .mode-btn {
          padding: 7px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .mode-btn:hover { color: var(--text); }
        .mode-btn.active { background: var(--accent); color: white; }

        .timer-circle-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .timer-center {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .timer-time {
          font-size: 52px;
          font-weight: 700;
          letter-spacing: -2px;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          color: var(--text);
          transition: color 0.15s;
        }

        .timer-time--editable { cursor: text; }
        .timer-time--editable:hover { color: var(--accent); }

        .full-edit {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
        }

        .full-edit-input {
          width: 80px;
          font-size: 52px;
          font-weight: 700;
          letter-spacing: -2px;
          background: none;
          border: none;
          border-bottom: 3px solid var(--accent);
          border-radius: 0;
          color: var(--accent);
          padding: 0;
          outline: none;
          text-align: center;
          user-select: text;
        }

        .full-edit-unit {
          font-size: 16px;
          color: var(--text-muted);
        }

        .timer-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .cycle-indicator {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 28px;
          letter-spacing: 0.02em;
        }

        .timer-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .timer-main-btn {
          min-width: 140px;
          height: 52px;
          font-size: 16px;
          letter-spacing: 0.02em;
        }

        .active-task {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent-dim);
          border: 1px solid var(--accent);
          border-radius: var(--radius-full);
          padding: 8px 16px;
          font-size: 13px;
          color: var(--text-muted);
          max-width: 300px;
        }

        .active-task svg { color: var(--accent); flex-shrink: 0; }
        .active-task span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .task-pomo-count { font-size: 12px; color: var(--accent); font-weight: 600; flex-shrink: 0; }
      `}</style>
    </div>
  )
}
