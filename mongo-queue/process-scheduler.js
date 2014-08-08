
var Q = require('q');
var _ = require('lodash');
var getCollection = require('./mongo').getCollection;
var Runner = require('./process-runner');

var Scheduler = module.exports = function(query, options, fn) {
  if(_.isString(query)) query = {event: query};
  options = _.defaults(options, {
    frequency: 1000,
    timePeriod: 3600000,
    once: false,
    next: false,
    maxProcessing: 5
  });
  this.query = query;
  this.options = options;
  this.fn = fn;
  this.processing = [];
};

Scheduler.prototype = {
  start: function() {
    
  }
};
