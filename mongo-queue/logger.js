
var Q = require('q');
var _ = require('lodash');
var mongo = require('./mongo');
var uuid = require('uuid');
var Logger = module.exports = function(name) {
  this.processes = [];
  this.id = uuid.v4();
};

Logger.prototype = {
  getCollection: mongo.getCollection.bind(mongo, 'logs'),
  log: function() {
    var args = [].slice.call(arguments, 0);
    var _this = this;
    var promise = this.getCollection()
    .then(function(logs) {
      return Q.ninvoke(logs, 'insert', {id: _this.id}, {
        message: args,
        date: new Date()
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
