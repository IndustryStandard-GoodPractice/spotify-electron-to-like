const spotifyWebUtility = require('./spotifyWebUtility/spotifyWebUtility');
const express = require('express')

// This file is based on: https://github.com/thelinmichael/spotify-web-api-node/blob/master/examples/tutorial/00-get-access-token.js

var caller = new spotifyWebUtility();
  
  const app = express();
  
  app.get('/login', (req, res) => {
    res.redirect(caller.auth());
  });
  
  app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;
  
    if (error) {
      console.error('Callback Error:', error);
      res.send(`Callback Error: ${error}`);
      return;
    }
  
    const resp = caller.autoRefresh(code)
    res.send(resp)
  });

  app.get("/like-current-track", (req, res) => {
    caller.likeCurrentTrack()
    return res.send('Received a GET HTTP method');
  });

  app.listen(8888, () =>
    console.log(
      'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
    )
  );