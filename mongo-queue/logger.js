
var Q = require('q');
var _ = require('lodash');
var mongo = require('./mongo');
var Logger = module.exports = function(name) {
  this.processes = [];
  this.idPromise = this.getCollection().then(function(logs) {
    return Q.ninvoke(logs, 'insert', {
      name: name
    });
  }).then(function(log) {
    return log._id;
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
      return Q.ninvoke(logs, 'update', {_id: id}, {
        $push: {messages: args}
      });
    }).then(function() {
      _this.processes.splice(_this.processes.indexOf(promise));
    });
    this.processes.push(promise);
  },
  finish: function() {
console.log('finishing', this.processes);
    return Q.all(this.processes);
  }
};
