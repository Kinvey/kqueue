/**
 * beanstalkd client using fivebeans
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

var beans = require('fivebeans');
var events = require('events');
var util = require('util');

module.exports = BeanstalkClientFivebeans;


function BeanstalkClientFivebeans( host, port ) {
    'use strict';
    if (!this || this === global) return new BeanstalkClientFivebeans(options);
    events.EventEmitter.call(this);

    this.host = host;
    this.port = port;
}
util.inherits(BeanstalkClientFivebeans, events.EventEmitter);

BeanstalkClientFivebeans.prototype.start = function start( cb ) {
};

// TODO: change event emitter model read/write interface, for non-emitter bindings

BeanstalkClientFivebeans.prototype.open = function open( host, port ) {
    'use strict';
    if (host && port) {
        this.host = host;
        this.port = port;
    }

    var self = this;
    if (!self.host || !self.port) throw new Error("missing host/port, cannot open");
    self.client = new beans.client(self.host, self.port);

    self.client
        .on('connect', function() {
console.log("AR: connect...");
            self.emit('connect');
        })
        .on('error', function(err) {
            if (typeof err === 'string') err = new Error(err);
            self.emit('error', err);
        })
        .on('close', function(err) {
            if (typeof err === 'string') err = new Error(err);
            self.emit('close', err);
        })
        .connect();
    // TODO: should not expose the internal client, should return self
    return self.client;
};

BeanstalkClientFivebeans.prototype.close = function close( ) {
    this.client.end();
};
