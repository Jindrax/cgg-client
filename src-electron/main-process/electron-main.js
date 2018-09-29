import {
  app,
  BrowserWindow,
  screen,
  ipcMain
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

function watcher(){
  mainWindow.setFullScreen(true)
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

  mainWindow = new BrowserWindow({
    width: 300,
    height: 150,
    useContentSize: true,
    //modificado por pruebas
    alwaysOnTop: true,
    frame: false,
    minimizable: false,
    closable: false,
    //modificado por pruebas
    skipTaskbar: true,
    resizable: false,
    fullscreen: true
  })

  mainWindow.maximize();

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('close', (event) => {
    if (!allowed) {
      event.preventDefault();
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  timer = setTimeout(watcher, 200)
}

app.setAppUserModelId('cgg_client');

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
  if(timer){
    clearTimeout(timer)
  }
  console.log('Permiso para cerrar otorgado')
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
  console.log('Permiso para cerrar denegado')
  logged = false
  mainWindow.center()
  //modificado por pruebas
  mainWindow.setAlwaysOnTop(true)
  mainWindow.setMovable(false)
  //modificado por pruebas
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
