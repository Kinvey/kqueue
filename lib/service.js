/**
 * queueing service builder
 *
 * Copyright (c) 2015, Kinvey, Inc. All rights reserved.
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
 *
 * 2015-10-05 - AR.
 */

'use strict'

var mongo = require('mongodb');         // TODO: use mongolian
var kqueue = require('./kqueue.js')
var config = require('qconfig')
var KQueue = require('./kqueue.js');
var BeanstalkClientQBean = require('./BeanstalkClientQBean.js');
var JobStoreMemory = require('./JobStoreMock.js');
var JobStoreMongodb = require('./JobStoreMongodb.js');

module.exports.createServer = function createServer( config, cb ) {
    if (!cb && typeof config === 'function') { cb = config; config = {} }
    var config = require('qconfig');

    // ...
};

module.exports.buildQueue = function buildQueue( config, callback ) {
    if (!callback) throw new Error("callback required");
    config = config || {};
    var host = config.host || '127.0.0.1';
    var port = config.port || 11300;

    // TODO: should behave like net servers, kqueue.createQueue() and kqueue.listen()

    createStore(config, function(err, store) {
        if (err) return callback(err);
        config.bulkStore = store;
        createQueue(config, function(err, queue) {
            if (err) return callback(err);
            callback(null, queue);
        });
    });
    return;

    function createStore( config, cb ) {
        if (config.bulkStore) {
            return cb(null, config.bulkStore);
        }
        else if (config.mongodbUrl) {
            var mongoConfig = {db: {safe: true, w: 1}, server: {poolSize: 1}};
            mongo.connect(config.mongodbUrl, mongoConfig, function(err, db) {
                var collection = db.db(config.dbname || 'kqueue').collection(config.collection || 'store');
                return cb(err, new JobStoreMongodb({db: db, collection: collection}));
            });
            // store.close will shut down the mongo connection
        }
        else {
            return cb(null, new JobStoreMemory());
        }
    }

    function createQueue( config, cb ) {
        var BeanstalkClient = config.BeanstalkClient || BeanstalkClientQBean;
        var beanWrapper = new BeanstalkClient();
        beanWrapper.open(host, port, function(err, bean) {
            if (err) return cb(err);
            var queue = new KQueue({
                systemId: config.systemId,
                beanWrapper: beanWrapper,
                beanstalkClient: bean,
                beanstalkFlushInterval: config.beanstalkFlushInterval || 0,     // match to /etc/default/beanstalkd, 0 for none
                retryDelaySec: config.retryDelaySec || 30,
                bulkStore: config.bulkStore || new JobStoreMemory(),
                // TODO: should be called bulkStore
                log: config.log || undefined,
            });
            return cb(null, queue);
            // bean.close will shut down the socket
            // queue.close will call bean.close and store.close
        });
    }
};
