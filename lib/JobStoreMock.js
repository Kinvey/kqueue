/**
 * pretend bulk store for KQueue, just stores items in memory
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

JobStoreMock.prototype.destroy = function destroy( id, cb ) {
    if (id in this._store) {
        delete(this._store[id]);
        cb(null, true);
    }
    else cb(null, false);
};
