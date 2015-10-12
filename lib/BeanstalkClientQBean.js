/**
 * beanstalkd client using QBean.
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

var net = require('net');

var QBean = require('qbean');
var events = require('events');
var util = require('util');

module.exports = BeanstalkClientQBean;


function BeanstalkClientQBean( host, port ) {
    'use strict';
    if (!this || this === global) return new BeanstalkClientQBean(options);
    events.EventEmitter.call(this);

    this.host = host;
    this.port = port;
    this._connected = false;
    this._onConnect = null;
    this.bean = null;
}
util.inherits(BeanstalkClientQBean, events.EventEmitter);

// wait for the beanstalk connection to become usable
BeanstalkClientQBean.prototype.start = function( callback ) {
    if (this._connected) return callback(null, this.bean);
    else this._onConnect = callback;
};

// create a beanstalk connection
BeanstalkClientQBean.prototype.open = function open( host, port, callback ) {
    'use strict';
    if (host && port) {
        this.host = host;
        this.port = port;
    }
    if (!this.host || !this.port) throw new Error("missing host/port, cannot open");

    var self = this;
    this.stream = net.createConnection(this.port, this.host);
    this.bean = new QBean({}, this.stream);
    this.stream.once('connect', function() {
        self._connected = true;
        if (self._onConnect) self._onConnect(null, self.bean);
        if (callback) callback(null, self.bean);
    });

    return this.bean;
};

BeanstalkClientQBean.prototype.close = function close( ) {
    this.bean.close();
    try { this.stream.close() } catch (err) { }
    this._connected = false;
};
