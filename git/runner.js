var mongodb = require('mongodb');
var _ = require('lodash');
var Q = require('q');
var uuid = require('uuid');
var Queue = require('../mongo-queue');
var Logger = require('../mongo-queue/logger');
var analytics = require('../mongo-queue/analytics');
var request = require('request');
var cp = require('child_process');
var password = 'vH$qBF{pZg(qnh8jpWzp9y[@[[D@(_%/t@j5^zMC6Wcf,vHeN!vdcN!(3m6Pj7jP';
module.exports = Runner = function() {
  this.logger = new Logger('git');
};

Runner.prototype = {
  run: function(data, inputStream) {
    var _this = this;
    this.inputStream = inputStream;
    this.readStream = Queue.getReadStream(function(message) {
      console.log(message);
    });
    this.logger.log('Arguments', data);
    return this.getRepoInfo(data.repoName, data.username).then(function(info) {
      if(info.success) {
        _this.logger.log('BodySuccess', info);
        if(data.command === 'write') {
          return _this.writeRepo(data, info);
        }
      } else {
        _this.logger.log('BodyError', info.error);
        throw new Error(info.error);
      }
    }).catch(function(err) {
      if(data.command === 'write') console.log(err, err.stack);
      _this.logger.log('End Error', err, err.stack);
      return 1;
    }).then(function(code) {
      this.readStream.stop();
      return _this.logger.finish().finally(function() {
        process.exit(code);
      });
    });
  },
  getRepoInfo: function(repoName, username) {
    var _this = this;
    return Q.ninvoke(request, 'post', 'https://doskara-dev.herokuapp.com/repositories/canpush.json', {
      form: {
        repository: {
          name: repoName,
          username: username
        },
        password: password
      }
    }).spread(function(response, body) {
      _this.logger.log('Body', body);
      return JSON.parse(body);
    });
  },
  writeRepo: function(data, info) {
    var _this = this;
    return this.checkIsFastForward(data.beforeCommit, data.afterCommit)
    .then(function() {
      console.log('Got ' + info.type + '... Process: ' + this.logger.id);
      analytics.log(info.type + 's', info.id, false);
      if(info.type === 'atom') {
        return _this.writeCell(data, info);
      } else if(info.type === 'structure') {
        return _this.writeApplication(data, info);
      }
    });
  },
  checkIsFastForward: function(beforeCommit, afterCommit) {
    // Check if non-fast forward
    var isBeginning = beforeCommit === _.times(40, function() { return '0'; }).join('');
    return Q.fcall(function() {
      if(!isBeginning) {
        return Q.nfcall(cp.exec, 'git log --pretty=oneline ' + afterCommit + '..' + beforeCommit)
        .then(function(ls) {
          if(ls[0].length) {
            throw new Error('FastForwardOnly');
          }
        });
      }
    });
  },
  writeCell: function(data, info) {
    var _this = this;
    return this.getCommits(data).then(function(commits) {
      logger.log('PushAttempt', commits);
      return _this.saveCommits(info.id, commits);
    }).then(function() {
      console.log('Success! Now go to http://app.doskara.com/cells/' +
        info.id + ' to publish your app!');
    });
  },
  saveCommits: function(atomId, commits) {
    var url = 'https://doskara-dev.herokuapp.com/repositories/push.json';
    return Q.ninvoke(request, 'post', url, {
      form: {
        repository: {
          id: atomId,
          commits: commits
        },
        password: password
      }
    });
  },
  writeApplication: function(data) {
    var _this = this;
    data.atomName = repoNamesubstring(0, repoName.length - '.git'.length);
    return this.uploadFile().then(function(filename) {
      console.log('Sending to factory...');
      _this.sendToFactory(data);
    }).then(function() {
      console.log('Build successful! Deploying dyno...');
      _this.deployRepo(data);
    }).then(function() {
      logger.log('Success');
      console.log('Success! Now you can view your app at https://' +
        data.atomName + '.gateway.doskara.com!');
    });
  },
  uploadFile: function() {
    var _this = this;
    return Queue.getFileUploadStream(this.logger).spread(function(writeStream, filename) {
      var gzipProcess = cp.spawn('gzip', ['-c'], {
        stdio: ['pipe', 'pipe', process.stderr]
      });
      _this.inputStream.pipe(gzipProcess.stdin);
      gzipProcess.stdout
      .pipe(require('through2')(function(chunk, enc, cb) { writeStream.write(chunk, function() { cb(); }); }));
      gzipProcess.on('error', console.log.bind(console, 'gzipError'));
      return Q.ninvoke(gzipProcess, 'on', 'close').then(function() {
        return Q.ninvoke(writeStream, 'close');
      }).then(function() {
        return filename;
      });
    });
  },
  sendToFactory: function(data, filename) {
    this.logger.log('BuildEmit');
    return Queue.emitWithResponse({
      event: 'build',
      name: data.atomName,
      id: this.readStream.streamId,
      version: '',
      loggerId: this.logger.id,
      filename: filename
    });
  },
  deployRepo: function(data) {
    logger.log('DeployEmit');
    return Queue.emitWithResponse({
      event: 'deploy',
      name: data.atomName,
      loggerId: this.logger.id,
      id: this.readStream.streamId
    });
  },
  getCommits: function(data) {
    var commitDot = isBeginning ? data.afterCommit
      : data.beforeCommit + '..' + data.afterCommit;
    var command = 'git log --pretty=format:"%H|||%an|||%ad|||%s" --reverse ';
    return Q.nfcall(cp.exec, command + commitDot)
    .spread(function(commits) {
      commits = commits.split('\n').map(function(commit) {
        var commitData = commits.split('|||');
        return {
          commit_hash: commitData[0],
          author: commitData[1],
          date: commitData[2],
          message: commitData.slice(3).join(' ')
        };
      });
    });
  }
};



