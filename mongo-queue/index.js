
var _ = require('lodash');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var Q = require('q');
var uuid = require('uuid');
var Stream = require('stream');

var URI = 'mongodb://doskara:DH3e4ZD0UWUsEwwtM7i6pfZulDdk0Bfn@oceanic.mongohq.com:10056/doskara';
var mongoConnect = Q.ninvoke(MongoClient, 'connect', URI).then(function(db) {
  MongoQueue.db = db;
  return db.collection('messages');
});
module.exports = MongoQueue = {
  mongoConnect: mongoConnect,
  emit: function(data) {
    return mongoConnect.then(function(messages) {
      data.timestamp = new Date();
      return Q.ninvoke(messages, 'insert', data);
    });
  },
  getWriteStream: function(writeStreamId) {
    var writeStream = new Stream.Writable();
    writeStream._write = function(chunk, encoding, callback) {
      MongoQueue.emit({
        event: 'write-stream',
        streamId: writeStreamId,
        message: chunk.toString()
      }).then(function() {
        callback();
      }, callback);
    };
    return writeStream;
  },
  getReadStream: function(streamId, fn) {
    if(!fn) {
      fn = streamId;
      streamId = uuid.v4();
    }
    var listener = MongoQueue.on({
      event: 'write-stream',
      streamId: streamId,
    }, {
      timePeriod: 100,
      maxProcessing: 20,
      frequency: 100
    }, function(doc) {
      fn(doc.message);
    });
    listener.streamId = streamId;
    return listener;
  },
  next: function(query, options) {
    var deferred = Q.defer();
    options = options || {};
    options.once = true;
    MongoQueue.on(query, options, function(doc) {
      deferred.resolve(doc);
    });
    return deferred.promise;
  },
  on: function(query, options, fn) {
    if(!fn) {
      fn = options;
      options = {};
    }
    options = _.defaults(options, {
      frequency: 1000,
      timePeriod: 3600000,
      once: false,
      maxProcessing: 5
    });
    if(_.isString(query)) {
      query = {event: query};
    }
    var processingDate = {$lt: null};
    query = _.defaults({
      $and: [{
        $or: [{
          numErrors: {$lt: 5},
        }, {
          numErrors: {$exists: false}
        }],
      }, {
        $or: [{
          processingDate: processingDate
        }, {
          processingDate: {$exists: false}
        }]
      }]
    }, query);
    var listening = true;
    var listener = {
      processing: [],
      runQuery: function(method, args) {
        return mongoConnect.then(function(collection) {
          return Q.npost(collection, method, args);
        });
      },
      processDoc: function(doc) {
        return Q.fcall(function() {
          return fn(doc);
        }).then(function() {
          return listener.runQuery('remove', [{_id: doc._id}]);
        }, function(err) {
          return listener.runQuery('update', [{_id: doc._id}, {
            $push: {errors: {
              message: err.message,
              stack: err.stack
            }},
            $inc: {numErrors: 1}
          }]);
        });
      },
      stop: function() {
        listening = false;
      },
      getDoc: function() {
        processingDate.$lt = new Date(Date.now() - options.timePeriod);
        return listener.runQuery('findAndModify', [query, [['_id', 'asc']], {
          $set: {processingDate: new Date()}
        }]);
      },
      waitForProcessing: function() {
        return Q.fcall(function() {
          if(listener.processing.length >= options.maxProcessing) {
            var deferred = Q.defer();
            listener.processing.forEach(function(process) {
              process.then(function() {
                deferred.resolve();
              });
            });
            return deferred.promise.then(function() {
              return listener.waitForProcessing();
            });
          }
        });
      }
    };
    listener.finishPromise = listen();
    return listener;

    function listen() {
      return listener.waitForProcessing().then(function() {
        return listener.getDoc();
      }).then(function(doc) {
        doc = doc[0];
        if(listening) {
          if(doc) {
            listening = !options.once;
            var process = listener.processDoc(doc);
            var processing = listener.processing;
            processing.push(process = process.fin(function() {
              processing.splice(processing.indexOf(process), 1);
            }));
          }
          var timeoutDef = Q.defer();
          setTimeout(function() {
            timeoutDef.resolve(listen());
          }, options.frequency);
          return timeoutDef.promise;
        } else {
          return Q.all(listener.processing);
        }
      });
    }
  }
};
