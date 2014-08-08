
var Queue = require('../mongo-queue');
require('./');

console.log('emitting');
Queue.emitWithResponse({
  event: 'mongoRequest',
  db_id: 'random'
}).then(function(connection) {
  console.log('got', connection);
  return Queue.emitWithResponse({
    event: 'mongoRequest',
    db_id: 'random'
  }).then(function(connection) {
    console.log('got2', connection);
    return Queue.emitWithResponse({
      event: 'mongoRequest',
      db_id: 'rando3'
    }).then(function(connection) {
      console.log('got3', connection);
    });
  });
}).catch(console.log.bind(console, 'ffff'))
.then(function() {
  console.log('end');
  process.exit();
});
