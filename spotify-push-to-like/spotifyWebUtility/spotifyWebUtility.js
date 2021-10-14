const SpotifyWebApi = require('spotify-web-api-node');
const scopes = [
    'ugc-image-upload',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'app-remote-control',
    'user-read-email',
    'user-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-read-private',
    'playlist-modify-private',
    'user-library-modify',
    'user-library-read',
    'user-top-read',
    'user-read-playback-position',
    'user-read-recently-played',
    'user-follow-read',
    'user-follow-modify'
  ];
  
// credentials are optional
const spotifyApi = new SpotifyWebApi({
    clientId: '9789a262562649b98b5621c2b83e7753',
    clientSecret: '2d44d8fe8e8e4a979c3728be334b9390',
    redirectUri: 'http://localhost:8888/callback'
  });

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
      return track.body.item.id
    }

    async like(id){
      const isLiked = await spotifyApi.containsMySavedTracks([id])
      if(isLiked.body[0]){
        await spotifyApi.removeFromMySavedTracks([id])
        console.log("track is already liked... removing it")
        console.log("removed track from liked with id: " + id)
        return
      }
      const response = await spotifyApi.addToMySavedTracks([id])
      console.log("added track to liked with id: " + id)
      console.log("response status: " + response.statusCode)
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
      });
  }
}
module.exports = spotifyWebUtility