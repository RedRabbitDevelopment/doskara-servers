
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;
var Q = require('q');

var URI = 'mongodb://doskara:DH3e4ZD0UWUsEwwtM7i6pfZulDdk0Bfn@oceanic.mongohq.com:10056/doskara';
var mongoConnect = Q.ninvoke(MongoClient, 'connect', URI).then(function(db) {
  return db.collection('messages');
}).then(function(messages) {
  messages.insert([{event: 'tmp'}, {event: 'tmp'}, {event: 'tmp'}, {event: 'tmp'}, {event: 'tmp'}], {w: 0});
  return messages;
});
module.exports = MongoQueue = {
  on: function(query, options, fn) {
    if(!fn) {
      fn = options;
      options = {};
    }
    options = _.defaults(options, {
      frequency: 1000,
      timePeriod: 3600000,
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
          listening = !options.once;
          if(doc) {
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
