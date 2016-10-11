require('events').EventEmitter.prototype._maxListeners = 100;
const spawn = require('child_process').spawn;
const execr = require('./exec'),
    _ = require('lodash'),
    Downloader = require('mt-files-downloader'),
    async = require('async');
const termkit = require('terminal-kit'), term = termkit.terminal;
var mirrors = [];
var needroot = false;
function geturls(packages, cb) {
    //if (!Array.isArray(packages)) packages = packages.split(' ');
    var package = packages.join(' ');
    async.waterfall([
        function (next) {
            execr('apt-get -y --print-uris install ' + package, (err, stdout) => {
                var package_info = {};
                _.each(stdout.split(/\r?\n/g), function (line) {
                    if (line.indexOf("'") != 0) return;
                    var reg = /'([^\s]+)'\s([^\s]+)\s(.+)\s.+:([^\s]+)/g;
                    var rres = reg.exec(line);
                    if (!rres) {
                        next(new Error("oops"), null);
                        return;
                    }
                    package_info[rres[2]] = {
                        url: rres[1],
                        name: rres[2],
                        size: rres[3],
                        checksum: rres[4]
                    };
                });
                next(null, package_info);
            });
        }, function (infos, next) {
            execr('apt-config shell APTCACHE Dir::Cache::archives/d', (err, stdout) => {
                var reg = /.*'([^']+)'/;
                var res = (reg.exec(stdout));
                if (!res) next(new Error("regex fail"), null);
                else next(null, infos, res[1]);
            });
        }, function (infos, dir, next) {
            const ProgressTracker = require('./progress-track');
            var tracker = new ProgressTracker();
            var wasEmpty = true;
            _.each(infos, pkg => {
                wasEmpty = false;
                tracker.addUrl(pkg.url, dir + pkg.name, pkg);
            });
            if (wasEmpty) {
                next(null);
                return;
            }
            tracker.on('complete', function () {
                next(null);
            });
            tracker.start();
        }, function (next) {
            /*execr('apt-get -y install ' + package, (err, stdout) => {
                if (err) { next(err); return; }
                next(null, stdout);
            });*/
            var aget = spawn('apt-get', ('-y install ' + package).split(' '));
            aget.stdout.on('data', d => term(d.toString()));
            aget.stderr.on('data', d => term.red(d.toString()));
            aget.on('exit', function (code) {
                next(code);
            });
        }], function (err, result) {
            cb(err, result);
        });
}
function showhelp() {
    console.log('HELP: afast nodejs');
}
var args = process.argv.slice(2);
console.log(args);
if (args.length < 2) {
    showhelp();
    process.exit();
}
var mode = args[0];
var pkgs = [];
for (var i = 1; i < args.length; i++) {
    pkgs.push(args[i]);
}
if (process.getuid && process.getuid() !== 0) {
    console.log('Must run as root');
    showhelp();
    process.exit();
}
geturls(pkgs, function (err, result) {
    if (err) {
        term.red(err.message);
        term.processExit(result);
    } else if (result) {
        //term.white(result);
        term.processExit(result);
    }
});