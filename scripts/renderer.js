const LocalStorage = require('node-localstorage').LocalStorage;

const { remote, ipcMain } = require('electron')
const { ipcRenderer } = require('electron')

const storage = new LocalStorage('./local-storage')

window.addEventListener("DOMContentLoaded", () => {
    const minimizeButton = document.getElementById("minimize")
    minimizeButton.addEventListener("click", () => {
        ipcRenderer.send('minimize')
    });
    const maximizeButton = document.getElementById("maximize")
    maximizeButton.addEventListener('click', () => {
        ipcRenderer.send('maximize')
    })
    const closeButton = document.getElementById("exit");
    closeButton.addEventListener("click", () => {
        ipcRenderer.send('exit')
    });
    const githubLink = document.getElementById('github')
    githubLink.addEventListener('click', () => {
        require('electron').shell.openExternal("https://github.com/IndustryStandard-GoodPractice/spotify-electron-to-like")
    })
    const keybindEdit = document.getElementById('editKeybind');
    keybindEdit.addEventListener('click', () => {
        keybindUpdater()
    })
    const keyText = document.getElementById('key')
    keyText.innerText = storage.getItem('keybind')

    updateHistory();
    updateLikeCounts();
    setInterval(() => {
        updateHistory()
        updateLikeCounts()
    }, 500);
});

function addSong(song, history){
    //const history = getHistory()
    let songItem = document.createElement('div')
    songItem.id = song.divId
    songItem.classList.add("song")
    songItem.classList.add("rowCenter")

    let songItemMain = document.createElement('div')
    songItemMain.classList.add('rowCenter')
    //songItemMain.innerHTML = `<img src='../../../${song.filePath}' class='albumCover'></img>`
    songItemMain.innerHTML = `<img src='${song.albumCover.url}' class='albumCover'></img>`

    let songInfo = document.createElement('div')
    songInfo.classList.add("songInfo")
    songInfo.innerHTML = `<p class='songTitle'>${song.track}</p>`
    songInfo.innerHTML += `<p class='songArtist'>${song.artist}</p>`
    songItemMain.appendChild(songInfo)

    songItem.appendChild(songItemMain)
    let likeStatus = song.result == "LIKED" ? 'logos/liked-icon.svg' : 'logos/unliked-icon.svg'
    songItem.innerHTML += `<img src=${likeStatus} class='likedIcon'></img>`
    songItem.addEventListener('click', () => {
        require('electron').shell.openExternal(song.spotifyUrl)
    })
    if(history.children.length > 0){
        console.log('inserted')
        history.insertBefore(songItem, history.firstChild);
    }else{
        console.log('appended')
        history.appendChild(songItem)
    }
}

function getActiveDivIds(){
    const history = getHistory()
    let ids = []
    let songs = history.children
    console.log(songs[0])
    console.log(songs)
    if(songs.length > 0){
        for(let i = 0; i < songs.length; i++){
            ids.push(songs[i].id)
        }
    }
    console.log(`ids: ${ids}`)
    return ids
}

function getHistory(){
    return document.getElementById('history')
}

function updateHistory(){
    const history = getHistory();
    const ids = getActiveDivIds();
    const tracks = JSON.parse(storage.getItem('cached-tracks')).tracks

    tracks.forEach(track => {
        if(!ids.includes(track.divId)){
            console.log(`adding ${track.divId}`)
            addSong(track, history)
        }
    })
    const CACHE_SIZE = parseInt(storage.getItem('cache-size'))
    while (history.children.length > CACHE_SIZE){
        history.removeChild(history.lastChild)
    }
}

function updateLikeCounts(){
    const likedText = document.getElementById('liked-text');
    const unlikedText = document.getElementById('unliked-text')
    let likedCount = storage.getItem('liked-count') ? storage.getItem('liked-count') : '0'
    //console.log(likedCount);
    let unlikedCount = storage.getItem('unliked-count') ? storage.getItem('unliked-count') : '0'
    //console.log(unlikedCount);
    likedText.innerText = `${likedCount} songs liked`
    unlikedText.innerText = `${unlikedCount} songs un-liked`
}

function keybindUpdater(){
    return new Promise((resolve) => {
        const keyText = document.getElementById('key');
        keyText.innerText = ''
        document.addEventListener('keydown', onKeyHandler);
        function onKeyHandler(e) {
            if (isLetter(e.key)) {
                keyText.innerText = e.key
                storage.setItem('keybind',e.key)
                document.removeEventListener('keydown', onKeyHandler);
                ipcRenderer.send('update-keybind')
                resolve();
          }
        }
      });
}

function isLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);
  }