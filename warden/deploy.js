
var Queue = require('../mongo-queue');
var Q = require('q');
var exec = require('child_process').exec;

Queue.on('deploy', function(doc) {
  var atomName = doc.name;
  var atoms = Queue.db.collection('atoms');
  var writeStream = Queue.getWriteStream(doc.id);
  return Q.ninvoke(atoms, 'findOne', {
    image: atomName
  }).then(function(atom) {
    writeStream.write('Got atom');
    return Q.nfcall(exec, 'aws ec2 run-instances --image-id ami-53a8d263 --security-group-ids sg-00810465 --instance-type t2.micro --subnet-id subnet-03739e66 --output text --query "Instances[*].[InstanceId,PrivateIpAddress]"')
    .then(function(output) {
      output = output[0].split('\n');
      var newInstanceId = output[0];
      var newIp = output[1];
      console.log('got ' + newInstanceId + ',' + newIp);
      writeStream.write('got ' + newInstanceId + ' ' + newIp);
      return Queue.emitWithResponse({
        event: 'startInstance',
        ipAddress: newIp,
        name: atomName,
        id: doc.id
      }).then(function() {
        console.log('got instance complete');
        if(atom.oldInstanceId)
          return Q.nfcall(exec, 'aws ec2 terminate-instances --instance-ids "' + atom.instanceId);
      }).then(function() {
        console.log('updating atom');
        atoms.update({
          _id: atom._id
        }, {
          instanceId: newInstanceId,
          ipAddress: newIp
        });
      });
    });
  }).then(function() {
    console.log('completing deploy');
    Queue.emit({
      event: 'deploy-complete',
      id: doc.id
    });
  });
});