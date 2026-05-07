import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', { dx, dy }),
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
})
