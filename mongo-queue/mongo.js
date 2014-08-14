
var MongoClient = require('mongodb').MongoClient;
var Q = require('q');
var URI = 'mongodb://doskara:DH3e4ZD0UWUsEwwtM7i6pfZulDdk0Bfn@oceanic.mongohq.com:10056/doskara';

var Mongo = module.exports = {
  mongoConnect: Q.ninvoke(MongoClient, 'connect', URI),
  getCollection: function(collectionName) {
    return Mongo.mongoConnect.then(function(db) {
      return db.collection(collectionName);
    });
  }
}
