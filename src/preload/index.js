import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', { dx, dy }),
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  syncTrayState: (state) => ipcRenderer.send('sync-tray-state', state),
  onMenuBarCommand: (handler) => {
    const listener = (_, command) => handler(command)
    ipcRenderer.on('menu-bar-command', listener)
    return () => ipcRenderer.removeListener('menu-bar-command', listener)
  },
})
