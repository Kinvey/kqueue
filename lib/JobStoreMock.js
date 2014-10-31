/**
 * pretend bulk store for KQueue, just stores items in memory
 * Stores implement a simple get/set/delete interface.
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

module.exports = JobStoreMock;

function JobStoreMock( ) {
    if (!this || this === global) return new JobStoreMock();
    this._store = {};
}

JobStoreMock.prototype.get = function get( id, cb ) {
    cb(null, (id in this._store) ? this._store[id] : false);
};

JobStoreMock.prototype.set = function set( id, item, cb ) {
    this._store[id] = item;
    cb(null, true);
};

JobStoreMock.prototype.delete = function _delete( id, cb ) {
    if (id in this._store) {
        delete(this._store[id]);
        cb(null, true);
    }
    else cb(null, false);
};
JobStoreMock.prototype.destroy = JobStoreMock.prototype.delete;
