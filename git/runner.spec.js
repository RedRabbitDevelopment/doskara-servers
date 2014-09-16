var _ = require('lodash');
var Q = require('q');
var sinon = require('sinon');
var request = require('request');
var Runner = require('./runner');
var expectError = require('../test_files/expectError');
var cp = require('child_process');
var Queue = require('../mongo-queue');
var fs = require('fs');
function waitFor(obj, methodName, args) {
  var deferred = Q.defer();
  args = [].slice.call(arguments, 2, arguments.length);
  args.push(deferred.resolve);
  obj[methodName].apply(obj, args);
  return deferred.promise;
}
require('should');

describe('Git Runner', function() {
  var runner;
  var noop = function() {};
  beforeEach(function() {
    runner = new Runner();
    runner.logger = {
      log: noop
    };
  });
  afterEach(function() {
    if(cp.exec.restore)
      cp.exec.restore();
    if(request.post.restore)
      request.post.restore();
    if(cp.spawn.restore)
      cp.spawn.restore();
    if(Queue.restore)
      Queue.restore();
  });
  describe('getRepoInfo', function() {
    it('should get the information', function() {
      var mockResult = JSON.stringify({success: true, id: 5});
      var stub = sinon.stub(request, 'post').yields(null, {}, mockResult);
      return runner.getRepoInfo().then(function(body) {
        body.should.have.property('success', true);
        body.should.have.property('id', 5);
      });
    });
  });
  describe('checkIsFastForward', function() {
    it('should work just fine', function() {
      var stub = sinon.stub(cp, 'exec').yields(null, '', 'a');
      return runner.checkIsFastForward(5, 6);
    });
    it('should throw an error', function() {
      var stub = sinon.stub(cp, 'exec').yields(null, 'aba', 'a');
      return expectError('FastForwardOnly', runner.checkIsFastForward(5, 6));
    });
  });
  describe('saving commits', function() {
    it('should send the commits to the host', function() {
      var stub = sinon.stub(request, 'post').yields(null, 'aba');
      return runner.saveCommits().then(function(body) {
        body.should.eql('aba');
      });
    });
  });
  describe.only('sendToFactory', function() {
    var writeFileLocation = __dirname + '/../test_files/test_output.tar.gz';
    function removeTestOutput() {
      return Q.ninvoke(fs, 'unlink', writeFileLocation)
      .catch(function() {});
    }
    beforeEach(removeTestOutput);
    afterEach(removeTestOutput);
    it('should emit something', function() {
      var stub = sinon.stub(Queue, 'getFileUploadStream');
      var testWriteFile = fs.createWriteStream(writeFileLocation);
      var testReadFile = fs.createReadStream(__dirname + '/../test_files/test_input.tar');
      stub.returns(Q.when([testWriteFile, 'testOutput']));
      runner.inputStream = testReadFile;
      return Q.all([
        waitFor(testReadFile, 'on', 'open'),
        waitFor(testWriteFile, 'on', 'open')
      ]).then(function() {
        return runner.uploadFile().then(function() {
          return waitFor(fs, 'exists', writeFileLocation).then(function(result) {
            result.should.eql(true);
          });
        });
      });
    });
  });
});
