import {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Notification
} from 'electron'
const settings = require('electron-settings');

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = require('path').join(__dirname, 'statics').replace(/\\/g, '\\\\')
}

let mainWindow
let logged = false;
let timer = null;
let closable = false;

function watcher() {
  //mainWindow.setFullScreen(true)
  mainWindow.focus()
  mainWindow.show()
  timer = setTimeout(watcher, 200)
}

function createWindow() {
  /**
   * Initial window options
   */


  const {
    width,
    height
  } = screen.getPrimaryDisplay().workAreaSize

  let not = new Notification({
    title: 'Path to exe',
    body: app.getPath("exe")
  })

  not.show()

  /*var Key = require('windows-registry').Key
  var windef = require('windows-registry').windef

  var key = new Key(windef.HKEY.HKEY_LOCAL_MACHINE, 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', windef.KEY_ACCESS.KEY_ALL_ACCESS)
  key.setValue('CGG Cliente', windef.REG_VALUE_TYPE.REG_SZ, 'app.getPath("exe")')*/

  mainWindow = new BrowserWindow({
    width: 300,
    height: 150,
    useContentSize: true,
    alwaysOnTop: true,
    frame: false,
    minimizable: false,
    closable: false,
    skipTaskbar: true,
    resizable: false
  })

  mainWindow.maximize();

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('close', (event) => {
    if (!closable) {
      event.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  timer = setTimeout(watcher, 200)
}

app.setAppUserModelId('com.jindrax.cgg.client');

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('log_in', (event) => {
  if (timer) {
    clearTimeout(timer)
  }
  logged = true
  mainWindow.unmaximize()
  mainWindow.setSize(300, 150)
  mainWindow.center()
  mainWindow.setAlwaysOnTop(false)
  mainWindow.setMovable(true)
  mainWindow.setSkipTaskbar(false)
  event.sender.send('logged_in');
})

ipcMain.on('log_out', (event) => {
  logged = false
  mainWindow.center()
  mainWindow.setAlwaysOnTop(true)
  mainWindow.setMovable(false)
  mainWindow.setSkipTaskbar(true)
  mainWindow.maximize()
  mainWindow.maximize()
  event.sender.send('logged_out');
  timer = setTimeout(watcher, 200)
})

ipcMain.on('getSettings', (event) => {
  event.sender.send('settings_ret', settings.get('settings', {
    equipo: 0
  }))
})

ipcMain.on('setSettings', (event, setting) => {
  settings.set('settings', setting);
  event.sender.send('settings_set', settings);
})

ipcMain.on('close', (event) => {
  closable = true
  app.exit(0)
})
