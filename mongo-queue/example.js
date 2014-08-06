
var Queue = require('./');

Queue.mongoConnect.then(function() {
  Queue.getReadStream('booya', function(message) {
    console.log(message);
  });
});
