const HOST = location.origin.replace(/^http/, 'ws');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let camera = {x: -thumbnailW * pixelSize / 2, y: -thumbnailH * pixelSize / 2, scale: 1};

let thumbnail = [];

for(let i = 0; i < thumbnailW; i++){
    thumbnail[i] = [];
    for(let j = 0; j < thumbnailH; j++){
        thumbnail[i][j] = 0//Math.floor(colors.length * Math.random());
    }
}

window.oncontextmenu = (e) => {
    return e.preventDefault();
}

let changed = true;
let time = performance.now();
let lastTime = time;
let dt = 0;
let lastPixelX, lastPixelY;
let cooldown = -1;
function render(){
    canvas.w = canvas.width; canvas.h = canvas.height;

    requestAnimationFrame(render);

    time = performance.now();
    dt = time - lastTime;
    if(cooldown > 0) changed = true;
    cooldown -= dt;
    lastTime = time;

    let xv = input.left - input.right;
    if(xv !== 0){
        if(input.shift) xv /= 3;
        camera.x += xv * dt;
        changed = true;
    }

    let yv = input.up - input.down;
    if(yv !== 0){
        if(input.shift) yv /= 3;
        camera.y += yv * dt;
        changed = true;
    }

    let zv = input.zoomOut - input.zoomIn;
    if(isMobile){
        zv = buttons[0].clicking - buttons[1].clicking;
    }
    if(zv !== 0){
        if(input.shift) zv /= 3;
        camera.scale *= (1 - zv / 50);
        changed = true;//e.deltaY
    }

    if(isMobile){
        if(dist !== 0){
            const xv = Math.cos(angle) * dist / 500;
            const yv = Math.sin(angle) * dist / 500;
            camera.x -= xv * dt;
            camera.y -= yv * dt;
            changed = true;
        }
    }

    if(!changed) return;
    changed = false;

    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,canvas.w, canvas.h);

    const t = ctx.getTransform();
    
    ctx.translate(canvas.w/2, canvas.h/2);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(camera.x, camera.y);

    for(let i = 0; i < thumbnailW; i++){
        for(let j = 0; j < thumbnailH; j++){
            ctx.fillStyle = colors[thumbnail[i][j]];
            ctx.fillRect(i * pixelSize, j * pixelSize, pixelSize, pixelSize);
        }
    }

    if(selectedColor !== undefined && mouse.pageX !== undefined && cooldown <= 0){
        const begin = {x: 0, y: 0};
        const end = {x: thumbnailW * pixelSize, y: thumbnailH * pixelSize};
        const pos = canvasPos({x: mouse.pageX, y: mouse.pageY});
        // ctx.fillStyle = 'red';
        // ctx.fillRect(pos.x, pos.y, 30, 30);

        let pixelX = (pos.x - begin.x) / (end.x - begin.x) * thumbnailW;
        let pixelY = (pos.y - begin.y) / (end.y - begin.y) * thumbnailH;

        pixelX = Math.max(0, Math.min(thumbnailW-1, pixelX));
        pixelY = Math.max(0, Math.min(thumbnailH-1, pixelY));

        pixelX = Math.floor(pixelX);
        pixelY = Math.floor(pixelY);

        // grid lines
        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.1;
        ctx.fillRect(0, pixelY * pixelSize, thumbnailW * pixelSize, pixelSize);
        ctx.fillRect(pixelX * pixelSize, 0, pixelSize, thumbnailH * pixelSize);
        ctx.globalAlpha = 1;

        ctx.fillStyle = colors[selectedColor];
        ctx.fillRect(pixelX * pixelSize, pixelY * pixelSize, pixelSize, pixelSize);

        lastPixelX = pixelX;
        lastPixelY = pixelY;
    }
    

    ctx.setTransform(t);

    // cooldown = 5.29;
    if(!connected || cooldown > 0){
        ctx.font = '700 42px monospace';
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        const text = !connected ? 'Disconnected...' : 'Cooldown: ' + (cooldown / 1000).toFixed(1) + 's';

        // const t = ctx.measureText(text);

        // const w = t.width + 20;
        // const h = t.actualBoundingBoxAscent + t.actualBoundingBoxDescent + 20;

        // ctx.fillStyle = 'black';
        // ctx.globalAlpha = 0.2;
        // ctx.beginPath();
        // ctx.roundRect(canvas.w/2 - w/2, canvas.h/2 - h/2 - 3, w, h, h/3);
        // ctx.fill();
        // ctx.closePath();
        // ctx.globalAlpha = 1;

        const margin = 20;

        const t = !connected ? 0.5 : cooldown / placeDelay;

        let translationY = 0;

        if(t < 0.1){
            translationY = 1 - smoothStep(t / 0.1);
        } else if(t > 0.9){
            translationY = 1 - smoothStep((1 - t) / 0.1);
        }

        translationY *= 100;

        ctx.translate(0, translationY);

        const x = 0 + margin;//canvas.w/2;
        const y = canvas.h - margin / 3;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = 'white';
        ctx.fillText(text, x, y);

        ctx.translate(0, -translationY);
    }

    if(isMobile){
        drawJoystick();
        drawButtons();
    }
}

function smoothStep(t){
    return t * t * t * (t * (t * 6. - 15.) + 10.);
}

requestAnimationFrame(render);

let ws, connected;
let attempt = 0;

function connect() {
    if (ws && ws.readyState != WebSocket.CLOSED)
        ws.close(); // close websocket if connect is called while open

    // include token and user agent in ws to validate
    ws = new WebSocket(HOST + "/" + (window.TK || "") + "/" + navigator.userAgent);
    ws.binaryType = "arraybuffer";

    ws.addEventListener("message", function (data) {
        const decoded = new Uint16Array(data.data);

        if(decoded.byteLength > 6){
            // this is an entire reset of the canvas
            let ind = 0;
            for(let i = 0; i < thumbnailW; i++){
                for(let j = 0; j < thumbnailH; j++){
                    thumbnail[i][j] = decoded[ind++];
                }
            }
        } else {
            // put a single pixel
            thumbnail[decoded[0]][decoded[1]] = decoded[2];
        }
        changed = true;
    });

    connected = false;
    window.send = () => {};

    ws.onopen = () => {
        connected = true;
        attempt = 0;
        window.send = (data) => {
            ws.send(data);
        }

        // format: x pos, y pos, color
        // const buf = new Uint16Array(3);
        // buf[0] = 0;
        // buf[1] = 1;
        // buf[2] = 0;
        // send(buf);
    }

    ws.onclose = () => {
        connected = false;
        console.log('disconnected');
        if (++attempt < 3) { // retry 3 times
            setTimeout(connect, 1e3);
        } else {
            alert('Failed to connect to server! \nThis can happen if you open multiple tabs, ' +
                'you lose internet, or the server is down. Try reloading in a minute.');
            window.send = () => { };
        }
    }
}
connect();

window.onresize = () => {
    canvas.width = canvas.w = window.innerWidth;
    canvas.height = canvas.h = window.innerHeight;
    changed = true;
}
window.onresize();

const Controls = {
    KeyW: 'up',
    KeyS: 'down',
    KeyA: 'left',
    KeyD: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ShiftLeft: 'shift',
    ShiftRight: 'shift',
    KeyZ: 'zoomOut',
    KeyX: 'zoomIn'
};

window.input = {};
for(let key in Controls){
    window.input[Controls[key]] = false;
}

window.onkeydown = window.onkeyup = (e) => {
    if(e.repeat) return;

    if (Controls[e.code] !== undefined) {
        const name = Controls[e.code];
        const state = e.type === 'keydown';
        window.input[name] = state;
    }

    if(hotkeyFns[e.code] !== undefined && e.type === 'keydown'){
        hotkeyFns[e.code](e);
    }
}

window.onwheel = (e) => {
    camera.scale *= (1 - e.deltaY / 2100);
    changed = true;
}

let selectedTool, selectedColor;
let hotkeyFns = {};
function addPlacable(color, hotkey=undefined) {
    let c;
    if(color === 'none'){
        c = document.createElement('canvas');
        c.width = c.height = 30;
        c.style.top = '0.22rem';

        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,30,30);
        ctx.fillStyle = '#cecece';
        ctx.fillRect(15,0,15,15);
        ctx.fillRect(0,15,15,15);
    } else {
        c = document.createElement('div');
        // c.style.marginLeft = c.style.marginRight = '5px';
        c.style.background = colors[color];
        c.width = c.height = '30px';
    }
    c.style.position = 'relative';
    // c.style.top = '0.3rem';
    c.style.left = 'auto';
    c.style.width = `32px`;
    c.style.height = `32px`;
    

    let onclick = (e) => {
        if(color === 'none') selectedColor = undefined;
        else selectedColor = color;
        changed = true;
        if(selectedTool) selectedTool.classList.remove('selectedPlacable');
        c.classList.add('selectedPlacable');
        selectedTool = c;
        return e.stopPropagation();
    }

    if(color === 'none') { onclick({stopPropagation:()=>{}}) }

    const t = _createTool({canvas: c, onclick, hotkey, color});
    toolMenu.appendChild(t);
}

function _createTool({canvas, onclick, hotkey, color}){
    const menuButtonDiv = document.createElement('div');
    menuButtonDiv.classList.add('menu-button-div');

    const menuButton = document.createElement('div');
    menuButton.classList.add('menu-button');

    const menuImg = canvas;
    menuImg.style.draggable = "false";

    menuButton.appendChild(menuImg);
    menuButtonDiv.appendChild(menuButton);
    menuButton.addEventListener('mousedown', onclick, {useCapture: true});

    if(hotkey !== undefined) hotkeyFns[hotkey] = onclick;

    // const menuButtonText = document.createElement('span');
    // menuButtonText.classList.add('menu-button-text');
    // menuButtonText.textContent = colors[color];
    // menuButtonDiv.appendChild(menuButtonText);

    return menuButtonDiv;
}

addPlacable('none', 'Escape');

for(let i = 0; i < colors.length; i++){
    let hotkey;
    if(i <= 9){
        hotkey = `Digit${i}`;
    }
    addPlacable(i, hotkey);
}

// page position to position on the canvas
function canvasPos({x,y}) {
    const canvasDimensions = canvas.getBoundingClientRect();
    // first convert to canvas coords
    x = ((x - canvasDimensions.x) / canvasDimensions.width) * canvas.width;
    y = ((y - canvasDimensions.y) / canvasDimensions.height) * canvas.height;

    // then transform the point from where it should be drawn
    // to where it's supposed to be on the canvas so that
    // after its translated it will be drawn there
    const {a,b,c,d,e,f} = ctx.getTransform();

    const denom1 = (a*d - c*b);
    const denom2 = -denom1;

    const invA = d / denom1;
    const invC = c / denom2;
    const invE = (e*d - c*f) / denom2;
    const invB = b / denom2;
    const invD = a / denom1;
    const invF = (e*b - a*f) / denom1;

    // then apply inverse transform
    return {
        x: (invA*x + invC*y + invE),
        y: (invB*x + invD*y + invF)
    }
}

let mouse;
window.onmousemove = (e) => {
    if(isMobile && dragging === true){
        let mouseCoords = canvasPos({x: e.x, y: e.y});
        dist = Math.min(stickR, Math.sqrt((mouseCoords.x - coords.x) ** 2 + (mouseCoords.y - coords.y) ** 2));
        angle = Math.atan2(mouseCoords.y - coords.y, mouseCoords.x - coords.x);
        changed = true;
        return;
    }

    mouse = e;
    if(selectedColor !== undefined) {
        changed = true;
    }
}

window.onmousedown = (e) => {
    if(isMobile === true){
        let mouseCoords = canvasPos({x: e.x, y: e.y});

        for(let i = 0; i < buttons.length; i++){
            const {clicking, xPercent, yPercent, rPercent, text} = buttons[i];
            const coords = {x: xPercent * innerWidth, y: yPercent * innerHeight};
            let mag = Math.sqrt((mouseCoords.x - coords.x) ** 2 + (mouseCoords.y - coords.y) ** 2);
            if(mag <= rPercent * innerHeight){
                buttons[i].clicking = true;
                changed = true;
                return;
            }
        }

        let mag = Math.sqrt((mouseCoords.x - coords.x) ** 2 + (mouseCoords.y - coords.y) ** 2);
        dist = Math.min(stickR, mag);
        angle = Math.atan2(mouseCoords.y - coords.y, mouseCoords.x - coords.x);
        if(mag <= stickR){
            dragging = true;
            changed = true;
        } else {
            if(dist !== 0 || angle !== 0) changed = true;
            dist = angle = 0;
        }
        return;
    }

    tryPlacing();
}

function tryPlacing(){
    if(lastPixelX === undefined || lastPixelY === undefined || selectedColor === undefined || cooldown >= 0) return;

    // dont repeat color
    if(thumbnail[lastPixelX][lastPixelY] === selectedColor) return;
    
    const buf = new Uint16Array(3);
    buf[0] = lastPixelX;
    buf[1] = lastPixelY;
    buf[2] = selectedColor;
    send(buf);

    cooldown = placeDelay;

    // hotkeyFns['Escape']({stopPropagation:()=>{}});
}

window.onmouseup = (e) => {
    if(!isMobile) return;

    for(let i = 0; i < buttons.length; i++){
        if(buttons[i].clicking === true) changed = true;
        buttons[i].clicking = false;
    }

    if(dragging === true){
        dragging = false;
        dist = angle = 0;
        return;
    } else {
        // on mobile we place on mouse up
        tryPlacing();
    }
}

// does not work for mobile firefox
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

let joystick = {
    xPercent: 0.72,
    yPercent: 0.87,
    rPercent: 0.1
}
let angle = 0, dist = 0, coords, rCoords, stickR, dragging = false;

let buttons = [{
    text: '-',
    xPercent: 0.34,
    yPercent: 0.94,
    rPercent: 0.045,
    clicking: false
}, {
    text: '+',
    xPercent: 0.12,
    yPercent: 0.94,
    rPercent: 0.045,
    clicking: false
}];

function drawJoystick(){
    const {xPercent, yPercent, rPercent} = joystick;

    ctx.globalAlpha = .15;
    ctx.fillStyle = 'blue';
    
    coords = {x: xPercent * innerWidth, y: yPercent * innerHeight};
    rCoords = {x: (xPercent) * innerWidth, y: (yPercent + rPercent) * innerHeight};
    stickR = (rCoords.y - coords.y);
    
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, stickR, 0, Math.PI*2);
    ctx.fill();
    ctx.closePath();
    
    ctx.globalAlpha = .18;
    ctx.beginPath();
    ctx.arc(coords.x + Math.cos(angle) * dist, coords.y + Math.sin(angle) * dist, stickR/2, 0, Math.PI*2);
    ctx.fill();
    ctx.closePath();
    
    ctx.globalAlpha = 1;
}

// if(lastW !== innerWidth || lastH !== innerHeight){
//     coords = canvasPos({x: xPercent * innerWidth, y: yPercent * innerHeight});
//     rCoords = canvasPos({x: xPercent * innerWidth, y: (yPercent + rPercent) * innerHeight});
//     btnR = rCoords.y - coords.y;
// }

function drawButtons(){
    for(let i = 0; i < buttons.length; i++){
        drawButton(buttons[i]);
    }
}

function drawButton(b){
    const {clicking, xPercent, yPercent, rPercent, text} = b;
    const coords = {x: xPercent * innerWidth, y: yPercent * innerHeight};
    const rCoords = {x: xPercent * innerWidth, y: (yPercent + rPercent) * innerHeight};
    const btnR = rCoords.y - coords.y;

    ctx.fillStyle = 'blue';
    ctx.globalAlpha = clicking? .56 : .3;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, btnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.globalAlpha *= 1.79;

    ctx.fillStyle = '#f0f0f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 120px Monospace`;
    ctx.fillText(text, coords.x, coords.y);

    ctx.globalAlpha = 1;
}

if(isMobile) {
    const oldMouseDown = window.onmousedown;
    const oldMouseMove = window.onmousemove;
    const oldMouseUp = window.onmouseup;
    window.addEventListener("touchstart", (e) => {
        const c = e.changedTouches[0];
        defineTouch(c);
        oldMouseDown(c);
        oldMouseMove(c);
    });
    window.addEventListener("touchmove", (e) => {
        const c = e.changedTouches[0];
        defineTouch(c);
        oldMouseMove(c);
        return e.preventDefault();
    }, {passive: false});
    window.addEventListener("touchend", (e) => {
        const c = e.changedTouches[0];
        defineTouch(c);
        oldMouseMove(c);
        oldMouseUp(c);
    });
    function defineTouch(e){
        e.preventDefault = () => {};
        e.x = e.pageX;
        e.y = e.pageY;
    }
    window.onmousedown = window.onmouseup = window.onmousemove = () => {};
}