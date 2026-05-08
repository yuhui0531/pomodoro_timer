import { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'

const MINI_SIZE = [260, 150]
const FULL_SIZE = [450, 800]
const isMac = process.platform === 'darwin'
const MODE_LABEL_PREFIXES = {
  focus: '专注',
  short: '短休',
  long: '长休',
}

let win = null
let tray = null
let isQuitting = false
let trayState = {
  mode: 'focus',
  modeLabel: '专注',
  timeText: '番茄钟',
  isRunning: false,
  hasStarted: false,
  activeTaskName: null,
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <g fill="none" stroke="black" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6.5 2.5h3" />
        <path d="M8 2.5v2" />
        <circle cx="8" cy="9" r="5" />
        <path d="M8 9l2.2-1.8" />
      </g>
    </svg>
  `.trim()
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  image.setTemplateImage(true)
  return image.resize({ width: 16, height: 16 })
}

function hasWindow() {
  return win && !win.isDestroyed()
}

function isWindowVisible() {
  return Boolean(hasWindow() && win.isVisible())
}

function getTrayTitle() {
  const modeLabel = MODE_LABEL_PREFIXES[trayState.mode] || trayState.modeLabel || '番茄钟'
  const timeText = trayState.timeText || ''

  return [modeLabel, timeText].filter(Boolean).join(' ')
}

function updateTrayDisplay() {
  if (!tray) return

  const title = getTrayTitle()
  tray.setTitle(title)
  tray.setToolTip(trayState.activeTaskName ? `${title} · ${trayState.activeTaskName}` : title)
}

function sendMenuBarCommand(command) {
  if (!hasWindow()) return
  win.webContents.send('menu-bar-command', command)
}

function buildTrayMenu() {
  const playLabel = trayState.isRunning ? '暂停' : (trayState.hasStarted ? '继续' : '开始')

  return Menu.buildFromTemplate([
    { label: `${trayState.modeLabel} ${trayState.timeText}`, enabled: false },
    ...(trayState.activeTaskName
      ? [{ label: `任务：${trayState.activeTaskName}`, enabled: false }]
      : []),
    { type: 'separator' },
    { label: playLabel, click: () => sendMenuBarCommand('toggle-run') },
    { label: '重置', click: () => sendMenuBarCommand('reset') },
    { type: 'separator' },
    { label: isWindowVisible() ? '隐藏窗口' : '显示窗口', click: toggleWindow },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
}

function restoreWindow() {
  if (hasWindow()) {
    showWindow()
  } else {
    createWindow()
  }
}

function showWindow() {
  if (!hasWindow()) return
  win.show()
  app.focus({ steal: true })
  win.focus()
  updateTrayDisplay()
}

function hideWindow() {
  if (!hasWindow()) return
  win.hide()
  updateTrayDisplay()
}

function toggleWindow() {
  if (isWindowVisible()) {
    hideWindow()
  } else {
    showWindow()
  }
}

function createTray() {
  if (!isMac || tray) return

  tray = new Tray(createTrayImage())
  updateTrayDisplay()
  tray.on('click', toggleWindow)
  tray.on('right-click', () => {
    tray.popUpContextMenu(buildTrayMenu())
  })
}

function createWindow({ initiallyVisible = true } = {}) {
  win = new BrowserWindow({
    width: FULL_SIZE[0],
    height: FULL_SIZE[1],
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
    }
  })

  win.on('ready-to-show', () => {
    if (initiallyVisible) {
      win.show()
    }
    updateTrayDisplay()
  })

  win.on('show', updateTrayDisplay)
  win.on('hide', updateTrayDisplay)
  win.on('closed', () => {
    win = null
    updateTrayDisplay()
  })

  if (isMac) {
    win.on('close', (event) => {
      if (isQuitting) return
      event.preventDefault()
      hideWindow()
    })
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.on('set-always-on-top', (_, flag) => {
  if (!hasWindow()) return
  if (flag) {
    win.setAlwaysOnTop(true, 'floating')
    win.setContentSize(...MINI_SIZE)
  } else {
    win.setAlwaysOnTop(false)
    win.setContentSize(...FULL_SIZE)
  }
})

ipcMain.on('set-opacity', (_, value) => {
  if (!hasWindow()) return
  win.setOpacity(Math.max(0.1, Math.min(1, value)))
})

ipcMain.on('move-window', (_, { dx, dy }) => {
  if (!hasWindow()) return
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
})

ipcMain.on('sync-tray-state', (_, nextState) => {
  trayState = { ...trayState, ...nextState }
  updateTrayDisplay()
})

app.on('second-instance', () => {
  restoreWindow()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  if (isMac) {
    app.dock.hide()
  }

  app.on('activate', () => {
    restoreWindow()
  })
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
