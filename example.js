
var Queue = require('./mongo-queue');
var mongodb = require('mongodb');
var through2 = require('through2');
var fs = require('fs');
Queue.mongoConnect.then(function() {
  console.log('connected');
  var filename = 'example.tar';
  mongodb.GridStore.unlink(Queue.db, filename, function(err, result) {
    if(err) return console.log('coulnt unline', err);
    console.log('unlink');
    var readGridStore = new mongodb.GridStore(Queue.db, filename, 'r');
    var writeGridStore = new mongodb.GridStore(Queue.db, filename, 'w');
    writeGridStore.open(function(err, writer) {
      if (err) return console.log('couldnt open', err);
      writer.writeFile(__dirname + '/../output.tar', function(err) {
        if(err) return console.log('writeerr', err);
        console.log('DONE!');
      });
      setTimeout(function() {
        readGridStore.open(function(err, reader) {
          if(err) return console.log('err', err);
          reader.stream(true).pipe(fs.createWriteStream(__dirname + '/../output2.tar')).on('end', function() {
            console.log('ended open!');
          });
        });
      }, 1000);
    });
  });
}).done();
