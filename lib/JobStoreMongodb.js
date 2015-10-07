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

    opts = opts || {};
    if (!opts.collection) throw new Error("db collection required");
    this._db = opts.db;
    this._collection = opts.collection;

    return this;
}

JobStoreMongodb.prototype = {
    get: function get( id, cb ) {
        this._collection.findOne({_id: id}, function(err, ret) {
            return err ? cb(err) : cb(null, ret ? ret.item : null);
        });
    },

    set: function set( id, item, cb ) {
        var item = {_id: id, item: item}
        this._collection.update({_id: id}, item, {w: 1, upsert: true}, function(err, ret) {
            return err ? cb(err) : cb(null, true);
        });
    },

    delete: function _delete( id, cb ) {
        this._collection.remove({_id: id}, {w:1}, function(err, ret) {
            return err ? cb(err) : cb(null, ret ? true : false);
        });
    },

    close: function close( ) {
        return (this._db) ? this._db.close() : null;
    },

    // for testing: read back the keys of the stored payloads
    keys: function keys( cb ) {
        this._collection.distinct('_id', function(err, ret) {
            return err ? cb(err) : cb(null, ret);
        })
    },
}

// aliases
JobStoreMongodb.prototype.destroy = JobStoreMongodb.prototype.delete;
JobStoreMongodb.prototype = JobStoreMongodb.prototype;
