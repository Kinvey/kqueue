/**
 * kqueue -- job queue and job runner
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

var BeanstalkClient = require('./lib/BeanstalkClientQBean');
var JobStore = require('./lib/JobStoreMock');
var KQueue = require('./lib/kqueue');

module.exports = function buildQueue( config ) {
    'use strict';

    config = config || {};
    var host = config.host || '0.0.0.0';
    var port = config.port || 11300;

    var client = (new BeanstalkClient(host, port)).open();
    var queue = new KQueue({
        beanstalkClient: client,
        jobStore: new JobStore(),
        retryDelaySec: config.retryDelaySec || 30,
        log: config.log || undefined
    });
    return queue;
};
