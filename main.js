/*try {
  require('electron-reloader')(module)
} catch (_) {}*/
require('@electron/remote/main').initialize()
const debug = require('electron-debug');

debug();

const express = require('./spotify-push-to-like')
const Store = require('electron-store') 
const store = new Store()
if(!store.get('keybind')){
  store.set('keybind','L')
}

const {
  app,
  BrowserWindow,
  globalShortcut,
  net,
  ipcMain,
  dialog,
  Menu,
  Tray
} = require('electron')
const path = require('path')

const EXP_URL = "http://localhost:8888"
const KEYBIND_START = "CommandOrControl+"
var win = null
var tray = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(__dirname, 'logos/pushToLikeIcon.png'),
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  tray = new Tray(path.join(__dirname, 'logos/pushToLikeIcon-32x32.png'))
  let contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click:  function(){
        win.show();
    } },
    { label: 'Quit', click:  function(){
        app.isQuiting = true;
        app.quit();
    } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if(!win.isVisible()){
      win.show()
    }
  })

  win.loadFile('index.html')
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

app.whenReady().then(() => {
  let key = store.get('keybind')
  setKeybind(key)
}).then(createWindow).then(() => {
  if(!store.get('refreshToken')){
    require('electron').shell.openExternal(EXP_URL + '/login');
  }
})
}

app.on('close', function (event) {
  if(!app.isQuiting){
    event.preventDefault();
    win.hide();
  }

  return false
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('minimize', () => {
  win.minimize()
})

ipcMain.on('maximize', () => {
  win.isMaximized() ? win.unmaximize() : win.maximize()
})

ipcMain.on('exit', () => {
  win.hide()
})

ipcMain.on('update-keybind', () => {
  setKeybind(store.get('keybind'))
})

ipcMain.on('clear-history', () => {
  fetchExpressUrl('/clear-tracks')
})

ipcMain.on('edit-history-size', () => {
  updateCacheSize()
})

async function updateCacheSize(){
  let opts = {
    buttons: ['cancel','25','50','100','200'],
    message: 'Select the desired song history size.'
  }
  let response = await dialog.showMessageBox(opts)
  console.log(response)
  let responseString = opts.buttons[response.response]
  if(responseString != 'cancel'){
    console.log(`setting cache size to ${responseString}`)
    store.set('cache-size', responseString)
  }
}

async function fetchExpressUrl(endpoint) {
  var requestApi = {
    method: 'GET',
    url: EXP_URL + endpoint
  }

  var resp
  const request = new net.ClientRequest(requestApi);

  request.on('response', d => {
    console.log("logging from electron")
    console.log(`STATUS: ${d.statusCode}`)
  });
  request.end();
  store.set('test', 'test electron store')
  console.log(store.get('test'))
}

function setKeybind(key){
  key = key.toUpperCase()
  globalShortcut.unregisterAll()
  globalShortcut.register(`${createKeybindString(key)}`, () => {
    fetchExpressUrl("/like-current-track")
  })
  store.set('keybind', key)
}

function createKeybindString(key){
  return `${KEYBIND_START}${key}`
}