require('events').EventEmitter.prototype._maxListeners = 100;
const execr = require('./exec'),
    _ = require('lodash'),
    Downloader = require('mt-files-downloader'),
    async = require('async');
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
            var dler = new Downloader();
            var downloads = _.map(infos, pkg => {
                var tmppath = require('tmp').tmpNameSync();
                var p = dler.download(pkg.url, tmppath);
                pkg.success = false;
                pkg.setStatus = function (stat) {
                    if (stat == 'error') pkg.success = false;
                    else if (stat == 'complete') pkg.success = true;
                }
                p.tmppath = tmppath;
                p.realpath = dir + pkg.name;
                p.pkg = pkg;
                return p;
            });
            /*function padright(str, len) {
                function pad(value, length) {
                    return (value.toString().length < length) ? pad(value + " ", length) : value;
                }
                return pad(str, len).substring(0, len);
            }
            var multimeter = require('multimeter'),
                multi = multimeter(process);
            var height = process.stdout.getWindowSize()[1],
                width = process.stdout.getWindowSize()[0],
                pkgnameWidth = Math.floor(width / 4);
            barWidth = Math.floor((width / 4) * 2);
            yindex = 0;
            _.each(downloads, dl => {
                var myurl = dl.url, path = dl.filePath, pkg = dl.pkg;
                var padname = padright(pkg.name, pkgnameWidth);
                dl.on('start', function (dl) {
                    var bar = multi(0, (height - 1) - (yindex++), { width: barWidth, before: padname + ' [' });
                    dl.bar = bar;
                });
                dl.on('end', function (dl) {
                    
                });
                dl.on('error', function(dl){
                    console.error(dl.error);
                })
                dl.start();
            });
            setInterval(function () {
                _.each(downloads, dl => {
                    if (!dl.bar) return;
                    var charm = multi.charm;
                    if (dl.status == 1) {
                        var stats = dl.getStats();
                        dl.bar.after = '] ' + Downloader.Formatters.speed(stats.present.speed) + ' ETA ' + Downloader.Formatters.remainingTime(stats.future.eta);
                        dl.bar.percent(stats.total.completed);
                        dl.pkg.setStatus('in-progress');
                    } else if (dl.status == 2) {//error
                        dl.bar.percent(0);
                        dl.bar.after = '] RETRY';
                        dl.bar.solid.background = 'red';
                        dl.pkg.setStatus('error');
                    } else if (dl.status == 3) {//complete fine
                        dl.bar.after = '] DONE                 ';
                        dl.bar.solid.background = 'green';
                        dl.bar.percent(100);
                        dl.pkg.setStatus('complete');
                    } else if (dl.status == -2) {//stopped
                        dl.bar.solid.background = 'red';
                        dl.pkg.setStatus('error');
                    } else {
                        dl.bar.solid.background = 'cyan';
                        dl.pkg.setStatus('unknown');
                    }
                });
                if (_.every(downloads, d => d.success)) {

                }
            }, 500);*/
        }], function (err, result) {
            if (err) console.error(err);
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

});

/*vince@vince-lappy:/mnt/c/Users/Vince$ apt-cache show vim
Package: vim
Priority: optional
Section: editors
Installed-Size: 2185
Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>
Original-Maintainer: Debian Vim Maintainers <pkg-vim-maintainers@lists.alioth.debian.org>
Architecture: amd64
Version: 2:7.4.052-1ubuntu3
Provides: editor
Depends: vim-common (= 2:7.4.052-1ubuntu3), vim-runtime (= 2:7.4.052-1ubuntu3), libacl1 (>= 2.2.51-8), libc6 (>= 2.15), libgpm2 (>= 1.20.4), libpython2.7 (>= 2.7), libselinux1 (>= 1.32), libtinfo5
Suggests: ctags, vim-doc, vim-scripts
Filename: pool/main/v/vim/vim_7.4.052-1ubuntu3_amd64.deb
Size: 955616
MD5sum: f870bba8885a240acb21977e22503c73
SHA1: 038639fda5e3a73d7f26a8e1bd20faa0282c74ff
SHA256: 1c59553660fb37a9a0317ce7a906b55d580be53e4a478c55a88da4de9f9a86b9
Description-en: Vi IMproved - enhanced vi editor
 Vim is an almost compatible version of the UNIX editor Vi.
 .
 Many new features have been added: multi level undo, syntax
 highlighting, command line history, on-line help, filename
 completion, block operations, folding, Unicode support, etc.
 .
 This package contains a version of vim compiled with a rather
 standard set of features.  This package does not provide a GUI
 version of Vim.  See the other vim-* packages if you need more
 (or less).
Description-md5: 59e8b8f7757db8b53566d5d119872de8
Homepage: http://www.vim.org/
Bugs: https://bugs.launchpad.net/ubuntu/+filebug
Origin: Ubuntu
Supported: 5y
Task: ubuntu-usb, cloud-image, server, edubuntu-desktop-gnome, edubuntu-usb*/