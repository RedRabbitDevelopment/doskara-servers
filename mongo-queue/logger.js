
var Q = require('q');
var _ = require('lodash');
var mongo = require('./mongo');
var Logger = module.exports = function(name) {
  this.processes = [];
  this.idPromise = this.getCollection().then(function(logs) {
    console.log('got logs');
    return Q.ninvoke(logs, 'insert', {
      name: name
    });
  }).then(function(log) {
    console.log('inserted', log[0]._id);
    return log[0]._id;
  });
};

Logger.prototype = {
  getCollection: mongo.getCollection.bind(mongo, 'logs'),
  log: function() {
    var args = [].slice.call(arguments, 0);
    var _this = this;
    var promise = Q.all([
      this.getCollection(),
      this.idPromise
    ]).spread(function(logs, id) {
      console.log('here', id);
      return Q.ninvoke(logs, 'update', {_id: id}, {
        $push: {messages: args}
      });
    }).then(function() {
      _this.processes.splice(_this.processes.indexOf(promise));
    });
    this.processes.push(promise);
  },
  finish: function() {
    return Q.all(this.processes);
  }
};
