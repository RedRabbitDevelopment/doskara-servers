
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
      return Queue.emit({
        event: 'startInstance-complete',
        id: doc.id
      });
    }
  });
});
