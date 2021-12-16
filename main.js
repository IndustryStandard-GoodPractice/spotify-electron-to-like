const express = require('./spotify-push-to-like')
//import fetch from 'node-fetch';
const { app, BrowserWindow, globalShortcut, net } = require('electron')
const Store = require('electron-store')
//const net = electron.remote.net;
const path = require('path')
const store = new Store()

const EXP_URL = "http://localhost:8888"

function createWindow () {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      autoHideMenuBar: true,
      transparent: true, 
      frame: false,
      webPreferences: {
        preload: path.join(__dirname + "/scripts", 'preload.js')
      }
    })
  
    win.loadFile('index.html')
}

async function fetchExpressUrl(endpoint){
    var requestApi = {
        method: 'GET',
        url: EXP_URL + endpoint
    }

    var resp
    const request = new net.ClientRequest(requestApi);

    request.on('response', d => { 
      console.log("logging from electron")
      console.log(`STATUS: ${d.statusCode}`)
      d.on('data', chunk => {
        if(chunk.toString().startsWith('{')){
          let json = JSON.parse(chunk.toString())
          console.log("JSON:")
          json.tracks.forEach(track => console.log(track))
          console.log(`track count: ${json.tracks.length}`)
        }
      })
    });
    request.end();
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
    globalShortcut.register('CommandOrControl+B', () => {
      //let tracks = await fetchExpressUrl("/likedTracks")
      //let tracks
      fetchExpressUrl("/liked-tracks").then(() => {
        //store.set('test','test')
        //console.log(`logging from fetch: ${store.get('test')}`)
      })
      //console.log(tracks)
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