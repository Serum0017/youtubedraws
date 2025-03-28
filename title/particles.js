let canvas = document.createElement('canvas');
canvas.id = 'canvas';

document.body.insertBefore(canvas, document.body.firstChild);

let ctx = canvas.getContext('2d');

class Particle {
    constructor(radius, speed) {
        this.radius = radius;
        this.x = Math.random()*(canvas.width-2*this.radius)+this.radius;
        this.y = Math.random()*(canvas.height-2*this.radius)+this.radius;
        this.angle = Math.random()*Math.PI*2;
        this.vx = Math.sin(this.angle)*speed;
        this.vy = Math.cos(this.angle)*speed;
    }
    move() {
        let mdx = this.x - mousePos.x;
        let mdy = this.y - mousePos.y;
        if(Math.sqrt(mdx**2+mdy**2) < 350){
            const angle = Math.atan2(mdy, mdx);
            this.x += Math.cos(angle) * 4.4 * dt/16.66;
            this.y += Math.sin(angle) * 4.4 * dt/16.66;
        }

        if(this.x - this.radius < 0 || this.x + this.radius > canvas.width){
            this.vx = -this.vx;
            this.x = Math.max(Math.min(this.x,canvas.width-this.radius),this.radius);
        }
        if(this.y - this.radius < 0 || this.y + this.radius > canvas.height){
            this.vy = -this.vy;
            this.y = Math.max(Math.min(this.y,canvas.height-this.radius),this.radius);
        }
        this.x += this.vx * dt/16.66;
        this.y += this.vy * dt/16.66;
    }
    render() {
        ctx.beginPath();
        // var grd = ctx.createRadialGradient(this.x,this.y, this.radius, this.x, this.y,this.radius*2);
        // grd.addColorStop(0, "rgba(14, 13, 19,1)");
        // grd.addColorStop(1, "rgba(14, 13, 19,0)");
        // ctx.fillStyle = grd;
        // ctx.fillRect(0,0,canvas.width,canvas.height);
        // ctx.fill();
        ctx.fillStyle = '#b8b3a5';
        ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
        ctx.fill();
        ctx.closePath();
    }
}

let mousePos = {x: -Infinity, y: -Infinity};

//ctx.fillRect(0,0,canvas.width,canvas.height);

let particles = [];
let particleAmount = 200;
let particleRadius = 6;
let particleRadiusRange = 4;
let particleSpeed = 1.5;
let particleSpeedRange = 2;

window.addEventListener('mousemove', e => {
    const cBounds = canvas.getBoundingClientRect();
    mousePos.x = (e.x - cBounds.x) / cBounds.width * canvas.width;
    mousePos.y = (e.y - cBounds.y) / cBounds.height * canvas.height;
});
window.addEventListener('mouseout', e => {
    mousePos.x = -Infinity;
    mousePos.y = -Infinity;
});

window.onload = resize;

window.onresize = () => {
    resize();
}

function resize(){
    canvas.width = canvas.w = window.innerWidth;
    canvas.height = canvas.h = window.innerHeight;

    particleAmount = Math.max(15, 120 * canvas.w / 1920 * canvas.h / 1080);

    particles.length = 0;
    for(let i = 0; i < particleAmount; i++) {
        particles.push(new Particle(particleRadius+Math.random()*particleRadiusRange,particleSpeed+Math.random()*particleSpeedRange));
    };
}

const maxDist = 400;
const maxDistSq = maxDist ** 2;
const maxAlpha = 0.4;
function RenderConnections() {
    let dist;
    for(let a = 0; a < particles.length; a++){
        for(let b = a+1; b < particles.length; b++) {
            dist = (particles[a].x - particles[b].x) ** 2 + (particles[a].y - particles[b].y) ** 2;
            if(dist < maxDistSq)  {
                ctx.beginPath();
                ctx.setLineDash([20, 25]);
                ctx.strokeStyle = 'white';
                ctx.globalAlpha = (maxDist-Math.sqrt(dist))/maxDist * maxAlpha;
                ctx.moveTo(particles[a].x,particles[a].y);
                ctx.lineTo(particles[b].x,particles[b].y);
                ctx.stroke();
                ctx.closePath();
                ctx.globalAlpha = 1;
            }
        }
    }
}

resize();


let dt = 0;
let lastTime = performance.now();
function render(){
    requestAnimationFrame(render);

    let time = performance.now();
    dt = time - lastTime;
    lastTime = time;

    ctx.fillStyle = "black";
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0,0,canvas.w,canvas.h);
    RenderConnections();
    for(let i = 0; i < particles.length; i++) {
        particles[i].move();
        particles[i].render();
    }
}

render();