
var Q = require('q');
var Logger = require('./logger');
var logger = new Logger('test');
var mongo = require('./mongo');
logger.log('booya');
logger.log('oh no!');
logger.log('again');
logger.finish().then(function() {
  return mongo.mongoConnect;
}).then(function(db) {
  var logs = db.collection('logs');
  return logger.idPromise.then(function(id) {
    return Q.ninvoke(logs, 'findOne', {_id: id});
  });
}).then(function(log) {
  console.log(log);
}).done();
