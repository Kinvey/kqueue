/**
 * pretend beanstalkd client acceptable to KQueue
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

BeanstalkClientFivebeans.prototype.start = function open( cb ) {
    setImmediate(function() { self.emit('connect'); });
    cb();
};

BeanstalkClientMock.prototype.open = function open( ) {
    'use strict';
    var self = this;
    // send event after caller had a chance to register event listeners
    setImmediate(function() { self.emit('connect'); });
    return this;
};

BeanstalkClientMock.prototype.close = function close( ) {
    setImmediate(function() { self.emit('close'); });
};
