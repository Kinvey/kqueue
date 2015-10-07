/**
 * pretend beanstalkd client acceptable to KQueue
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

module.exports = BeanstalkClientMock;

function BeanstalkClientMock( ) {
    'use strict';
    if (!this || this === global) return new BeanstalkClientMock();

    this.calls = [];
    var self = this;

    function fakeCall( args, cb, err, ret1, ret2 ) {
        self.calls.push(args)
        cb(err, ret1, ret2)
    }

    this.use = function(tube, cb) { fakeCall(arguments, cb) };
    this.put = function(prio, delay, ttr, payload, cb) { fakeCall(arguments, cb, null, -1) };                   // fake insert
    this.watch = function(tube, cb) { fakeCall(arguments, cb) };
    this.ignore = function(tube, cb) { fakeCall(arguments, cb) };
    this.reserve_with_timeout = function(timeout, cb) { fakeCall(arguments, cb, new Error('TIMED_OUT')) };      // none found
    this.release = function(id, prio, delay, cb) { fakeCall(arguments, cb) };
    this.destroy = function(id, cb) { fakeCall(arguments, cb) };
    this.touch = function(id, cb) { fakeCall(arguments, cb, id == -1 ? new Error('NOT_FOUND') : null) };        // NOT_FOUND for status check
    this.list_tubes = function(cb) { fakeCall(arguments, cb, false, []) };
    this.stats_tube = function(tube, cb) { fakeCall(arguments, cb, false, {}) };
    this.stats = function(cb) { fakeCall(arguments, cb, false, {}) };
    this.end = function() { fakeCall(arguments, cb) };

    // aliases
    this.delete = this.destroy;
    this.close = this.end;
}

BeanstalkClientMock.prototype.start = function start( cb ) {
    cb(null, this);
};

BeanstalkClientMock.prototype.open = function open( host, port, cb ) {
    'use strict';
    var self = this;
    // send event after caller had a chance to register event listeners
    if (cb) cb(null, this);
    return this;
};

BeanstalkClientMock.prototype.close = function close( ) {
};
