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

'use strict';

var BeanstalkClient = require('./lib/BeanstalkClientQBean');
var JobStoreMemory = require('./lib/JobStoreMock');
var JobStoreMongodb = require('./lib/JobStoreMock');
var KQueue = require('./lib/kqueue');

var mongo = require('mongodb');         // TODO: use mongolian

// TODO: should export methods createServer(), class KQueue, and read config/default.conf

module.exports.createServer = function createServer( config, cb ) {
    if (!cb && typeof config === 'function') { cb = config; config = {} }
    var config = require('qconfig');

    // ...
};

module.exports = function buildQueue( config, callback ) {
    if (!callback) throw new Error("callback required");
    config = config || {};
    var host = config.host || '127.0.0.1';
    var port = config.port || 11300;

    if (config.mongodbUrl) {
        mongo.connect(config.mongodbUrl, {db: {safe: true, w: 1}, server: {poolSize: 1}}, function(err, db) {
            if (err) throw err;
            config.bulkStore = new JobStoreMongodb({db: db})
            return createQueue(config, ballback);
        });
    }
    else {
        return createQueue(config, callback);
    }

    function createQueue( config, cb ) {
        var bean = new BeanstalkClient(host, port);
        var client = bean.open();
        var queue = new KQueue({
            beanstalkClient: client,
            retryDelaySec: config.retryDelaySec || 30,
            jobStore: config.bulkStore || new JobStoreMemory(),
            log: config.log || undefined
        });
        bean.start(function() {
            return cb(null, queue);
        });
    }
};

module.exports.KQueue = KQueue;
