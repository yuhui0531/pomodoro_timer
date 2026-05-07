import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'

const MINI_SIZE  = [260, 150]
const FULL_SIZE  = [450, 800]

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: FULL_SIZE[0],
    height: FULL_SIZE[1],
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

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
  if (!win) return
  if (flag) {
    win.setAlwaysOnTop(true, 'floating')
    win.setContentSize(...MINI_SIZE)
  } else {
    win.setAlwaysOnTop(false)
    win.setContentSize(...FULL_SIZE)
  }
})

ipcMain.on('set-opacity', (_, value) => {
  if (!win) return
  win.setOpacity(Math.max(0.1, Math.min(1, value)))
})

ipcMain.on('move-window', (_, { dx, dy }) => {
  if (!win) return
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
