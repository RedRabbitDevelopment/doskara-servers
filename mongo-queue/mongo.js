
var URI = 'mongodb://doskara:DH3e4ZD0UWUsEwwtM7i6pfZulDdk0Bfn@oceanic.mongohq.com:10056/doskara';
var mongoConnect = Q.ninvoke(MongoClient, 'connect', URI).then(function(db) {
  return MongoQueue.db = db;
});
var Mongo = module.exports = {
  mongoConnect: mongoConnect,
  getCollection: function(collectionName) {
    return Mongo.mongoConnect.then(function(db) {
      return db.collection(collectionName);
    });
  }
}
