
if(process.env.USER !== 'root')
  throw new Error('must be root');
var _ = require('lodash');
var Queue = require('../mongo-queue');
var Q = require('q');
var os = require('os');
var exec = require('child_process').exec;

Queue.mongoConnect.then(function() {
console.log('querying',  {
    event: 'startInstance',
    ipAddress: os.networkInterfaces().eth0[0].address
  });
  return Queue.next({
    event: 'startInstance',
    ipAddress: os.networkInterfaces().eth0[0].address
  }, {
    once: true
  }).then(function(doc) {
    if(doc) {
      console.log('got doc', doc);
      var writeStream = Queue.getWriteStream(doc.id);
      writeStream.write('got doc!');
      return buildContainer(doc.name)
      .then(function() {
        return true;
      });
    } else {
      console.log('no doc found');
    }
  });
}).catch(function(err) {
  console.log('got error', err, err.stack);
}).then(function() {
  console.log('success!');
  //process.exit();
});

var remote = '10.0.0.111:5000';
function buildContainer(atomName, version) {
  var query = {image: atomName};
  var remoteName = remote + '/' + atomName;
  if(version) {
    query.version = version;
    remoteName += '.' + version;
  }
  var atoms = Queue.db.collection('atoms');
console.log(query);
  return Q.ninvoke(atoms, 'findOne', query)
  .then(function(atom) {
    console.log('got atom', atom);
    var dependencies = {};
    var promises = _.map(atom.config && atom.config.dependencies || {}, function(depVersion, depName) {
      return buildContainer(depName, depVersion).then(function(container) {
        dependencies[depName] = container;
      });
    });
    var pullPromise = Q.nfcall(exec, 'docker pull "' + remoteName + '"');
    return Q.all(_.values(promises)).then(function() {
      console.log(' got ' + atom.image + ' dependencies');
      var links = Object.keys(dependencies).map(function(key) {
        return ['--link ', key, ':', key].join('');
      }).join(' ') + ' ';
      var ports;
      if(atomName == 'my_project')
        ports = '-p 80:80 ';
      else
        ports = '';
      console.log('docker pulling ' + remoteName);
      return pullPromise.then(function() {
        console.log('pulled', atom.image, 'and running');
        return Q.nfcall(exec, 'docker run -d --name "' + atom.image + '" ' + ports + links + '"' + remoteName + '" /bin/bash -c "/start web"');
      }).spread(function(stdout) {
        console.log('built docker', atom.image, stdout);
      });
    });
  });
};
