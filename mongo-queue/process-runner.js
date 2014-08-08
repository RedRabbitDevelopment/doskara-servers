
var Q = require('q');
var _ = require('lodash');
var getCollection = require('./mongo').getCollection;
var Runner = module.exports = function(fn) {
  this.fn = fn;
}

Runner.prototype = {
  getCollection: getCollection.bind(null, 'messages'),
  process: function(doc) {
    return Q.fcall(function() {
      return _this.fn(doc);
    });
  },
  run: function(doc) {
    return this.process(doc).then(
      this.deleteDoc.bind(this, doc),  
      this.logError.bind(this, doc));
  },
  deleteDoc: function(doc) {
    return this.getCollection(function(messages) {
      return Q.ninvoke(messages, 'remove', {_id: doc._id});
    });
  },
  logError: function(doc, error) {
    return this.getCollection().then(function(messages) {
      return Q.ninvoke(messages, 'update', {
        _id: doc._id
      }, {
        $push: {
          errors: {
            message: error.message,
            stack: error.stack
          }
        },
        $inc: {numErrors: 1}
      });
    });
  }
};

Runner.ResponseRunner = function ResponseRunner(doc) {
  Runner.call(this, doc);
}

ResponseRunner.prototype = _.create(Runner.prototype, {
  run: function(doc) {
    var _this = this;
    return this.process(doc).then(function(result) {
      return {
        success: true,
        result: result
      };
    }, function(error) {
      if(error instanceof UserError) {
        return {
          success: true,
          result: result
        };
      } else {
        throw error;
      }
    }).then(function(response) {
      return _this.respond(doc, response);
    }).then(function() {
      return _this.deleteDoc(doc);
    }).catch(function(error) {
      console.log('ERROR', error, error.stack, doc);
      return _this.logError(doc, error).then(function() {
        if(doc.numErrors >= 4) {
          return _this.respond(doc, {
            success: false,
            error: 'Unknown'
          });
        }
      });
    });
  },
  respond: function(doc, response) {
    var _this = this;
    return this.getCollection('messages').then(function(messages) {
      return Q.ninvoke(messages, 'insert', {
        event: doc.event + '-complete',
        id: doc.id,
        response: response
      });
    });
  }
});
