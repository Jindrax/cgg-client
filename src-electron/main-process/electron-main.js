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

//Objeto que contiene la ventana principal de la aplicacion
let mainWindow;
//Bandera que determina si la aplicacion tiene una sesion iniciada o no
let logged = false;
//Referencia de un temporizador para su posterior detencion
let timer = null;
//Bandera que determina si la aplicacion se puede cerrar por las vias normales de cerrado para un usuario estandar
let closable = !!process.env.DEV;

/**
 * Funcion encargada de mantener el estado de bloqueo sobre el equipo
 */
function watcher() {
  //mainWindow.setFullScreen(true)
  //Funcion que llama la atencion del explorador a la aplicacion
  mainWindow.focus();
  //Funcion que muestra la aplicacion como la ventana principal en el escritorio
  mainWindow.show();
  //Funcion que centra la aplicacion en la pantalla
  mainWindow.center();
  //Agendamos el siguiente ciclo de monitoreo en 200 ms
  timer = setTimeout(watcher, 200)
}

/**
 * Funcion que instancia una ventana en un proceso renderizador e inicia el proceso de bloqueo sobre el equipo
 */
function createWindow() {
  //Obtenemos los valores de altura y anchura de la pantalla
  const {
    width,
    height
  } = screen.getPrimaryDisplay().workAreaSize;
  //Creamos una nueva ventana principal
  const opciones = {
    width: 300,
    height: 150,
    useContentSize: true,
  };
  if(!process.env.DEV){
    //Indicamos que la ventana siempre tiene que estar encima en el escritorio
    opciones.alwaysOnTop = true;
    //Retiramos el marco de la ventana para eliminar los controles de estado (minimizar, maximizar, cerrar)
    opciones.frame = false;
    //La ventana no puede ser minimizable
    opciones.minimizable = false;
    //La ventana no responde al comando de cerrar normalmente (alt+f4)
    opciones.closable = false;
    //La ventana no aparece en la barra de tareas
    opciones.skipTaskbar = true;
    //La ventana no puede cambiar de tamaño
    opciones.resizable = false;
  }
  mainWindow = new BrowserWindow(opciones);
  //Maximizamos la ventana para que ocupe el escritorio
  mainWindow.maximize();
  //Cargamos la aplicacion en la ventana
  mainWindow.loadURL(process.env.APP_URL);
  //Escuchamos el evento de cerrado
  mainWindow.on('close', (event) => {
    if (!closable) {
      //Si la bandera no permite cerrado evitamos el comportamiento normal
      event.preventDefault()
    }
  });
  //Escuchamos el evento en el que ya se ha cerrado la ventana
  mainWindow.on('closed', () => {
    //Eliminamos el objeto de la ventana
    mainWindow = null
  });
  //Agendamos el temporizador para el monitoreo del bloqueo solo si estamos en modo de produccion
  if(!process.env.DEV){
    timer = setTimeout(watcher, 200);
  }
}

//Nombre de la aplicacion para windows, permite el uso de notificaciones
app.setAppUserModelId('com.jindrax.cgg.client');

//Escuchamos el evento en el que la aplicacion esta lista para trabajar, cuando lo esta iniciamos el proceso de instanciado de la ventana
app.on('ready', createWindow);

//Escuchamos el evento en el que se han cerrado todas las ventanas, en este caso la aplicacion termina
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

//Escuchamos el evento en el que la aplicacion se activa, si la ventana principal no esta instanciada la instancia
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
});

//Escuchamos el evento en el que el proceso renderizador solicita el inicio de sesion
ipcMain.on('log_in', (event) => {
  //Si existe un temporizador agendado lo termina
  if (timer) {
    clearTimeout(timer);
  }
  //Indica que la aplicacion tiene una sesion iniciada
  logged = true;
  //Modifica el tamaño de la ventana y la centra en la pantalla
  mainWindow.unmaximize();
  mainWindow.setSize(300, 150);
  mainWindow.center();
  //Si estamos en produccion cambiamos los permisos de la ventana
  if(!process.env.DEV){
    //Permite que la ventana pueda ocultarse por otras ventanas
    mainWindow.setAlwaysOnTop(false);
    //Permite que la ventana pueda moverse
    mainWindow.setMovable(true);
    //Permite que la ventana tenga un icono en la barra de tareas
    mainWindow.setSkipTaskbar(false);
  }
  //Envia un mensaje de vuelta al proceso renderizador notificando los cambios
  event.sender.send('logged_in');
});

//Escuchamos el evento en el que el proceso renderizador solicita el cierre de sesion
ipcMain.on('log_out', (event) => {
  //Indica que la aplicacion esta en espera de un inicio de sesion
  logged = false;
  //Centramos la ventana
  mainWindow.center();
  //Retiramos los permisos concedidos en el inicio de sesion si estamos en entorno de produccion
  if(!process.env.DEV){
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setMovable(false);
    mainWindow.setSkipTaskbar(true);
  }
  mainWindow.maximize();
  mainWindow.maximize();
  //Notificamos al proceso renderizador sobre los cambios
  event.sender.send('logged_out');
  //Agendamos el monitoreo del bloqueo sobre el equipo
  if(!process.env.DEV){
    timer = setTimeout(watcher, 200);
  }
});

//Escuchamos el evento en el que el proceso renderizador solicita configuraciones locales
ipcMain.on('getSettings', (event) => {
  //Enviamos las configuraciones requeridas al proceso renderizador
  event.sender.send('settings_ret', settings.get('settings', {
    equipo: 0
  }));
});

//Escuchamos el evento en el que el proceso renderizador solicita establecer configuraciones locales
ipcMain.on('setSettings', (event, setting) => {
  settings.set('settings', setting);
  //Enviamos una notificacion sobre el exito del proceso
  event.sender.send('settings_set', settings);
});

//Escuchamos el evento en el que el proceso renderizador solicita el cierre de la aplicacion
ipcMain.on('close', () => {
  closable = true;
  //Cerramos la aplicacion
  app.exit(0)
});
