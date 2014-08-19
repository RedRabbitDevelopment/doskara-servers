
var Queue = require('../mongo-queue');
var Q = require('q');
var exec = require('child_process').exec;
var Logger = require('../mongo-queue/logger');
var logger = new Logger('warden');

Queue.on('deploy', function(doc) {
  logger.log('Got a document!', doc);
  var atomName = doc.name;
  var atoms = Queue.db.collection('atoms');
  var writeStream = Queue.getWriteStream(doc.id);
  return Q.ninvoke(atoms, 'findOne', {
    image: atomName
  }).then(function(atom) {
    writeStream.write('Deploying aws ec2 instance');
    return Q.nfcall(exec, 'aws ec2 run-instances --image-id ami-0789cc37 --security-group-ids sg-00810465 --instance-type t2.micro --subnet-id subnet-03739e66 --output text --query "Instances[*].[InstanceId,PrivateIpAddress]"')
    .then(function(output) {
      output = output[0].split('\t');
      var newInstanceId = output[0];
      var newIp = output[1].replace('\n', '');
      logger.log('got ' + newInstanceId + ',' + newIp);
      writeStream.write('Successfully deployed instance');
      writeStream.write('Waiting for instance to initiate');
      return Queue.emitWithResponse({
        event: 'startInstance',
        ipAddress: newIp,
        name: atomName,
        id: doc.id
      }).then(function() {
        logger.log('got instance complete', atom);
        if(atom.instanceId) {
          logger.log('shutting down previous structure', atom.instanceId);
          return Q.nfcall(exec, 'aws ec2 terminate-instances --instance-ids "' + atom.instanceId + '"');
        }
      }).then(function() {
        logger.log('updating atom');
        return Q.ninvoke(atoms, 'update', {
          _id: atom._id
        }, {
          $set: {
            running: true,
            instanceId: newInstanceId,
            ipAddress: newIp
          }
        });
      });
    });
  }).then(function() {
    logger.log('completing deploy');
  });
});

Queue.on('startStoppedInstance', function(doc) {
  var atomName = doc.name;
  var atoms = Queue.db.collection('atoms');
  //var writeStream = Queue.getWriteStream(doc.id);
  return Q.ninvoke(atoms, 'findOne', {
    image: atomName
  }).then(function(atom) {
    //writeStream.write('Got atom');
    if(atom && atom.instanceId) {
      return Q.nfcall(exec, 'aws ec2 start-instances --instance-ids "' + atom.instanceId + '"')
      .then(function(output) {
        //writeStream.write('got ' + newInstanceId + ',' + newIp);
        return Queue.emitWithResponse({
          event: 'startInstance',
          ipAddress: atom.ipAddress,
          name: atomName,
          id: doc.id
        }).then(function() {
          logger.log('updating atom', arguments);
          return Q.ninvoke(atoms, 'update', {
            _id: atom._id
          }, {
            $set: {
              running: true,
              instanceId: newInstanceId,
              ipAddress: newIp
            }
          });
        });
      });
    }
  }).then(function() {
    logger.log('completing start stopped instance');
  });
});
