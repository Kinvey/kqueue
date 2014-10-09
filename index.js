/**
 * kqueue -- job queue and job runner
 *
 * Copyright (c) 2014, Kinvey, Inc. All rights reserved.
 */

var BeanstalkClient = require('./lib/BeanstalkClientFivebeans');
var JobStore = require('./lib/JobStoreMock');
var KQueue = require('./lib/kqueue');

module.exports = function buildQueue( config ) {
    'use strict';

    config = config || {};
    var host = config.host || '0.0.0.0';
    var port = config.port || 11300;

    var client = (new BeanstalkClient(host, port)).open(host, port);
    var queue = new KQueue({
        beanstalkClient: client,
        jobStore: new JobStore(),
        // retryDelaySec: 30,
        // log: 
    });
    return queue;
};
