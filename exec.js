const exec = require('child_process').exec;

module.exports = function(cmd, cb){
    var child = exec(cmd, function(error, stdout, stderr){
        cb(error,stdout,stderr);
    });
};