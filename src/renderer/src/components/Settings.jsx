const THEMES = [
  { id: 'midnight', name: '深夜',   bg: '#0f172a', accent: '#f97316' },
  { id: 'charcoal', name: '炭灰',   bg: '#18181b', accent: '#f43f5e' },
  { id: 'coffee',   name: '咖啡',   bg: '#1c1410', accent: '#f59e0b' },
  { id: 'forest',   name: '森林',   bg: '#0d1f17', accent: '#fb923c' },
  { id: 'lavender', name: '薰衣草', bg: '#0f0a1e', accent: '#f472b6' },
  { id: 'tomato',   name: '番茄',   bg: '#fff5f0', accent: '#c1121f' },
  { id: 'warm-light', name: '暖砂', bg: '#f7f2ec', accent: '#c65a4a' },
  { id: 'light',    name: '浅色',   bg: '#f8fafc', accent: '#ea580c' },
]

export default function Settings({ settings, onChange }) {
  function update(key, value) {
    onChange(prev => ({ ...prev, [key]: value }))
  }

  function handleWheel(e) {
    const scrollContainer = e.currentTarget.closest('.app-content')
    if (!scrollContainer) return
    e.preventDefault()
    scrollContainer.scrollBy({ top: e.deltaY })
  }

  return (
    <div className="settings-page" onWheel={handleWheel}>
      {/* Theme */}
      <div className="section-title">外观主题</div>
      <div className="card">
        <div className="theme-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-swatch ${settings.theme === t.id ? 'selected' : ''}`}
              onClick={() => update('theme', t.id)}
              style={{ '--swatch-bg': t.bg, '--swatch-accent': t.accent }}
            >
              <span className="swatch-preview">
                <span className="swatch-dot" />
              </span>
              <span className="swatch-name">{t.name}</span>
              {settings.theme === t.id && (
                <span className="swatch-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className="section-title" style={{ marginTop: 20 }}>窗口透明度</div>
      <div className="card">
        <div className="setting-row">
          <div>
            <div className="setting-label">透明度</div>
            <div className="setting-desc">置顶时透过窗口查看屏幕内容</div>
          </div>
          <div className="setting-slider-wrap">
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={Math.round((settings.opacity ?? 1) * 100)}
              onChange={e => update('opacity', parseInt(e.target.value) / 100)}
            />
            <span className="setting-slider-val">{Math.round((settings.opacity ?? 1) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Duration settings */}
      <div className="section-title">时长设置</div>
      <div className="card">
        <DurationRow
          label="专注时长"
          value={settings.focusDuration}
          min={5} max={60}
          onChange={v => update('focusDuration', v)}
        />
        <Divider />
        <DurationRow
          label="短休时长"
          value={settings.shortBreakDuration}
          min={1} max={30}
          onChange={v => update('shortBreakDuration', v)}
        />
        <Divider />
        <DurationRow
          label="长休时长"
          value={settings.longBreakDuration}
          min={5} max={60}
          onChange={v => update('longBreakDuration', v)}
        />
        <Divider />
        <div className="setting-row">
          <div>
            <div className="setting-label">长休间隔</div>
            <div className="setting-desc">每几个番茄后长休息</div>
          </div>
          <div className="step-control">
            <button
              className="step-btn"
              onClick={() => update('longBreakInterval', Math.max(2, settings.longBreakInterval - 1))}
            >−</button>
            <span className="step-value">{settings.longBreakInterval}</span>
            <button
              className="step-btn"
              onClick={() => update('longBreakInterval', Math.min(8, settings.longBreakInterval + 1))}
            >+</button>
          </div>
        </div>
      </div>

      {/* Auto-start */}
      <div className="section-title" style={{ marginTop: 20 }}>自动控制</div>
      <div className="card">
        <ToggleRow
          label="自动开始休息"
          desc="专注结束后自动进入休息"
          checked={settings.autoStartBreaks}
          onChange={v => update('autoStartBreaks', v)}
        />
        <Divider />
        <ToggleRow
          label="自动开始专注"
          desc="休息结束后自动进入专注"
          checked={settings.autoStartFocus}
          onChange={v => update('autoStartFocus', v)}
        />
      </div>

      {/* Notifications */}
      <div className="section-title" style={{ marginTop: 20 }}>通知提醒</div>
      <div className="card">
        <ToggleRow
          label="提示音"
          desc="阶段结束时播放音效"
          checked={settings.soundEnabled}
          onChange={v => update('soundEnabled', v)}
        />
        <Divider />
        <ToggleRow
          label="桌面通知"
          desc="阶段结束时显示系统通知"
          checked={settings.notificationsEnabled}
          onChange={v => update('notificationsEnabled', v)}
        />
      </div>

      <style>{`
        .theme-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .theme-swatch {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 6px 8px;
          border-radius: var(--radius);
          border: 2px solid var(--border);
          background: var(--surface-2);
          cursor: pointer;
          transition: all 0.15s;
        }

        .theme-swatch:hover {
          border-color: var(--text-muted);
        }

        .theme-swatch.selected {
          border-color: var(--accent);
          background: var(--accent-dim);
        }

        .swatch-preview {
          width: 40px;
          height: 28px;
          border-radius: 6px;
          background: var(--swatch-bg);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .swatch-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--swatch-accent);
        }

        .swatch-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .theme-swatch.selected .swatch-name {
          color: var(--accent);
        }

        .swatch-check {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 4px 0;
        }

        .setting-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 2px;
        }

        .setting-desc {
          font-size: 12px;
          color: var(--text-dim);
        }

        .setting-slider-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 160px;
        }

        .setting-slider-val {
          font-size: 14px;
          font-weight: 700;
          color: var(--focus);
          min-width: 36px;
          text-align: right;
        }

        .step-control {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .step-btn {
          width: 34px;
          height: 34px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-btn:hover {
          background: var(--border);
          color: var(--text);
        }

        .step-value {
          min-width: 28px;
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }
      `}</style>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
}

function DurationRow({ label, value, min, max, onChange }) {
  return (
    <div className="setting-row">
      <div className="setting-label">{label}</div>
      <div className="setting-slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
        />
        <span className="setting-slider-val">{value}m</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
