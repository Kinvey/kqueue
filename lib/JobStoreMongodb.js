/**
 * mongodb bulk store for KQueue
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
 */

module.exports = JobStoreMongodb;

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

function JobStoreMongodb( opts ) {
    if (!this || this === global) return new JobStoreMongodb();
    if (!opts || !opts.db) throw new Error("db required");
    this._db = opts.db;
    return this;
}

JobStoreMongodb.prototype = {
    get: function get( id, cb ) {
        cb(null, (id in this._store) ? this._store[id] : false);
    },

    set: function set( id, item, cb ) {
        this._store[id] = item;
        cb(null, true);
    },

    delete: function _delete( id, cb ) {
        if (id in this._store) {
            delete(this._store[id]);
            cb(null, true);
        }
        else cb(null, false);
    },
}

// aliases
JobStoreMongodb.prototype.destroy = JobStoreMongodb.prototype.delete;
JobStoreMongodb.prototype = JobStoreMongodb.prototype;
