
var through2 = require('through2');
var Q = require('q');
var _ = require('lodash');
var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var mongodb = require('mongodb');
var MongoQueue = require('../mongo-queue');
var remote = 'warehouse:5000';
var Logger = require('../mongo-queue/logger');
var UserError = require('../mongo-queue/userError');

var listener = MongoQueue.on('build', {
  maxProcessing: 1,
  timePeriod: 600000 // Ten minutes
}, function(doc) {
  var logger = new Logger('factory', doc.loggerId);
  logger.log('Got doc', doc);
  var imageName = remote + '/' + doc.name;
  if(doc.version) imageName += '.' + doc.version;
  var mongoStream = MongoQueue.getWriteStream(doc.id);
  mongoStream.write('Building container');
  return Q.fcall(function() {
    var gs = new mongodb.GridStore(MongoQueue.db, doc.filename, 'r');
    return Q.ninvoke(gs, 'open');
  }).then(function(gs) {
    logger.log('piping output of docker build');
    var child = spawn('docker', ['run', '-i', '-a', 'stdin', 'progrium/buildstep', '/bin/bash', '-c', 'mkdir -p /app && tar -xC /app && /build/builder']);
    gs.stream(true).pipe(child.stdin).on('error', console.log.bind(console, 'bad'));
    child.stderr.on('data', function(chunk) {
      logger.log('Docker build error', chunk.toString());
    });
    var chunks = [];
    var result = null;
    child.stdout.on('data', function(chunk) {
      chunks.push(chunk.toString());
    });
    child.stdout.on('end', function() {
      result = chunks.join('').replace('\n', '');
    });
    return makePromise(child)
    .then(function() { mongoStream.write('build result', JSON.stringify(arguments)); return result; });
  }).then(function(id) {
    logger.log('attaching to building container', id);
    var attachProcess = spawn('docker', ['attach', id]);
    attachProcess.stdout.pipe(through2(function(chunk, enc, cb) {
      mongoStream.write(chunk.toString());
      cb();
    }));
    attachProcess.stderr.pipe(through2(function(chunk, enc, cb) {
      // TODO: don't output error to end user
      mongoStream.write(chunk.toString());
      cb();
    }));
    logger.log('waiting for', id);
    var waitChild = spawn('docker', ['wait', id]);
    return makePromise(waitChild)
    .then(function() {
      attachProcess.kill();
      logger.log('commiting', id, imageName);
      var child = spawn('docker', ['commit', id, imageName]);
      return makePromise(child);
    }).then(function() {
      mongoStream.write('Extracting config file');
      var child = spawn('docker', ['run', '--rm', imageName, 'ls', '/app']);
      var chunks = [];
      var result = '';
      child.stdout.on('data', function(chunk) {
        chunks.push(chunk.toString());
      });
      child.stdout.on('end', function() { result = chunks.join('').split('\n'); });
      return makePromise(child).then(function() {
        return _.find(result, function(d) {
          return 0 === d.indexOf('Doskara.');
        });
      });
    }).then(function(configFile) {
      if(!configFile) {
        throw new UserError('Failed to find config file.');
      }
      mongoStream.write('Using ' + configFile);
      logger.log('catting', configFile);
      var child = spawn('docker', ['run', '--rm', imageName, 'cat', '/app/' + configFile]);
      var chunks = [];
      var result = '';
      child.stdout.on('data', function(chunk) {
        chunks.push(chunk.toString());
      });
      child.stdout.on('end', function() { result = chunks.join(''); });
      return Q.ninvoke(child, 'on', 'close').then(function() { return result; })
      .then(function(result) {
        try {
          return JSON.parse(result);
        } catch(e) {
          throw new UserError('Couldn\'t read config file. (Improper JSON).');
        }
      });
    }).then(function(contents) {
      var atoms = MongoQueue.db.collection('atoms');
      return Q.ninvoke(atoms, 'update', {
        image: doc.name,
        version: doc.version
      }, {
        $set: { config: contents }
      }, {upsert: true});
    }).then(function() {
      logger.log('pushing');
      mongoStream.write('Pushing to docker repository');
      var child = spawn('docker', ['push', imageName]);
      return makePromise(child);
    });
  }).finally(function() {
    logger.log('cleaning');
    mongoStream.write('cleaning');
    logger.log('docker rm "' + imageName + '"');
    Q.nfcall(exec, 'docker rm $(docker ps -a -q)')
    .then(function() {
      logger.log('docker rmi "' + imageName + '"');
      return Q.nfcall(exec, 'docker rmi "' + imageName + '"');
    });
  }).then(function() {
    mongoStream.write('Done building application');
    logger.log('done!');
  });
});

function makePromise(child) {
  var deferred = Q.defer();
  child.on('exit', deferred.resolve);
  child.on('error', deferred.reject);
  return deferred.promise;
}
