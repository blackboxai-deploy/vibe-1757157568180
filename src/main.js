const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;
let store;

// Initialize electron-store
const schema = {
  settings: {
    type: 'object',
    properties: {
      focusTime: { type: 'number', minimum: 1, maximum: 120, default: 25 },
      shortBreakTime: { type: 'number', minimum: 1, maximum: 60, default: 5 },
      longBreakTime: { type: 'number', minimum: 1, maximum: 120, default: 15 },
      sessionsBeforeLongBreak: { type: 'number', minimum: 2, maximum: 20, default: 4 },
      autoStartBreaks: { type: 'boolean', default: false },
      autoStartPomodoros: { type: 'boolean', default: false },
      alwaysOnTop: { type: 'boolean', default: false },
      theme: { type: 'string', enum: ['light', 'dark', 'auto'], default: 'auto' },
      soundEnabled: { type: 'boolean', default: true },
      notificationsEnabled: { type: 'boolean', default: true },
      minimizeToTray: { type: 'boolean', default: true }
    },
    default: {}
  },
  stats: {
    type: 'object',
    properties: {
      completedSessions: { type: 'number', default: 0 },
      totalMinutes: { type: 'number', default: 0 },
      streakCount: { type: 'number', default: 0 },
      dailyGoal: { type: 'number', default: 8 },
      weeklyGoal: { type: 'number', default: 40 }
    },
    default: {}
  },
  sessionHistory: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        type: { type: 'string' },
        duration: { type: 'number' },
        completed: { type: 'boolean' }
      }
    },
    default: []
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: true,
    minWidth: 400,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    alwaysOnTop: store?.get('settings.alwaysOnTop', false)
  });

  // Load the HTML file directly (no dev server for Electron app)
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    const minimizeToTray = store?.get('settings.minimizeToTray', true);
    if (!app.isQuiting && minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle always on top changes
  mainWindow.on('focus', () => {
    const alwaysOnTop = store?.get('settings.alwaysOnTop', false);
    mainWindow.setAlwaysOnTop(alwaysOnTop);
  });
}

function createTray() {
  // Create a simple 16x16 colored square as tray icon if no icon file exists
  const trayIcon = nativeImage.createFromBuffer(
    Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF, 0x61, 0x00, 0x00, 0x00,
      0x4A, 0x49, 0x44, 0x41, 0x54, 0x38, 0x11, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x3F, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ])
  );
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Pomodoro Timer',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show/Hide',
      click: () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    },
    {
      label: 'Start/Pause',
      click: () => {
        mainWindow.webContents.send('tray-timer-toggle');
      }
    },
    {
      label: 'Reset Timer',
      click: () => {
        mainWindow.webContents.send('tray-timer-reset');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('show-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Pomodoro Timer - Ready');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function registerGlobalShortcuts() {
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Alt+P', () => {
    mainWindow.webContents.send('global-shortcut-toggle');
  });
  
  globalShortcut.register('CommandOrControl+Alt+R', () => {
    mainWindow.webContents.send('global-shortcut-reset');
  });
  
  globalShortcut.register('CommandOrControl+Alt+S', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // Initialize store after app is ready
  store = new Store({ schema });
  
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
});

app.on('will-quit', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
});

// Settings IPC handlers
ipcMain.handle('get-settings', () => {
  return store.get('settings', {});
});

ipcMain.handle('save-settings', (event, settings) => {
  // Validate settings before saving
  const validatedSettings = {};
  Object.keys(settings).forEach(key => {
    const schemaProperty = schema.settings.properties[key];
    if (schemaProperty) {
      let value = settings[key];
      
      // Type validation
      if (schemaProperty.type === 'number' && typeof value === 'string') {
        value = parseFloat(value);
      }
      if (schemaProperty.type === 'boolean' && typeof value === 'string') {
        value = value === 'true';
      }
      
      // Range validation
      if (schemaProperty.minimum && value < schemaProperty.minimum) {
        value = schemaProperty.minimum;
      }
      if (schemaProperty.maximum && value > schemaProperty.maximum) {
        value = schemaProperty.maximum;
      }
      
      validatedSettings[key] = value;
    }
  });
  
  store.set('settings', { ...store.get('settings', {}), ...validatedSettings });
  
  // Apply settings that affect the main process
  if (validatedSettings.alwaysOnTop !== undefined && mainWindow) {
    mainWindow.setAlwaysOnTop(validatedSettings.alwaysOnTop);
  }
  
  return store.get('settings');
});

// Stats IPC handlers
ipcMain.handle('get-stats', () => {
  return store.get('stats', {});
});

ipcMain.handle('save-stats', (event, stats) => {
  store.set('stats', { ...store.get('stats', {}), ...stats });
  return store.get('stats');
});

// Session history IPC handlers
ipcMain.handle('get-session-history', () => {
  return store.get('sessionHistory', []);
});

ipcMain.handle('add-session', (event, session) => {
  const history = store.get('sessionHistory', []);
  history.push({
    ...session,
    timestamp: new Date().toISOString(),
    id: Date.now()
  });
  
  // Keep only last 1000 sessions
  if (history.length > 1000) {
    history.splice(0, history.length - 1000);
  }
  
  store.set('sessionHistory', history);
  return history;
});

ipcMain.handle('clear-session-history', () => {
  store.set('sessionHistory', []);
  return [];
});

// Window controls
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    const current = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!current);
    store.set('settings.alwaysOnTop', !current);
    return !current;
  }
  return false;
});

// Notifications
ipcMain.handle('show-notification', (event, title, body, options = {}) => {
  const { Notification } = require('electron');
  const notificationsEnabled = store.get('settings.notificationsEnabled', true);
  
  if (Notification.isSupported() && notificationsEnabled) {
    const notification = new Notification({
      title: title,
      body: body,
      sound: store.get('settings.soundEnabled', true),
      silent: !store.get('settings.soundEnabled', true),
      urgency: options.urgent ? 'critical' : 'normal',
      ...options
    });
    
    notification.show();
    
    notification.on('click', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }
});

// Tray updates
ipcMain.handle('update-tray', (event, { title, tooltip }) => {
  if (tray) {
    if (title) tray.setTitle(title);
    if (tooltip) tray.setToolTip(tooltip);
  }
});

// Data export/import
ipcMain.handle('export-data', () => {
  return {
    settings: store.get('settings'),
    stats: store.get('stats'),
    sessionHistory: store.get('sessionHistory'),
    exportDate: new Date().toISOString()
  };
});

ipcMain.handle('import-data', (event, data) => {
  try {
    if (data.settings) store.set('settings', data.settings);
    if (data.stats) store.set('stats', data.stats);
    if (data.sessionHistory) store.set('sessionHistory', data.sessionHistory);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});