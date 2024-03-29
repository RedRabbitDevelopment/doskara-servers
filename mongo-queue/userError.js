// Generated by CoffeeScript 1.7.1

/*
 * The purpose of UserError is to be able to throw an error in a promise and catch it
 * later on by checking error instanceof UserError. That way we can filter the errors
 * we receive and prevent users from viewing errors they aren't supposed to see, but allow
 * through UserErrors.
 */

(function() {
  var UserError;

  UserError = (function() {
    function UserError() {
      var err;
      err = Error.apply(this, arguments);
      this.stack = err.stack;
      this.message = err.message;
      this.isUserError = true;
      this;
    }

    return UserError;

  })();

  UserError.prototype = Object.create(Error.prototype, {
    constructor: {
      value: UserError
    }
  });

  module.exports = UserError;

}).call(this);
