
var Q = require('q');
var _ = require('lodash');
var cp = require('child_process');
var spawn = cp.spawn;
var exec = cp.exec;
var mongodb = require('mongodb');
var MongoQueue = require('../mongo-queue');
var remote = 'warehouse:5000';

MongoQueue.mongoConnect.then(function(messages) {
  Q.ninvoke(messages, 'remove', {});
  Q.ninvoke(messages, 'insert', {
    event: 'build',
    name: 'happy',
    version: 'day',
    filename: 'example.tar',
    streamId: 'booya'
  });
}).done();

var listener = MongoQueue.on('build', {
  maxProcessing: 1,
  timePeriod: 600000 // Ten minutes
}, function(doc) {
  console.log('got ', doc);
  var imageName = remote + '/' + doc.name;
  if(doc.version) imageName += '.' + doc.version;
  var mongoStream = MongoQueue.getWriteStream(doc.id);
  mongoStream.write('Building container');
  return Q.fcall(function() {
    var gs = new mongodb.GridStore(MongoQueue.db, doc.filename, 'r');
    return Q.ninvoke(gs, 'open');
  }).then(function(gs) {
    console.log('piping');
    var child = spawn('docker', ['run', '-i', '-a', 'stdin', 'progrium/buildstep', '/bin/bash', '-c', 'mkdir -p /app && tar -xC /app && /build/builder']);
    gs.stream(true).pipe(child.stdin);
    child.stderr.pipe(process.stdout);
    var chunks = [];
    var result = null;
    child.stdout.on('data', function(chunk) {
      chunks.push(chunk.toString());
    });
    child.stdout.on('end', function() {
      result = chunks.join('').replace('\n', '');
    });
    return makePromise(child)
    .then(function() { console.log(arguments); return result; });
  }).then(function(id) {
    var attachProcess = spawn('docker', ['attach', id]);
    attachProcess.stdout.pipe(mongoStream);
    attachProcess.stderr.pipe(mongoStream);
    console.log('waiting', id);
    var waitChild = spawn('docker', ['wait', id]);
    return makePromise(waitChild)
    .then(function() {
      attachProcess.kill();
      console.log('commiting', id, imageName);
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
      mongoStream.write('Using ' + configFile);
      console.log('catting', configFile);
      var child = spawn('docker', ['run', '--rm', imageName, 'cat', '/app/' + configFile]);
      var chunks = [];
      var result = '';
      child.stdout.on('data', function(chunk) {
        chunks.push(chunk.toString());
      });
      child.stdout.on('end', function() { result = chunks.join(''); });
      return Q.ninvoke(child, 'on', 'close').then(function() { return result; })
      .then(function(result) {
        console.log('got result', result);
        return JSON.parse(result);
      });
    }).then(function(contents) {
      console.log('contents', contents);
      var atoms = MongoQueue.db.collection('atoms');
      return Q.ninvoke(atoms, 'update', {
        image: doc.name,
        version: doc.version
      }, {
        $set: { config: contents }
      }, {upsert: true});
    }).then(function() {
      console.log('pushing');
      mongoStream.write('Pushing to docker repository');
      var child = spawn('docker', ['push', imageName]);
      return makePromise(child);
    });
  }).finally(function() {
    console.log('cleaning');
    mongoStream.write('cleaning');
    return Q.all([
      Q.nfcall(exec, 'docker rm $(docker ps -a -q)'),
      Q.nfcall(exec, 'docker rm "' + imageName + '"'),
    ]).then(function() {
      return Q.nfcall(exec, 'docker rmi "' + imageName + '"');
    });
  }).then(function() {
    return Queue.emit({
      event: 'build-complete',
      id: doc.id
    });
  });
});

function makePromise(child) {
  var deferred = Q.defer();
  child.on('exit', deferred.resolve);
  child.on('error', deferred.reject);
  return deferred.promise;
}
