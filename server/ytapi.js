import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';
let OAuth2 = google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
let SCOPES = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'];
let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
let TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

let ytLoaded = false, savedAuth;

// Load client secrets from a local file.
// fs.readFile('server/client_secret.json', function processClientSecrets(err, content) {
//   if (err) {
//     console.log('Error loading client secret file: ' + err);
//     return;
//   }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  import secrets from './secrets.js';
  const content = secrets.ytClientSecret;
  authorize(/*JSON.parse(*/content/*)*/, (oAuth) => {console.log('successfully authenticated!'); ytLoaded = true; savedAuth = oAuth;});
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  let clientSecret = credentials.web.client_secret;
  let clientId = credentials.web.client_id;
  let redirectUrl = credentials.web.redirect_uris[0];
  let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  let authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

global.until = (condition, checkInterval=400) => {
    if(!!condition()) return true;
    return new Promise(resolve => {
        let interval = setInterval(() => {
            if (!condition()) return;
            clearInterval(interval);
            resolve();
        }, checkInterval)
    })
}

import db from './db.js';

// dataUrl the canvas to image/png
async function uploadThumbnail(canvas, thumbnail, videoId){
    // await until(loaded);
    console.log('uploading thumbnail');

    {
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('server/thumbnail.png', buffer);
    }

    {
        db.saveLocalFile(thumbnail);
    }

    _updateThumbnail(videoId, 'server/thumbnail.png');
}

async function _updateThumbnail(videoId, imagePath) {
    const service = google.youtube({ version: 'v3', auth: savedAuth });

    try {
        const response = await service.thumbnails.set({
            videoId: videoId,
            media: {
                mimeType: 'image/png',
                body: fs.createReadStream(imagePath),
            },
        });
        console.log(response.data);
    } catch (error) {
        console.error('Error setting thumbnail:', error);
        throw error;
    }
}

async function updateTitle(title, videoId){
    const service = google.youtube({ version: 'v3', auth: savedAuth });

    try {
        const response = await service.videos.update({
            part: 'snippet',
            requestBody: {
                id: videoId,
                snippet: {
                    title: title,
                    categoryId: 24// entertainment
                }
            }
        });

        console.log('Video title updated successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating video title:', error);
        throw error;
    }
}

export default {uploadThumbnail, updateTitle};