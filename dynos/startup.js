
var Queue = require('../mongo-queue');
var Q = require('q');

Queue.mongoConnect.then(function() {
  var messages = Queue.db.collection('messages');
  messages.findAndModify([{
    event: 'startInstance',
    ipAddress: os.networkInterfaces().eth0
  }, [['_id', 'desc']], {remove: true}
  ], function(doc) {
    if(doc) {
      var writeStream = Queue.getWriteStream(doc.id);
      writeStream.write('got doc!');
      console.log('got doc');
      var atoms = Queue.db.collection('atoms');
      return buildContainer(doc.atomName)
      .then(function() {
        return Queue.emit({
        event: 'startInstance-complete',
          id: doc.id
        });
      });
    }
  });
});

var remote = '10.0.0.111:5000';
function buildContainer(atomName, version) {
  var query = {name: atomName};
  var remoteName = remote + '/' + atomName;
  if(version) {
    query.version = version;
    remoteName += '.' + version;
  }
  return Q.ninvoke(atoms, 'findOne', query)
  .then(function(atom) {
    console.log('got atom', atom.name);
    var dependencies = {};
    _.forEach(atom.dependencies || {}, function(depVersion, depName) {
      return buildContainer(depName, depVersion).then(function(container) {
        dependencies[depName] = container;
      });
    });
    return Q.all(_.values(deps)).then(function() {
      console.log(' got ' + atom.name + ' dependencies');
      var links = Object.keys(dependencies).map(function(key) {
        return ['--link ', key, ':', key].join('');
      }).join(' ') + ' ';
      var ports;
      if(atomName == 'my_project')
        ports = '-p 80:80 ';
      else
        ports = '';
      return Q.nfcall(exec, 'docker pull "' + remoteName + '"').then(function() {
        console.log('pulled', atom.name);
        return Q.ninvoke(exec, 'docker run -d --name "' + atom.name + '" ' + ports + links + '"' + remoteName + '" /bin/bash -c "/start web"');
      }).spread(function(stdout) {
        console.log('built docker', atom.name, stdout);
      });
    });
  });
});
