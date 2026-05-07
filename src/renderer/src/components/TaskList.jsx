import { useState } from 'react'

export default function TaskList({ tasks, activeTaskId, onTasksChange, onSetActive }) {
  const [input, setInput] = useState('')
  const [estimated, setEstimated] = useState(1)

  function addTask() {
    const name = input.trim()
    if (!name) return
    const task = {
      id: Date.now().toString(),
      name,
      estimatedPomodoros: Math.max(1, estimated),
      completedPomodoros: 0,
      done: false,
      createdAt: Date.now(),
    }
    onTasksChange(prev => [task, ...prev])
    setInput('')
    setEstimated(1)
  }

  function deleteTask(id) {
    onTasksChange(prev => prev.filter(t => t.id !== id))
  }

  function toggleDone(id) {
    onTasksChange(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const activeTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  return (
    <div className="task-page">
      {/* Add task */}
      <div className="card add-task-card">
        <div className="add-task-row">
          <input
            type="text"
            placeholder="添加新任务..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            style={{ flex: 1 }}
          />
          <div className="est-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--text-dim)' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <input
              type="number"
              min="1"
              max="20"
              value={estimated}
              onChange={e => setEstimated(parseInt(e.target.value) || 1)}
              style={{ width: 48, textAlign: 'center', padding: '10px 6px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={addTask} style={{ padding: '10px 16px' }}>
            添加
          </button>
        </div>
      </div>

      {/* Active tasks */}
      {activeTasks.length === 0 && doneTasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🍅</div>
          <div>暂无任务</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>添加任务开始专注吧</div>
        </div>
      )}

      {activeTasks.length > 0 && (
        <>
          <div className="section-title">待完成</div>
          <div className="task-list">
            {activeTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isActive={task.id === activeTaskId}
                onSetActive={() => onSetActive(task.id === activeTaskId ? null : task.id)}
                onToggleDone={() => toggleDone(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        </>
      )}

      {doneTasks.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>已完成</div>
          <div className="task-list">
            {doneTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isActive={false}
                onSetActive={() => {}}
                onToggleDone={() => toggleDone(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .add-task-card {
          margin-bottom: 20px;
        }

        .add-task-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .est-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0 8px;
        }

        .est-wrap input {
          background: none;
          border: none;
          padding: 10px 4px;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 14px;
          transition: border-color 0.15s;
        }

        .task-item.is-active {
          border-color: var(--focus);
          background: var(--focus-dim);
        }

        .task-item.is-done {
          opacity: 0.5;
        }

        .task-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border);
          flex-shrink: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .task-item:not(.is-done) .task-check:hover {
          border-color: var(--focus);
        }

        .task-item.is-done .task-check {
          background: var(--focus);
          border-color: var(--focus);
        }

        .task-name {
          flex: 1;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .task-item.is-done .task-name {
          text-decoration: line-through;
          color: var(--text-dim);
        }

        .task-pomo {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .task-focus-btn {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          background: var(--surface-2);
          color: var(--text-muted);
          border: 1px solid var(--border);
          transition: all 0.15s;
        }

        .task-focus-btn:hover,
        .task-item.is-active .task-focus-btn {
          background: var(--focus-dim);
          color: var(--focus);
          border-color: var(--focus);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 48px 0;
          color: var(--text-muted);
          font-size: 14px;
        }

        .empty-icon {
          font-size: 40px;
        }
      `}</style>
    </div>
  )
}

function TaskItem({ task, isActive, onSetActive, onToggleDone, onDelete }) {
  return (
    <div className={`task-item ${isActive ? 'is-active' : ''} ${task.done ? 'is-done' : ''}`}>
      <button className="task-check" onClick={onToggleDone}>
        {task.done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" width="12" height="12">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className="task-name">{task.name}</span>

      <div className="task-pomo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        {task.completedPomodoros}/{task.estimatedPomodoros}
      </div>

      {!task.done && (
        <button className="task-focus-btn" onClick={onSetActive}>
          {isActive ? '专注中' : '专注'}
        </button>
      )}

      <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={onDelete}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
