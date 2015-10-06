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

var events = require('events');
var util = require('util');

module.exports = BeanstalkClientMock;

function BeanstalkClientMock( ) {
    'use strict';
    if (!this || this === global) return new BeanstalkClientMock();

    events.EventEmitter.call(this);

    this.use = function(tube, cb) { cb(); };
    this.put = function(prio, delay, ttr, payload, cb) { cb(); };               // discard
    this.watch = function(tube, cb) { cb(); };
    this.ignore = function(tube, cb) { cb(); };
    this.reserve_with_timeout = function(timeout, cb) { cb('TIMED_OUT'); };     // none found
    this.release = function(id, prio, delay, cb) { cb(); };
    this.destroy = function(id, cb) { cb(); };
    this.touch = function(id, cb) { cb(); };
    this.list_tubes = function(cb) { cb(false, []); };
    this.stats_tube = function(tube, cb) { cb(false, {}); };
    this.stats = function(cb) { cb(false, {}); };
    this.end = function() { };
}
util.inherits(BeanstalkClientMock, events.EventEmitter);

BeanstalkClientFivebeans.prototype.start = function start( cb ) {
    cb(null, this);
};

BeanstalkClientMock.prototype.open = function open( host, port, cb ) {
    'use strict';
    var self = this;
    // send event after caller had a chance to register event listeners
    setImmediate(function() { self.emit('connect'); });
    if (cb) cb(null, this);
    return this;
};

BeanstalkClientMock.prototype.close = function close( ) {
    setImmediate(function() { self.emit('close'); });
};
