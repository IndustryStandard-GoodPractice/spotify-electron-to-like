const SpotifyWebApi = require('spotify-web-api-node');
const LocalStorage = require('node-localstorage').LocalStorage;
const fs = require('fs')
const request = require('request');
const scopes = [
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-library-modify',
    'user-library-read',
  ];

// credentials are optional
const spotifyApi = new SpotifyWebApi({
    clientId: '9789a262562649b98b5621c2b83e7753',
    clientSecret: '2d44d8fe8e8e4a979c3728be334b9390',
    redirectUri: 'http://localhost:8888/callback'
  });
const storage = new LocalStorage('./local-storage')
const CACHE_SIZE = storage.getItem('cache-size') ? parseInt(storage.getItem('cache-size')) : 50
storage.setItem('cache-size', CACHE_SIZE)
var emptyTracks = function (){
  return {
    tracks : []
  };
}
var cachedTracks = storage.getItem('cached-tracks') ? JSON.parse(storage.getItem('cached-tracks')) : emptyTracks()
if(!storage.getItem('cached-tracks')){
  storage.setItem('cached-tracks', JSON.stringify(emptyTracks()))
}
if(!storage.getItem('liked-count')){
  storage.setItem('liked-count',0)
}
if(!storage.getItem('unliked-count')){
  storage.setItem('unliked-count',0)
}
var currentTrack = {}

class spotifyWebUtility{
    constructor(access_token = null, refresh_token = null){
        this.access_token = access_token
        this.refresh_token = refresh_token
        if(access_token && refresh_token){
          spotifyApi.setAccessToken(this.access_token);
          spotifyApi.setRefreshToken(this.refresh_token);
        } else if(storage.getItem('refreshToken')){
          this.refresh_token = storage.getItem('refreshToken')
          spotifyApi.setRefreshToken(this.refresh_token)
          /*let data = await spotifyApi.refreshAccessToken();
          let access_token = data.body['access_token'];

          console.log('The access token has been refreshed!');
          console.log('access_token:', access_token);
          this.updateTokens(access_token, refresh_token);*/
          this.refreshTokenSetup()
        }
    }

    async refreshTokenSetup(){
      let data = await spotifyApi.refreshAccessToken();
      let access_token = data.body['access_token'];
      let expires_in = data.body['expires_in']
      console.log(data)

      console.log('The access token has been refreshed!');
      console.log('access_token:', access_token);
      this.updateTokens(access_token, this.refresh_token);

      storage.setItem('refreshToken', this.refresh_token)

      setInterval(async () => {
        const data = await spotifyApi.refreshAccessToken();
        const access_token = data.body['access_token'];

        console.log('The access token has been refreshed!');
        console.log('access_token:', access_token);
        this.updateTokens(access_token, this.refresh_token);
        }, expires_in / 2 * 1000);
    }

    auth() {
        return spotifyApi.createAuthorizeURL(scopes)
    }

    async refreshAccessToken(){
      const data = await spotifyApi.refreshAccessToken();
      const access_token = data.body['access_token'];
      console.log('The access token has been refreshed!');
      console.log('access_token:', access_token);
      this.updateTokens(access_token, this.refresh_token);
    }

    autoRefresh(code){
      spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        const access_token = data.body['access_token'];
        const refresh_token = storage.getItem('refreshToken') ? storage.getItem('refreshToken') : data.body['refresh_token'];
        const expires_in = data.body['expires_in'];

        this.updateTokens(access_token, refresh_token);

        console.log('access_token:', access_token);
        console.log('refresh_token:', refresh_token);

        console.log(`Sucessfully retreived access token. Expires in ${expires_in} s.`);
        storage.setItem('refreshToken', refresh_token)

        setInterval(async () => {
          const data = await spotifyApi.refreshAccessToken();
          const access_token = data.body['access_token'];

          console.log('The access token has been refreshed!');
          console.log('access_token:', access_token);
          this.updateTokens(access_token, refresh_token);
          storage.setItem('refreshToken', refresh_token)

        }, expires_in / 2 * 1000);
      })
      .catch(error => {
        console.error('Error getting Tokens:', error);
        return `Error getting Tokens: ${error}`;
      });
      return 'Success! You can now close the window.'
    }

    updateTokens(at, rt) {
      spotifyApi.setAccessToken(at)
      spotifyApi.setRefreshToken(rt)
      console.log("Access Token and Refresh Token Updated!!!")
    }

    async me(){
      let me
      try{
        me = await spotifyApi.getMe();
      } catch{
        await this.refreshAccessToken();
        me = await spotifyApi.getMe();
      }
      return me.body.id
    }

    async track(user){
      const track = await spotifyApi.getMyCurrentPlayingTrack(user);
      console.log("currently listening to " + track.body.item.name + " by: " + track.body.item.album.artists[0].name)
      return track.body.item
    }

    async like(track){
      let id = track.id
      let isLiked = await this.trackIsLiked(id)
      if(isLiked){
        await spotifyApi.removeFromMySavedTracks([id])
        console.log("track is already liked... removing it")
        console.log("removed track from liked with id: " + id)
        this.cacheTrackData(track, isLiked)
        let unlikedCount = storage.getItem('unliked-count') ? storage.getItem('unliked-count') : 0
        unlikedCount++
        storage.setItem('unliked-count', unlikedCount)
        return
      }
      const response = await spotifyApi.addToMySavedTracks([id])
      console.log("added track to liked with id: " + id)
      console.log("response status: " + response.statusCode)
      let likedCount = storage.getItem('liked-count') ? storage.getItem('liked-count') : 0
      likedCount++
      storage.setItem('liked-count', likedCount)
      this.cacheTrackData(track, isLiked)
    }

    async trackIsLiked(id){
      const isLiked = await spotifyApi.containsMySavedTracks([id])
      return isLiked.body[0]
    }

    async cacheTrackData(track, isLiked){
      let json = {}
      json.track= track.name
      json.artist = track.album.artists[0].name
      let image = track.album.images[2]
      json.albumCover = {
        height : image.height,
        width : image.width,
        url : image.url
      }
      json.result = isLiked ? "UNLIKED" : "LIKED"
      json.timestamp = Date.now() / 1000 | 0
      let divId = `${json.track.toLowerCase().replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '').replace(/[\s_]+/g, '-').replace(/-+/, '-')}-${json.timestamp}`
      json.divId = divId
      json.spotifyUrl= track.external_urls.spotify
      cachedTracks.tracks.push(json)
      while(cachedTracks.tracks.length > CACHE_SIZE){
        cachedTracks.tracks.splice(0,1)
      }
      currentTrack = json
      storage.setItem('cached-tracks', JSON.stringify(cachedTracks))
    }

    getCachedTracks(){
      return cachedTracks
    }

    clearCachedTracks(){
      cachedTracks = emptyTracks()
      let json = JSON.stringify(emptyTracks())
      console.log(json)
      storage.setItem('cached-tracks', json)
    }

    likeCurrentTrack() {
      (async () => {
          const u = await this.me()
          console.log("user is " + u)
          const t = await this.track(u)
          console.log("track id: " + t.id)
          await this.like(t)
      })().catch(e => {
          console.error(e);
      })
  }
}
module.exports = spotifyWebUtility