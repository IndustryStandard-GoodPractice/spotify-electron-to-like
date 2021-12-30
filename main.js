/*try {
  require('electron-reloader')(module)
} catch (_) {}*/
require('@electron/remote/main').initialize()
const debug = require('electron-debug');

debug();
const LocalStorage = require('node-localstorage').LocalStorage;

const express = require('./spotify-push-to-like')
const storage = new LocalStorage('./local-storage')
if(!storage.getItem('keybind')){
  storage.setItem('keybind','L')
}

const {
  app,
  BrowserWindow,
  globalShortcut,
  net,
  ipcMain
} = require('electron')
const Store = require('electron-store')
const path = require('path')

const EXP_URL = "http://localhost:8888"
const KEYBIND_START = "CommandOrControl+"

function createWindow() {
  const win = new BrowserWindow({
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

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  let key = storage.getItem('keybind')
  setKeybind(key)
}).then(createWindow).then(() => {
  if(!storage.getItem('refreshToken')){
    require('electron').shell.openExternal(EXP_URL + '/login');
  }
})


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('minimize', () => {
  BrowserWindow.getFocusedWindow().minimize()
})

ipcMain.on('maximize', () => {
  let win = BrowserWindow.getFocusedWindow()
  win.isMaximized() ? win.unmaximize() : win.maximize()
})

ipcMain.on('exit', () => {
  BrowserWindow.getFocusedWindow().close()
})

ipcMain.on('update-keybind', () => {
  setKeybind(storage.getItem('keybind'))
})

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
}

function setKeybind(key){
  key = key.toUpperCase()
  globalShortcut.unregisterAll()
  globalShortcut.register(`${createKeybindString(key)}`, () => {
    fetchExpressUrl("/like-current-track")
  })
  storage.setItem('keybind', key)
}

function createKeybindString(key){
  return `${KEYBIND_START}${key}`
}