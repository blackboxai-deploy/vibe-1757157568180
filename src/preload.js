const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Stats management
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveStats: (stats) => ipcRenderer.invoke('save-stats', stats),
  
  // Session history
  getSessionHistory: () => ipcRenderer.invoke('get-session-history'),
  addSession: (session) => ipcRenderer.invoke('add-session', session),
  clearSessionHistory: () => ipcRenderer.invoke('clear-session-history'),
  
  // Data export/import
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (data) => ipcRenderer.invoke('import-data', data),
  
  // Notifications
  showNotification: (title, body, options) => ipcRenderer.invoke('show-notification', title, body, options),
  
  // System tray
  updateTray: (data) => ipcRenderer.invoke('update-tray', data),
  
  // Global shortcuts and tray events
  onTrayTimerToggle: (callback) => ipcRenderer.on('tray-timer-toggle', callback),
  onTrayTimerReset: (callback) => ipcRenderer.on('tray-timer-reset', callback),
  onGlobalShortcutToggle: (callback) => ipcRenderer.on('global-shortcut-toggle', callback),
  onGlobalShortcutReset: (callback) => ipcRenderer.on('global-shortcut-reset', callback),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // File system access
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});