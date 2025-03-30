import uWS from 'uWebSockets.js';
import yt from './ytapi.js';
const {uploadThumbnail, updateTitle} = yt;
import fs from 'fs';
import {createHash} from 'crypto';
import '../shared/constants.js';

import {createCanvas} from 'canvas';
const canvas = createCanvas(thumbnailW * pixelSize, thumbnailH * pixelSize);
const ctx = canvas.getContext('2d');

global.thumbnail = [];

for(let i = 0; i < thumbnailW; i++){
    thumbnail[i] = [];
    for(let j = 0; j < thumbnailH; j++){
        thumbnail[i][j] = 0;
    }
}

// read saved
// const colorToNumber = {};
// for(let i = 0; i < global.colors.length; i++){
//     colorToNumber[colors[i]] = i;
// }

// const dataPath = 'server/thumbnailData.thumbnail';
// if (fs.existsSync(dataPath)) {
//     const buf = fs.readFileSync(dataPath);

//     let ind = 0;
//     for(let i = 0; i < thumbnailW; i++){
//         for(let j = 0; j < thumbnailH; j++){
//             thumbnail[i][j] = buf[ind++];
//         }
//     }
// }

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const PORT = 3000;

global.clients = {};
const rateLimits = {};

let connectedIps = {};

let id = 0;
function generateId(){
    if(id > 100_000) id = 0;
    return id++;
}

global.app = uWS.App().ws('/*', {
    compression: 0,
    maxPayloadLength: 7,
    idleTimeout: 0,
    open: (ws) => {
        // send image
        ws.id = generateId();
        clients[id] = ws;
        if (!rateLimits[ws.ip || id]) rateLimits[ws.ip || id] = performance.now();

        // make sure to like and subscribe
        ws.subscribe('global');

        // send this client the thumbnail
        const buf = new Uint16Array(thumbnailW * thumbnailH);
        let ind = 0;
        for(let i = 0; i < thumbnailW; i++){
            for(let j = 0; j < thumbnailH; j++){
                buf[ind++] = thumbnail[i][j];
            }
        }
        send(ws, buf);
    },
    message: (ws, data) => {
        // there's only one message type - put a pixel!
        if(data.byteLength !== 6) return;

        const t = performance.now();

        if(t - rateLimits[ws.ip || ws.id] < placeDelay - 500){
            return;
        }
        rateLimits[ws.ip || ws.id] = t;

        const decoded = new Uint16Array(data);

        const x = decoded[0];
        const y = decoded[1];
        const color = decoded[2];

        if(x < 0 || x >= thumbnailW || y < 0 || y >= thumbnailH || color < 0 || color >= colors.length) return;

        thumbnail[x][y] = color;

        broadcast(decoded);
    },
    close: (ws) => {
        // removeClient(ws, true);
        delete clients[ws.id];
        if(!ws.ip) delete rateLimits[ws.id];

        if(ws.ip){
            delete connectedIps[ws.ip];
        }
    },
    upgrade: (res, req, context) => {
        const ip = getIp(res, req);

        if(ip !== '0000:0000:0000:0000:0000:0000:0000:0001') {
            if(connectedIps[ip] === true){
                console.log('rejecting, multiple ips');
                res.end("Connection rejected");
                return;
            }
            connectedIps[ip] = true;
        }

        let token = decodeURI(req.getUrl().replace('/', ''));
        if (token != hash(ip + TBR) + "/" + req.getHeader('user-agent')) {
            console.log('rejecting, invalid token');
            res.end("Connection rejected");
            return;
        }
    
        res.upgrade(
            { ip },  // Attach IP to the WebSocket object
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'),
            context
        );
    },
}).listen(PORT, (token) => {
    if (token) {
        console.log('Server Listening to Port ' + PORT);
    } else {
        console.log('Failed to Listen to Child Server ' + PORT);
    }
});

function getIp(res, req) {
    // Try to get the real client IP from proxy headers
    let forwardedIp = req.getHeader('x-forwarded-for') || req.getHeader('x-real-ip');
    
    if (forwardedIp) {
        forwardedIp = forwardedIp.split(',')[0].trim(); // Handle multiple IPs in X-Forwarded-For
    
        const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\b/;
        forwardedIp = forwardedIp.match(ipRegex)?.[0] || false; // Make sure it is a valid ip, and if not, skip over
        
        if (forwardedIp) {
          return forwardedIp.split(',')[0].trim();
        }
    }
  
    // Fallback: Get the direct remote address
    let rawIp = new TextDecoder().decode(res.getRemoteAddressAsText());
  
    // Convert IPv6-mapped IPv4 (e.g., ::ffff:192.168.1.1) to IPv4
    if (rawIp.startsWith('::ffff:')) {
      return rawIp.substring(7);
    }
  
    return rawIp;
}

global.send = (ws, msg) => {
    ws.send(msg, true, false);
}

global.broadcast = (msg) => {
    app.publish('global', msg, true, false);
}

app.get("/", (res, req) => {
    res.end(fs.readFileSync('client/index.html'));
});

app.get("/title", (res, req) => {
    res.end(fs.readFileSync('title/index.html'));
});

app.get("/:filename/:filename2", (res, req) => {
    if(req.getParameter(0) === 'server' || req.getParameter(0) == '.git') 
        {res.cork(()=>{res.end();});return;}
    let path = req.getParameter(0) + '/' + req.getParameter(1);
    if (fs.existsSync(path) && fs.statSync(path).isFile()) {
        const isCss = path.slice(path.length-3) === 'css'; //why serum istg 😭
        if(isCss === true) res.writeHeader("Content-Type", "text/css");
        else res.writeHeader("Content-Type", "text/javascript");
        const file = fs.readFileSync(path);

        res.end(file);
    } else {
        res.cork(() => {
            res.writeStatus('404 Not Found');
            res.end();
        })
    }
});

// Youtube gives us a quota of 100k units per day, and since each write costs 50 units
// it works out that you can do a write every 7.2 minutes. 15 mins is ok for 2 writes
// but you can make it 8 if you only want to do one.
const titleUpdateTime = 15;// minutes
const thumbnailUpdateTime = 15;

import badWords from './badwords.js';

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

const alphabetMap = {};
for(let i = 0; i < alphabet.length; i++){
    alphabetMap[alphabet[i]] = true;
}

const setIps = {};
const queuedTitles = [];
app.post("/updateTitle", (res, req) => {
    const newTitle = req.getHeader('t');

    if(newTitle.length === 0 || newTitle.length > 100){
        res.cork(() => {
            res.end('n');
        })
        return;
    }

    // checking if title has bad words
    let filteredTitle = '';
    for(let i = 0; i < newTitle.length; i++){
        if(alphabetMap[newTitle[i]]){
            filteredTitle += newTitle[i];
        }
    }
    // we now have a lower case version of all the special character removed
    filteredTitle = filteredTitle.toLowerCase();

    for(let i = 0; i < badWords.length; i++){
        if(filteredTitle.includes(badWords[i])){
            res.cork(() => {
                res.end('badword');
            })
            return;
        }
    }

    const ip = getIp(res, req);

    if(setIps[ip] === true) {
        res.cork(() => {
            res.end('n');
        });
        return;
    }
    setIps[ip] = true;

    const timeTillNextUpdate = ((lastUpdatedTitleTime + titleUpdateTime * 1000 * 60) - Date.now()) / 1000 / 60;
    const queueTime = timeTillNextUpdate + queuedTitles.length * titleUpdateTime;

    if(queuedTitles.length >= 1000) queuedTitles.length = 0;
    queuedTitles.push(newTitle);

    res.cork(() => {
        res.end(queueTime.toFixed(1));
    })
});

import secrets from './secrets.js';
const {titleVideoId, thumbnailVideoId} = secrets;

setInterval(() => {
    for(let i = 0; i < thumbnailW; i++){
        for(let j = 0; j < thumbnailH; j++){
            ctx.fillStyle = colors[thumbnail[i][j]];
            ctx.fillRect(i * pixelSize, j * pixelSize, pixelSize, pixelSize);
        }
    }
    console.log('uploading thumbnail!');
    uploadThumbnail(canvas, thumbnail, thumbnailVideoId);
}, thumbnailUpdateTime * 60 * 1000)// every few mins write thumbnail

let lastUpdatedTitleTime = Date.now();
setInterval(() => {
    lastUpdatedTitleTime = Date.now();
    if(queuedTitles.length === 0) return;

    const nextTitle = queuedTitles.shift();

    console.log('unqueueing and updating', {nextTitle});
    updateTitle(nextTitle, titleVideoId);
}, titleUpdateTime * 60 * 1000);

function hash(data) { // hash data into hex
    let h = createHash('sha256');
    h.update(data);
    return h.digest('hex');
}

// time-based random, updates each minute
function genTBR() {
    TBR = Math.floor(Math.random() * (36 ** 8 - 1)).toString(36)
}

let TBR; // hash this with the IP to get a token

setInterval(genTBR, 60e3);
genTBR();

app.get("/test.js", (res, req) => {
    let ip = getIp(res, req);
    let token = hash(ip + TBR);
    res.writeHeader('Cache-Control', '0');
    res.writeHeader('Access-Control-Allow-Origin', '*'); // this is to help out doofus
    res.end(`window.TK = "${token}";`);
});