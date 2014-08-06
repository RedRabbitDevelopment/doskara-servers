
var Queue = require('../mongo-queue');
var Q = require('q');
var exec = require('child_process').exec;

Queue.on('deploy', function(doc) {
  var atomName = doc.name;
  var atoms = Queue.db.collections('atoms');
  var writeStream = Queue.getWriteStream(doc.id);
  return Q.ninvoke(atoms, 'findOne', {
    image: atomName
  }).then(function(atom) {
    writeStream.write('Got atom');
    return Q.nfcall(exec, 'aws ec2 run-instances --image-id ami-9cbdd2ac --security-group-ids sg-4b894a2e --instance-type t1.micro --subnet-id subnet-18739e7d --output text --query "Instances[*].[InstanceId,PrivateIpAddress]"');
    .then(function(output) {
      output = output.split('\t');
      var newInstanceId = output[0];
      var newIp = output[1];
      console.log('got ' + newInstanceId + ' ' + newIp);
      writeStream.write('got ' + newInstanceId + ' ' + newIp);
      Queue.emit({
        event: 'startInstance',
        ipAddress: newIp,
        name: atomName,
        id: doc.id
      });
      Queue.next({
        event: 'startInstance-complete',
        id: doc.id
      }).then(function() {
        if(atom.oldInstanceId)
          return Q.nfcall(exec, 'aws ec2 terminate-instances --instance-ids "' + atom.instanceId);
      }).then(function() {
        atoms.update({
          _id: atom._id
        }, {
          instanceId: newInstanceId,
          ipAddress: newIp
        });
      });
    });
  });
});
