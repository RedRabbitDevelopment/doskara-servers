
var Q = require('q');
var Queue = require('../mongo-queue');
var Logger = require('../mongo-queue/logger');
var uuid = require('uuid');
var spawn = require('child_process').spawn;

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
