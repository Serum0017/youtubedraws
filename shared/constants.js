globalThis.thumbnailW = 192;
globalThis.thumbnailH = 108;

globalThis.colors = [
    "#FFFFFF",
    "#E4E4E4",
    "#888888",
    "#222222",
    "#FFA7D1",
    "#E50000",
    "#E59500",
    "#A06A42",
    "#E5D900",
    "#94E044",
    "#02BE01",
    "#00D3DD",
    "#0083C7",
    "#0000EA",
    "#CF6EE4",
    "#820080"
]

globalThis.pixelSize = 10;

globalThis.placeDelay = 3 * 1000;// 5s

Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)];
}