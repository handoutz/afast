var _ = require('lodash'),
    tmp = require('tmp'),
    Downloader = require('mt-files-downloader');
const EventEmitter = require('events');
const charm = require('charm')();
function padright(str, len) {
    function pad(value, length) {
        return (value.toString().length < length) ? pad(value + " ", length) : value;
    }
    return pad(str, len).substring(0, len);
}
class TrackedItem extends EventEmitter {
    constructor(opts) {
        opts = Object.assign({
            url: null,
            dest: null,
            max: 100,
            value: 0,
            meta: {}
        }, opts);
        this.progress = {
            current: opts.value,
            max: opts.max
        };
        this.meta = opts.meta;
        this.tmpname = tmp.tmpNameSync();
        this.status = 'created';
        this.y = 0;
    }
    get y() { return this.y; }
    set y(yy) { this.y = yy; }
    get status() {
        return this.status;
    }
    set status(stat) {
        this.status = stat;
        this.emit('statuschange', stat);
    }
    get tmpname() {
        return this.tmpname;
    }
    get percent() {
        return this.progress.current;
    }
    get download() {
        return this.dl;
    }
    set download(dl) {
        this.dl = dl;
    }
}
class ProgressTracker extends EventEmitter {
    constructor(opts) {
        opts = Object.assign({
        }, opts);
        this.tracked = [];
        this.downloader = new Downloader();
        setInterval(this.tick, 500);
        charm.pipe(process.stdout);
        charm.reset();
    }
    tick() {
        if (this.tracked.length == 0) return;
        var height = process.stdout.getWindowSize()[1],
            width = process.stdout.getWindowSize()[0];
        
    }
    addUrl(url, dest, meta) {
        var ti = new TrackedItem({ meta: meta, url: url, dest: dest });
        var dl = this.downloader.download(url, ti.tmpname);
        ti.on('statuschange', function (newstat) {
        });
        ti.download = dl;
    }
}
module.exports = ProgressTracker;