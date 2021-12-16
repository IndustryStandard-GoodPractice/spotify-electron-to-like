const SpotifyWebApi = require('spotify-web-api-node');
const LocalStorage = require('node-localstorage').LocalStorage;
const scopes = [
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-library-modify',
    'user-library-read',
  ];

const CACHE_SIZE = 10
// credentials are optional
const spotifyApi = new SpotifyWebApi({
    clientId: '9789a262562649b98b5621c2b83e7753',
    clientSecret: '2d44d8fe8e8e4a979c3728be334b9390',
    redirectUri: 'http://localhost:8888/callback'
  });

const storage = new LocalStorage('./local-storage')

var cachedTracks = storage.getItem('cached-tracks') ? JSON.parse(storage.getItem('cached-tracks')) : {
  tracks : []
};

var currentTrack = {}

class spotifyWebUtility{
    constructor(access_token = null, refresh_token = null){
        this.access_token = access_token
        this.refresh_token = refresh_token
        if(access_token && refresh_token){
          spotifyApi.setAccessToken(this.access_token);
          spotifyApi.setRefreshToken(this.refresh_token);
        }
    }

    auth() {
        return spotifyApi.createAuthorizeURL(scopes)
    }

    autoRefresh(code){
      spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        const access_token = data.body['access_token'];
        const refresh_token = data.body['refresh_token'];
        const expires_in = data.body['expires_in'];

        this.updateTokens(access_token, refresh_token);

        console.log('access_token:', access_token);
        console.log('refresh_token:', refresh_token);

        console.log(`Sucessfully retreived access token. Expires in ${expires_in} s.`);

        setInterval(async () => {
          const data = await spotifyApi.refreshAccessToken();
          const access_token = data.body['access_token'];

          console.log('The access token has been refreshed!');
          console.log('access_token:', access_token);
          this.updateTokens(access_token, refresh_token);

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
      const me = await spotifyApi.getMe();
      return me.body.id
    }

    async track(user){
      const track = await spotifyApi.getMyCurrentPlayingTrack(user);
      console.log("currently listening to " + track.body.item.name + " by: " + track.body.item.album.artists[0].name)
      await this.cacheTrackData(track.body.item)
      return track.body.item.id
    }

    async like(id){
      let isLiked = await this.trackIsLiked(id)
      if(isLiked){
        await spotifyApi.removeFromMySavedTracks([id])
        console.log("track is already liked... removing it")
        console.log("removed track from liked with id: " + id)
        return
      }
      const response = await spotifyApi.addToMySavedTracks([id])
      console.log("added track to liked with id: " + id)
      console.log("response status: " + response.statusCode)
    }

    async trackIsLiked(id){
      const isLiked = await spotifyApi.containsMySavedTracks([id])
      return isLiked.body[0]
    }

    async cacheTrackData(track){
      let json = {}
      json.track= track.name
      json.artist = track.album.artists[0].name
      let image = track.album.images[2]
      json.albumCover = {
        height : image.height,
        width : image.width,
        url : image.url
      }
      let isLiked = await this.trackIsLiked(track.id)
      json.result = isLiked ? "UNLIKED" : "LIKED"
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

    likeCurrentTrack() {
      (async () => {
          const u = await this.me()
          console.log("user is " + u)
          const t = await this.track(u)
          console.log("track is " + t)
          await this.like(t)
      })().catch(e => {
          console.error(e);
      })
  }
}
module.exports = spotifyWebUtility