const express = require('./spotify-push-to-like')
//import fetch from 'node-fetch';
const { app, BrowserWindow, globalShortcut, net } = require('electron')
//const net = electron.remote.net;
const path = require('path')

const EXP_URL = "http://localhost:8888"

function createWindow () {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname + "/scripts", 'preload.js')
      }
    })
  
    win.loadFile('index.html')
}

async function fetchExpressUrl(endpoint){
    let requestApi = {
        method: 'GET',
        url: EXP_URL + endpoint
    }
    const request = new net.ClientRequest(requestApi);

    request.on('response', data => { /* ... */ });

    request.end();
    //await fetch(EXP_URL + endpoint)
}

function authWindow () {
    const auth = new BrowserWindow({
        width: 900,
        height: 900
    })
    auth.loadURL("http://localhost:8888/login")
}

app.whenReady().then(() => {
    globalShortcut.register('CommandOrControl+L', () => {
        fetchExpressUrl("/like-current-track")
    })
}).then(createWindow).then(() => {
    require('electron').shell.openExternal(EXP_URL + '/login');
})
  

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })