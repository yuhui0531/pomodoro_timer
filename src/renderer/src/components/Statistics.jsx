function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}

export default function Statistics({ stats }) {
  const today = todayKey()
  const todayData = stats[today] || { completed: 0, focusedMinutes: 0 }
  const last7 = getLast7Days()

  const maxCompleted = Math.max(1, ...last7.map(d => (stats[d] || {}).completed || 0))
  const totalCompleted = Object.values(stats).reduce((s, d) => s + (d.completed || 0), 0)
  const totalMinutes = Object.values(stats).reduce((s, d) => s + (d.focusedMinutes || 0), 0)

  return (
    <div className="stats-page">
      {/* Today */}
      <div className="section-title">今日</div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{todayData.completed}</div>
          <div className="stat-label">完成番茄</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(todayData.focusedMinutes)}</div>
          <div className="stat-label">专注分钟</div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="section-title" style={{ marginTop: 20 }}>近7天</div>
      <div className="card">
        <div className="bar-chart">
          {last7.map(date => {
            const count = (stats[date] || {}).completed || 0
            const heightPct = maxCompleted > 0 ? (count / maxCompleted) * 100 : 0
            const isToday = date === today
            return (
              <div key={date} className="bar-col">
                <div className="bar-count">{count > 0 ? count : ''}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      background: isToday ? 'var(--focus)' : 'var(--surface-2)',
                      border: isToday ? '1px solid var(--focus)' : '1px solid var(--border)',
                    }}
                  />
                </div>
                <div className={`bar-label ${isToday ? 'today' : ''}`}>{dayLabel(date)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="section-title" style={{ marginTop: 20 }}>累计</div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalCompleted}</div>
          <div className="stat-label">总番茄数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(totalMinutes / 60 * 10) / 10}</div>
          <div className="stat-label">总专注小时</div>
        </div>
      </div>

      <style>{`
        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 8px;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px 16px;
          text-align: center;
        }

        .stat-value {
          font-size: 36px;
          font-weight: 700;
          color: var(--focus);
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 120px;
        }

        .bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          gap: 4px;
        }

        .bar-count {
          font-size: 11px;
          color: var(--text-dim);
          height: 16px;
          display: flex;
          align-items: center;
        }

        .bar-track {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          background: var(--bg);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          width: 100%;
          min-height: 4px;
          border-radius: 4px 4px 0 0;
          transition: height 0.4s ease;
        }

        .bar-label {
          font-size: 11px;
          color: var(--text-dim);
          font-weight: 500;
        }

        .bar-label.today {
          color: var(--focus);
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
