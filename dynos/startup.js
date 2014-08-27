
//if(process.env.USER !== 'root')
//  throw new Error('must be root');
var _ = require('lodash');
var Queue = require('../mongo-queue');
var Logger = require('../mongo-queue/logger');
var baseLogger = new Logger('dynos-base');
var Q = require('q');
var os = require('os');
var exec = require('child_process').exec;

console.log('starting right here what what');

baseLogger.log('initializing iptables');
var command = 'sudo iptables -A INPUT -p tcp --dport 80 -j LOG ' +
  '--log-prefix="DOSKARA-APP-REQUEST" -m limit --limit 1/m';
exec(command, baseLogger.log.bind(baseLogger, 'iptablesErr'));

baseLogger.log('connecting to database');
Queue.mongoConnect.then(function(db) {
  baseLogger.log('connected to the database');
  var atoms = db.collection('atoms');
  var ipAddress = os.networkInterfaces().eth0[0].address;
  baseLogger.log('searching for startInstance request');
  baseLogger.log('ipAddress', ipAddress);
  var gotDoc = false;
  var listener = Queue.on({
    event: 'startInstance',
    ipAddress: ipAddress
  }, {
    once: true,
    next: true
  }, function(request) {
    if(request) {
      gotDoc = true;
      baseLogger.log('is a requested start', request.loggerId, request.id);
      var logger = new Logger('dynos');
      logger.log('got doc', request);
      var writeStream = Queue.getWriteStream(request.id);
      writeStream.write('Dyno running! Building services...');
console.log('started');
      return buildContainer(request.name)
      .then(function() {
console.log('services built and running');
        writeStream.write('Services built and running!');
        logger.log('Services built and running!');
        return true;
      });
    }
  });
  return Q.all([
    listener.finishPromise,
    Q.ninvoke(atoms, 'findOne', {
      ipAddress: ipAddress
    })
  ]).spread(function(request, atom) {
    // Note: atom may not be set because it could still be pointing at the old instance!
    if(!gotDoc) {
      if(atom) {
        baseLogger.log('restarting shut down atom', atom._id);
        return buildContainer(atom.image);
      } else {
        baseLogger.log('no doc found, shutting down');
      }
    }
  }).then(function(atom) {
console.log('hahaha', atom, atom._id);
    if(atom && atom._id) {
      watchForShutdown(atom);
    }
  });
}).catch(function(err) {
  baseLogger.log('got error', err, err.stack);
}).then(function() {
  baseLogger.log('success!');
});

var oneHour = 1000 * 60 * 60;
var fifteenMinutes = oneHour / 4;
oneHour = 1000 * 60 * 3;
fifteenMinutes = oneHour / 3;
function watchForShutdown(atom) {
console.log('checking for shutdown');
  // Check every fifteen minutes
  setInterval(function() {
    return Q.nfcall(exec, 'grep "DOSKARA-APP-REQUEST" /var/log/syslog | tail -n 1')
    .spread(function(stdout, stderr) {
console.log('booya', stdout);
      if(stdout) {
        var now = new Date();
        stdout = stdout.split(' ');
        stdout.splice(1, 0, now.getFullYear());
        var occurrence = new Date(stdout.slice(0, 4).join(' '));
        var diff = now.getTime() - occurrence.getTime();
        if(diff > oneHour) {
          return Q.ninvoke(atoms, 'update', {
            _id: atom._id,
            ipAddress: ipAddress
          }, {
            $set: {
              running: false
            }
          }).then(function() {
            return shutdown(); 
          });
        }
      }
    }).done();
  }, fifteenMinutes);
}

var running = true;
function shutdown() {
  running = false;
  return Q.nfcall(exec, 'poweroff');
}

var remote = '10.0.0.111:5000';
function buildContainer(atomName, version, namespace) {
  namespace = namespace || '';
  var query = {image: atomName};
  var remoteName = remote + '/' + atomName;
  if(version) {
    query.version = version;
    remoteName += '.' + version;
  }
  var atoms = Queue.db.collection('atoms');
  var containerName = namespace + atomName;
  var childrenNamespace = containerName + '.'
  baseLogger.log(query);
  return Q.ninvoke(atoms, 'findOne', query)
  .then(function(atom) {
    baseLogger.log('got atom', atom);
    var dependencies = {};
    var promises = _.map(atom.config && atom.config.dependencies || {}, function(depVersion, depName) {
      return buildContainer(depName, depVersion, childrenNamespace).then(function(container) {
        dependencies[depName] = container;
      });
    });
console.log('pulling', 'docker pull "' + remoteName + '"');
    var pullPromise = Q.nfcall(exec, 'docker pull "' + remoteName + '"');
    var removePromise = Q.nfcall(exec, 'docker stop "' + containerName + '"')
    .then(function() { return Q.nfcall(exec, 'docker rm "' + containerName + '"'); })
    .catch(function() {console.log('bbb', arguments);}); // Ignore error
    var mongoPromise = null;
    if(atom.usesMongo) {
      mongoPromise = Queue.emitWithResponse({
        event: 'mongoRequest',
        db_id: containerName
      });
    }
    return Q.all(_.values(promises)).then(function() {
      baseLogger.log(' got ' + atom.image + ' dependencies');
      var links = Object.keys(dependencies).map(function(key) {
        return ['--link ', childrenNamespace + key, ':', key].join('');
      }).join(' ') + ' ';
      var ports;
      if(namespace == '')
        ports = '-p 80:80 ';
      else
        ports = '';
      baseLogger.log('docker pulling ' + remoteName);
      return Q.all([
        mongoPromise,
        pullPromise,
        removePromise
      ]).spread(function(mongoResponse) {
console.log('after removed');
        var environmentVariables = {};
        if(mongoResponse) {
          environmentVariables.MONGO_URL = mongoResponse.mongoUrl;
        }
        environmentVariables = _.map(environmentVariables, function(value, key) {
          return ['-e ', key, '=', value].join('');
        }).join(' ') + ' ';
        baseLogger.log('pulled', atom.image, 'and running');
        return Q.nfcall(exec, 'docker run -d --name "' + containerName + '" ' + environmentVariables + ports + links + '"' + remoteName + '" /bin/bash -c "/start web"');
      }).spread(function(stdout) {
        baseLogger.log('built docker', atom.image, stdout);
        return atom;
      });
    });
  });
};
