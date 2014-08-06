
var Q = require('q');
var Queue = require('../mongo-queue');
var request = require('request');

var password = 'vH$qBF{pZg(qnh8jpWzp9y[@[[D@(_%/t@j5^zMC6Wcf,vHeN!vdcN!(3m6Pj7jP';

var command = process.argv[0];
var repoName = process.argv[1];
var username = process.argv[2];
var beforeCommit = process.argv[3];
var afterCommit = process.argv[3];

Q.ninvoke(request, 'post', 'https://doskara.herokuapp.com/repositories.canpush.json', {
  form: {
    repository: {
      name: repoName,
      username: username
    }
  }
}).spread(function(response, body) {
  var body = JSON.parse(body);
  if(body.success) {
    if(command === 'write') {
      // Check if non-fast forward
      var isBeginning = commit === _.times(40, function() { return '0'; }).join('');
      return Q.fcall(function() {
        if(!isBeginning) {
          return Q.nfcall(exec, 'git log --pretty=oneline ' + afterCommit + '..' + beforeCommit)
          .then(function(ls) {
            if(ls.length) {
              throw new Error('FastForwardOnly');
            }
          });
        }
      }).then(function() {
        if(body.type === 'cell') {
          var command = isBeginning ? afterCommit : beforeCommit + '..' + afterCommit;
          return Q.nfcall(exec, 'git log --pretty=format:"%H|||%an|||%ad|||%s" --reverse ' + command)
          .then(function(commits) {
            commits = commits.split('\n').map(function(commit) {
              var commitData = commits.split('|||');
              return {
                commit_hash: commitData[0],
                author: commitData[1],
                date: commitData[2],
                message: commitData.slice(3).join(' ')
              };
            });
            return Q.ninvoke(request, 'post', 'https://doskara.herokuapp.com/repositories/push.json', {
              form: {
                repository: {
                  id: body.id,
                  commits: commits
                },
                password: password
              }
            });
          }).then(function() {
            console.log('Success! Now go to http://app.doskara.com/cells/' +
              body.id + ' to publish your app!');
          });
        } else if(body.type === 'application') {
          var atomName = repoName.substring(0, repoName.length - '.git'.length);
          var filename = uuid.v4() + '.tar'
          return Queue.mongoConnect.then(function() {
            var gs = new mongodb.GridStore(Queue.db, filename, 'w');
            return Q.ninvoke(gs, 'open');
          .then(function(gs) {
            process.stdin.pipe(gs);
            return Q.ninvoke(process.stdin, 'on', 'end')
            .then(function() {
              gs.close();
              var id = uuid.v4();
              Queue.emit({
                event: 'build',
                name: repoName,
                id: id,
                version: '',
                filename: filename
              });
              Queue.on({
                event: 'build-complete',
                id: id
              }, function() {
                Queue.emit({
                  event: 'start',
                  name: 'repoName',
                  id: id
                });
              });
            });
          });
        }
      });
    }
  }
});
