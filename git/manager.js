var fs = require('fs');
var Q = require('q');
var Queue = require('../mongo-queue');
var Logger = require('../mongo-queue/logger');
var uuid = require('uuid');
var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var UserError = require('../mongo-queue/userError');

// var doc = {commit: 'e0fd2106b81e8ea46c0aefb75081cbab0c1b6611', username: 'data_store'};
// var archiveProcess = spawn('git', ['archive', doc.commit], {cwd: '/home/git/' + doc.username + '.git'});
// var gzipProcess = spawn('gzip');
// archiveProcess.stdout.pipe(gzipProcess.stdin);
// gzipProcess.stdout.pipe(process.stdout);

Queue.on('build-release', function(doc) {
console.log('got doc', doc);
  var logger = new Logger('build-release');
  logger.log('building', doc.release_id);
  return Queue.getFileUploadStream(logger).spread(function(writeStream, filename) {
    var archiveProcess = spawn('git', ['archive', doc.commit], {cwd: '/home/git/' + doc.atomName + '.git'});
    var gzipProcess = spawn('gzip', [], {
      stdio: [archiveProcess.stdout, 'pipe', process.stderr]
    });
    gzipProcess.stdout
.pipe(require('through2')(function(chunk, enc, cb) { console.log('here', chunk); writeStream.write(chunk, cb.bind(undefined, undefined, undefined)); }))
    archiveProcess.on('error', console.log.bind(console, 'archiveE'));
    gzipProcess.on('error', console.log.bind(console, 'gzipE'));
writeStream.on('error', console.log.bind(console, 'writeStreamE'));
    return Q.ninvoke(gzipProcess, 'on', 'close').then(function() {
      return Q.ninvoke(writeStream, 'close');
return d.promise;
    }).then(function() {
      return filename;
    });
  }).then(function(filename) {
    var readStream = Queue.getReadStream(function(message) {
      console.log('got message, emitting', message);
      return Queue.emit({
        event: 'release-build-message',
        user_id: doc.user_id,
        release_id: doc.release_id,
        message: message
      });
    });
    console.log('uploaded file, sending build request');
    return Queue.emitWithResponse({
      event: 'build',
      name: doc.atomName,
      id: readStream.streamId,
      version: doc.version,
      loggerId: logger.id,
      filename: filename
    }).then(function() {
      return Queue.emit({
        event: 'release-build-message',
        user_id: doc.user_id,
        release_id: doc.release_id,
        message: 'Build complete!',
        isComplete: true
      });
    });
  });
});

var authorizedFile = '/home/git/.ssh/authorized_keys';
Queue.on('add-key', function(doc) {
  var entry = '\ncommand=\"/usr/bin/gitreceive run ' + doc.username + ' ' + doc.fingerprint +
    '",no-agent-forwarding,no-pty,no-user-rc,no-X11-forwarding,no-port-forwarding ' + doc.key;
  var keypart = doc.key.split(' ')[1];
  var catChild = spawn('cat', [authorizedFile], {stdio: [null, null, process.stderr]});
  var grepChild = spawn('grep', [keypart], {stdio: [null, null, process.stderr]});
  catChild.stdout.pipe(grepChild.stdin);
  catChild.stdout.on('error', console.log.bind(console, 'gahhh'));
  grepChild.stdout.on('error', console.log.bind(console, 'bbbb'));
  var resul = [];
  grepChild.stdout.on('data', function(chunk) {
    resul.push(chunk.toString());
  });
  grepChild.on('error', console.log.bind(console, 'errrrrr'));
  catChild.on('error', console.log.bind(console, 'bbbbbbbb'));
  var def = Q.defer();
  grepChild.on('close', def.resolve);
  return def.promise.then(function(result) {
    if(!result)
      throw new UserError('AlreadyInUse');
    return Q.ninvoke(fs, 'writeFile', authorizedFile, new Buffer(entry), {flag: 'a'});
  });
});

Queue.on('remove-key', function(doc) {
  var find = 'gitreceive run ' + doc.username + ' ' + doc.fingerprint;
  return Q.nfcall(exec, 'sed -i "/' + find + '/d" ' + authorizedFile)
  .then(function(result) {
    console.log('result');
  });
});
