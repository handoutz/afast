var _ = require('lodash'),
    tmp = require('tmp'),
    util = require('util'),
    Downloader = require('mt-files-downloader');
const EventEmitter = require('events');
const termkit = require('terminal-kit'), term = termkit.terminal;
function padright(str, len, left) {
    function pad(value, length) {
        return (value.toString().length < length) ? pad(left ? " " + value : value + " ", length) : value;
    }
    return pad(str, len).substring(0, len);
}
class TrackedItem extends EventEmitter {
    constructor(opts) {
        super();
        opts = Object.assign({
            url: null,
            dest: null,
            max: 100,
            value: 0,
            meta: {}
        }, opts);
        this.options = opts;
        this.progress = {
            current: opts.value,
            max: opts.max
        };
        this.meta = opts.meta;
        this._tmpname = tmp.tmpNameSync();
        this.status = 'created';
        this.y = 0;
        this.stats = { speed: 0, remaining: '' };
        this.color = 'cyan';
    }
    updatestat() {
        if (!this.dl) return;
        var dl = this.dl, stats = dl.getStats();
        if (dl.status == 1) {
            this.percent = stats.total.completed;
            this.stats.speed = Downloader.Formatters.speed(stats.present.speed);
            this.stats.remaining = Downloader.Formatters.remainingTime(stats.future.eta);
        } else if (dl.status == 2) {
            this.percent = 0;
            this.stats.speed = this.stats.remaining = '';
            this.status = 'error';
            this.color = 'red';
        } else if (dl.status == 3) {
            this.status = 'done';
            this.stats.speed = this.stats.remaining = '';
            this.percent = this.progress.max;
            this.color = 'green';
        }
    }
    get name() { return this.meta.name; }
    get finaldest() { return this.options.dest; }
    get y() { return this._y; }
    set y(yy) { this._y = yy; }
    get status() {
        return this._status;
    }
    set status(stat) {
        this._status = stat;
        this.emit('statuschange', stat);
        this.y = -1;
    }
    get statusint() {
        switch (this._status) {
            case 'started':
                return 0;
            case 'done':
                return 2;
            case 'created':
                return 1;
        }
        return -1;
    }
    get tmpname() {
        return this._tmpname;
    }
    get percent() {
        return this.progress.current;
    }
    set percent(pct) {
        this.progress.current = pct;
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
        super();
        opts = Object.assign({
        }, opts);
        this.tracked = [];
        this.downloader = new Downloader();
        var me = this;
        term.clear();
        this.interid = setInterval(function () {
            me.tick();
        }, 500);
    }
    tick() {
        if (this.tracked.length == 0) return;
        var height = process.stdout.getWindowSize()[1],
            width = process.stdout.getWindowSize()[0];
        var tmp = this.tracked.slice();
        tmp = _.sortBy(tmp, t => t.statusint);
        //term.clear();
        //process.stdout.write("\u001b[2J\u001b[0;0H");
        var y = 0, numUnfinished = 0, nerrors = 0;
        _.each(tmp, t => {
            //console.log(t.status);
            //console.log([t.name, t.status]);
            t.updatestat();
            if (t.status != 'done' && t.status != 'error') numUnfinished++;
            if (t.status == 'error') nerrors++;
            var left = [padright(util.format('%s', t.name), 55), padright(t.status.toUpperCase(), 8, true), ' ['],
                right = ']' + padright(util.format('%s %s', t.stats.speed, t.stats.remaining), 60, true);
            //term.moveTo.white(0, 40, JSON.stringify(left));
            var x = 0;
            term.moveTo.white(x, y, left[0]);
            term.moveTo.white(x = left[0].length, y, left[1]);
            term.moveTo.white(x = x + left[1].length, y, left[2]);
            //term.moveTo.white(0, y, left);
            var writefunk = term.white;
            if (t.color == 'green') writefunk = term.green;
            if (t.color == 'red') writefunk = term.red;
            if (t.color == 'cyan') writefunk = term.cyan;
            term.moveTo(x = x + 3, y);
            var availwidth = width - x - right.length,
                pctToFill = t.percent / t.progress.max,
                charsToFill = Math.floor(availwidth * pctToFill),
                i = 0;
            for (i = 0; i < charsToFill; i++)writefunk('#');
            for (; i < availwidth; i++)writefunk(' ');
            term.white(right);
            y++;
        });
        if (numUnfinished == 0 && this.tracked.length > 0) {
            term.moveTo.white(0, y++, util.format('%s packages downloaded (%s errors).', this.tracked.length - nerrors, nerrors));
            clearInterval(this.interid);
            this.emit('complete');
        } else {
            term.moveTo.white(0, y++, util.format('%s/%s downloading (%s errors)', numUnfinished, this.tracked.length - numUnfinished, nerrors));
        }
    }
    start() {
        _.each(this.tracked, t => t.download.start());
    }
    addUrl(url, dest, meta) {
        var ti = new TrackedItem({ meta: meta, url: url, dest: dest });
        var dl = this.downloader.download(url, ti.tmpname);
        dl.on('start', function () {
            ti.status = 'started';
        });
        var mv = require('mv');
        dl.on('end', function (dl) {
            ti.status = 'done';
            if (dl.status == 2)
                mv(ti.tmpname, dest, function (err) {
                    if (err) console.error(err);
                });
        });
        dl.on('error', function () {
            ti.status = 'error';
        });
        ti.on('statuschange', function (newstat) {
        });
        ti.download = dl;
        this.tracked.push(ti);
    }
}
module.exports = ProgressTracker;