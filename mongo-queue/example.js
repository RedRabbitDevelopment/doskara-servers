
var Queue = require('./');
var Q = require ('q');

var count = 0;
var listener = Queue.on('tmp', {
  maxProcessing: 2
}, function(doc) {
  count++;
  console.log(doc);
  if(count >= 10) {
    listener.stop();
  }
  var def = Q.defer();
  setTimeout(function() {
    console.log('resolving');
    def.resolve();
  }, 5000);
  return def.promise;
});
listener.listen().then(function() {
  process.exit();
}).done();
