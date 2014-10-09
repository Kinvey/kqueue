/**
 * Delayed callback manager.
 * Useful when call success/failure tests are batched
 */

module.exports = CallbackManager;

function CallbackManager( ) {
    if (!this || this === global) return new CallbackManager(options);
    this.pending = [];
    this.staged = [];
}

/**
 * Add a callback to the pending list.  Pending callbacks wait to be released.
 */
CallbackManager.prototype.addCallback = function addCallback( cb ) {
    this.pending.push(cb);
};

// aliases
CallbackManager.prototype.add = CallbackManager.prototype.addCallback;
CallbackManager.prototype.push = CallbackManager.prototype.addCallback;

/**
 * Separate the pending callbacks from any new ones.
 * Only staged callbacks are released.
 */
CallbackManager.prototype.stage = function stage( ) {
    this.staged = this.staged.concat(this.pending);
    this.pending = [];
};

/**
 * Release the staged callbacks, calling each with the error and return value.
 */
CallbackManager.prototype.release = function release( err, ret, callback ) {
    var toRelease = this.staged;
    this.staged = [];
    while ((cb = toRelease.shift())) {
        cb(err, ret);
    }
    callback();
};
