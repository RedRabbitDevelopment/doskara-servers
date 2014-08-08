
//if(process.env.USER !== 'root')
//  throw new Error('must be root');
var _ = require('lodash');
var Queue = require('../mongo-queue');
var logger = new (require('../mongo-queue/logger'))('dyno');
var Q = require('q');
var os = require('os');
var exec = require('child_process').exec;

logger.log('connecting to database');
Queue.mongoConnect.then(function(db) {
  logger.log('connected to the database');
  var atoms = db.collection('atoms');
  var ipAddress = os.networkInterfaces().eth0[0].address;
  logger.log('searching for startInstance request');
  logger.log('ipAddress', ipAddress);
  return Q.all([
    Queue.next({
      event: 'startInstance',
      ipAddress: ipAddress
    }, {
      once: true
    }),
    Q.ninvoke(atoms, 'findOne', {
      ipAddress: ipAddress
    })
  ]).spread(function(request, atom) {
    // Note: atom may not be set because it could still be pointing at the old instance!
    if(request) {
      logger.log('got doc', request);
      var writeStream = Queue.getWriteStream(request.id);
      writeStream.write('got doc!');
      return buildContainer(request.name)
      .then(function() {
        return true;
      });
    } else if(atom) {
      console.log('here you are!', atom, atom.name);
      logger.log('restarting shut down atom', atom._id);
      return buildContainer(atom.image);
    } else {
      logger.log('no doc found, shutting down');
      return shutdown();
    }
  }).then(function(atom) {
    if(atom && atom._id) {
      Queue.on({
        event: 'stopInstance',
        atomId: atom._id
      }, function(request) {
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
      });
      return Q.ninvoke(atoms, 'update', {
        _id: atom._id,
        ipAddress: ipAddress
      }, {
        $set: {
          running: true
        }
      });
    }
  });
}).catch(function(err) {
  console.log('got error', err, err.stack);
}).then(function() {
  console.log('success!');
});


var running = true;
function shutdown() {
  running = false;
  //return Q.nfcall(exec, 'poweroff');
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
  console.log(query);
  return Q.ninvoke(atoms, 'findOne', query)
  .then(function(atom) {
    console.log('got atom', atom);
    var dependencies = {};
    var promises = _.map(atom.config && atom.config.dependencies || {}, function(depVersion, depName) {
      return buildContainer(depName, depVersion, childrenNamespace).then(function(container) {
        dependencies[depName] = container;
      });
    });
    var pullPromise = Q.nfcall(exec, 'docker pull "' + remoteName + '"');
    var removePromise = Q.nfcall(exec, 'docker rm "' + containerName + '"').catch(function() {}); // Ignore error
    var mongoPromise = null;
    if(atom.usesMongo) {
      mongoPromise = Queue.emitWithResponse({
        event: 'mongoRequest',
        db_id: containerName
      });
    }
    return Q.all(_.values(promises)).then(function() {
      console.log(' got ' + atom.image + ' dependencies');
      var links = Object.keys(dependencies).map(function(key) {
        return ['--link ', childrenNamespace + key, ':', key].join('');
      }).join(' ') + ' ';
      var ports;
      if(namespace == '')
        ports = '-p 80:80 ';
      else
        ports = '';
      console.log('docker pulling ' + remoteName);
      return Q.all([
        mongoPromise,
        pullPromise,
        removePromise
      ]).spread(function(mongoResponse) {
        var environmentVariables = {};
        if(mongoResponse) {
          environmentVariables.MONGO_URL = mongoResponse.mongoUrl;
        }
        environmentVariables = _.map(environmentVariables, function(value, key) {
          return ['-e ', key, '=', value].join('');
        }).join(' ') + ' ';
        console.log('pulled', atom.image, 'and running');
        return Q.nfcall(exec, 'docker run -d --name "' + containerName + '" ' + environmentVariables + ports + links + '"' + remoteName + '" /bin/bash -c "/start web"');
      }).spread(function(stdout) {
        console.log('built docker', atom.image, stdout);
        return atom;
      });
    });
  });
};
