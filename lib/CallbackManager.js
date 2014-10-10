/**
 * Delayed callback manager.
 * Useful when call success/failure tests are batched
 *
 * Copyright (c) 2014, Kinvey, Inc. All rights reserved.
 *
 * This software is licensed to you under the Kinvey terms of service located at
 * http://www.kinvey.com/terms-of-use. By downloading, accessing and/or using this
 * software, you hereby accept such terms of service  (and any agreement referenced
 * therein) and agree that you have read, understand and agree to be bound by such
 * terms of service and are of legal age to agree to such terms with Kinvey.
 *
 * This software contains valuable confidential and proprietary information of
 * KINVEY, INC and is subject to applicable licensing agreements.
 * Unauthorized reproduction, transmission or distribution of this file and its
 * contents is a violation of applicable laws.
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
