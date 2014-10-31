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
    if (!this || this === global) return new BeanstalkClientFivebeans(options);
    events.EventEmitter.call(this);

    this.host = host;
    this.port = port;
}
util.inherits(BeanstalkClientQBean, events.EventEmitter);

BeanstalkClientQBean.prototype.open = function open( host, port ) {
    'use strict';
    if (host && port) {
        this.host = host;
        this.port = port;
    }

    var self = this;
    if (!self.host || !self.port) throw new Error("missing host/port, cannot open");
    var stream = net.createConnection(self.port, self.host);
    self.client = new QBean({}, stream);
    stream.on('connect', function(err) {
        if (err) self.emit('error', err);
        else self.emit('connect');
    });

    return self.client;
};

BeanstalkClientQBean.prototype.close = function close( ) {
    this.client.close();
};
