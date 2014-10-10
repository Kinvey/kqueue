/**
 * beanstalkd client using QBean.  Work in progress.
 */

var net = require('net');

var QBean = require('./qbean.js');
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
