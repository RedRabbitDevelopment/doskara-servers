
var _ = require('lodash');
var Queue = require('../mongo-queue');
var ipAddress = require('os').networkInterfaces().eth0[0].address;
var uuid = require('uuid');

var MongoClient = require('mongodb').MongoClient;
var Q = require('q');
var URI = 'mongodb://localhost:27017/administration';

var mongoConnect = Q.ninvoke(MongoClient, 'connect', URI);

Queue.on('mongoRequest', function(doc) {
  return Q.all([
    mongoConnect,
    Queue.mongoConnect
  ]).spread(function(internalDb, externalDb) {
    var connections = externalDb.collection('connections');
    return Q.ninvoke(connections, 'findOne', {
      db_id: doc.db_id
    }).then(function(connection) {
      if(connection) {
        return connection;
      } else {
        var dbname, username, password;
        return Q.ninvoke(internalDb.admin(), 'listDatabases').then(function(dbNames) {
          dbNames = _.pluck(dbNames, 'name');
          do {
            dbname = uuid.v4();
          } while(-1 !== dbNames.indexOf(dbname));
          return Q.ninvoke(MongoClient, 'connect', 'mongodb://localhost:27017/' + dbname);
        }).then(function(theirDb) {
          username = uuid.v4();
          password = uuid.v4();
          return Q.ninvoke(theirDb, 'addUser', username, password, {
            roles: ['readWrite']
          });
        }).then(function() {
          return Q.ninvoke(connections, 'insert', {
            db_id: doc.db_id,
            username: username,
            password: password,
            dbname: dbname
          });
        });
      }
    });
  }).then(function(connection) {
    return 'mongodb://' + connection.username + ':' + connection.password + '@' + ipAddress + ':27017/' + connection.dbname;
  });
});
