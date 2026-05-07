import React from 'react'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function getMonthDays(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days = []
  // 前面的空白日期
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  // 当月日期
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}

function monthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

export default function Statistics({ stats }) {
  const today = todayKey()
  const todayData = stats[today] || { completed: 0, focusedMinutes: 0 }
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const monthDays = getMonthDays(currentMonth)
  const maxCompleted = Math.max(1, ...Object.values(stats).map(d => d.completed || 0))
  const totalCompleted = Object.values(stats).reduce((s, d) => s + (d.completed || 0), 0)
  const totalMinutes = Object.values(stats).reduce((s, d) => s + (d.focusedMinutes || 0), 0)

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  function goToday() {
    setCurrentMonth(new Date())
  }

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

      {/* Monthly calendar */}
      <div className="section-title" style={{ marginTop: 20 }}>日历</div>
      <div className="card">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
          <div className="calendar-month-label">{monthLabel(currentMonth.toISOString().split('T')[0])}</div>
          <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
          <button className="calendar-today-btn" onClick={goToday}>今天</button>
        </div>

        <div className="calendar-weekdays">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {monthDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="calendar-day-empty" />
            }
            const count = (stats[date] || {}).completed || 0
            const isToday = date === today
            const intensity = maxCompleted > 0 ? count / maxCompleted : 0
            const dayNum = new Date(date + 'T00:00:00').getDate()

            return (
              <div key={date} className="calendar-day">
                <div className={`calendar-cell ${isToday ? 'today' : ''}`} style={{
                  background: count === 0
                    ? 'var(--surface)'
                    : `rgba(var(--focus-rgb), ${0.2 + intensity * 0.8})`,
                }}>
                  <div className="calendar-date">{dayNum}</div>
                  {count > 0 && <div className="calendar-count">{count}</div>}
                </div>
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

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 8px;
        }

        .calendar-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: var(--surface-2);
          color: var(--text);
          border: none;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .calendar-nav-btn:hover {
          background: var(--border);
        }

        .calendar-month-label {
          flex: 1;
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }

        .calendar-today-btn {
          padding: 6px 12px;
          border-radius: 6px;
          background: var(--focus);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .calendar-today-btn:hover {
          filter: brightness(1.1);
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .calendar-weekday {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dim);
          padding: 8px 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-day {
          aspect-ratio: 1;
        }

        .calendar-day-empty {
          aspect-ratio: 1;
        }

        .calendar-cell {
          width: 100%;
          height: 100%;
          border-radius: 6px;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          transition: all 0.3s ease;
          cursor: default;
          padding: 4px;
        }

        .calendar-cell.today {
          border: 2px solid var(--focus);
          box-shadow: 0 0 0 1px var(--focus);
        }

        .calendar-cell:hover {
          border-color: var(--focus);
        }

        .calendar-date {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .calendar-count {
          font-size: 11px;
          font-weight: 700;
          color: var(--focus);
        }

        .calendar-label {
          font-size: 11px;
          color: var(--text-dim);
          font-weight: 500;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
