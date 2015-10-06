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
    this._connected = false;
    this.bean = null;
}
util.inherits(BeanstalkClientFivebeans, events.EventEmitter);

BeanstalkClientFivebeans.prototype.start = function start( cb ) {
    if (this._connected) return callback(null, this.bean);
    else this.bean.once('connect', callback);
};

// TODO: change event emitter model read/write interface, for non-emitter bindings

BeanstalkClientFivebeans.prototype.open = function open( host, port, callback ) {
    'use strict';
    if (host && port) {
        this.host = host;
        this.port = port;
    }

    var self = this;
    if (!self.host || !self.port) throw new Error("missing host/port, cannot open");
    self.bean = new beans.client(self.host, self.port);

    self.bean
        .on('connect', function() {
            self.emit('connect');
            this._connected = true;
            if (callback) callback(null, self.bean);
        })
        .on('error', function(err) {
            if (typeof err === 'string') err = new Error(err);
            self.emit('error', err);
        })
        .on('close', function(err) {
            if (typeof err === 'string') err = new Error(err);
            self.emit('close', err);
            self._connected = false;
        })
        .connect();
    return self.bean;
};

BeanstalkClientFivebeans.prototype.close = function close( ) {
    this.client.end();
    this._connected = false;
};
