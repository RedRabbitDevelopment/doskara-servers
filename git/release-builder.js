
var Queue = require('../mongo-queue');
var Logger = require('../mongo-queue/logger');
var uuid = require('uuid');
var spawn = require('child_process').spawn;

Queue.on('build-release', function(doc) {
  var logger = new Logger('build-release');
  logger.log('building', doc.release_id);
  var archiveProcess = spawn('git', ['archive', doc.commit], {cwd: '/home/git/' + doc.username + '.git'});
  var gzipProcess = spawn('gzip');
  archiveProcess.stdout.pipe(gzipProcess.stdin);
  return Queue.uploadFile(gzipProcess.stdout, logger)
  .then(function(gs, filename) {
    var readStream = Queue.getReadStream(function(message) {
      return Queue.emit('release-build-message', {
        user_id: doc.user_id,
        release_id: doc.release_id,
        message: message
      });
    });
    return Queue.emitWithResponse({
      event: 'build',
      name: doc.atomName,
      id: readStream.id,
      version: doc.version,
      loggerId: logger.id,
      filename: filename
    });
  });
});
