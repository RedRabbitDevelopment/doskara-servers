
var _ = require('lodash');
var Q = require('q');
var mongo = require('./mongo');
module.exports = {
  getCollection: mongo.getCollection.bind(mongo, 'analytics'),
  log: function(type, id, isNew, count) {
    var month = this.getMonth();
    this.getCollection().then(function(analytics) {
      if(count) {
        analytics.update({
          type: type + '-count',
          month: month
        }, {
          $set: {
            count: count
          }
        }, {upsert: true, w: 0});
      }
      analytics.update({
        type: type,
        id: id,
        month: month
      }, {
        $setOnInsert: {
          isNew: isNew
        }
      }, {upsert: true, w: 0});
    }).done();
  },
  // Number of months since january 2000
  getMonth: function() {
    var month = new Date();
    month = (month.getFullYear() - 2000) * 12 + month.getMonth();
    return month;
  },
  aggregate: function(type, startMonth, endMonth) {
    var endMonth = endMonth || this.getMonth();
    var startMonth = startMonth || endMonth - 12;
    return this.getCollection().then(function(analytics) {
      return Q.ninvoke(analytics, 'aggregate', [{
        $match: {
          $and: [
            {month: {$gte: startMonth}},
            {month: {$lte: endMonth}},
          ],
          type: 'atom'
        }
      }, {
        $group: {
          _id: '$month',
          numActive: {$sum: 1},
          numNew: {$sum: {$cond: ['$isNew', 1, 0]}}
        }
      }]).then(function(result) {
        return _.indexBy(result, '_id');
      });
    });
  }
};
