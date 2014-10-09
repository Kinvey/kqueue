/**
 * Generate unique ids in the style of mongodb.
 * Ids are a hex number built out of the timestamp, a per-server unique id,
 * the process id and a sequence number.
 *
 * Copyright (C) 2014 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 12 byte mongodb ObjectID:
 * [timestamp:4B][machineid:3B][pid:2B][sequence:3B]
 *  tt tt tt tt  mm mm mm  pp pp  ss ss ss
 * ( timestamp )( nodeid )( pid )(sequence)
 */


var globalSingleton = null;

// export usable both as a function mongoid = require() and as a constructor new (MongoId = require())
module.exports = MongoId;
module.exports.mongoid = MongoId;
module.exports.MongoId = MongoId;

function MongoId( machineId ) {
    'use strict';

    // if called as a function, return an id from the singleton
    if (this === global || !this) {
        if (!globalSingleton) globalSingleton = new MongoId();
        return globalSingleton.fetch();
    }

    // if no machine id specified, use a 3-byte random number
    if (!machineId) machineId = Math.floor(Math.random() * 0x1000000);
    else if (machineId < 0 || machineId > 0x1000000)
        throw new Error("machine id out of range 0.." + parseInt(0x1000000));

    this.machineIdStr = hexFormat(machineId, 6);
    this.pidStr = hexFormat(process.pid, 4);
    this.lastTimestamp = null;
    this.sequenceId = 0;
    this.id = null;
}

MongoId.prototype.fetch = function() {
    var id;
    var timestamp = Math.floor(Date.now()/1000);

    // soft-init on first call and on every new second
    if (timestamp !== this.lastTimestamp) {
        this.lastTimestamp = timestamp;
        this.timestampStr = hexFormat(timestamp, 8);
        if (!this.sequenceId) this.sequenceStartTimestamp = timestamp;
    }

    // sequence wrapping and overflow check
    if (this.sequenceId >= 0x1000000) {
        if (timestamp === this.sequenceStartTimestamp) {
            throw new Error("mongoid sequence overflow: more than 16 million ids generated in 1 second");
        }
        this.sequenceId = 0;
        this.sequenceStartTimestamp = timestamp;
    }

    id = this.timestampStr + this.machineIdStr + this.pidStr + hexFormat(++this.sequenceId, 6);
    return id;
};

function hexFormat(n, width) {
    'use strict';
    var s = n.toString(16);
    while (s.length + 2 < width) s = "00" + s;
    while (s.length < width) s = "0" + s;
    return s;
}
MongoId.prototype.hexFormat = hexFormat;

// each MongoId object always evaluates to a per-object id string
MongoId.prototype.toString = function( ) {
    return this.id ? this.id : this.id = this.fetch();
};

MongoId.parse = MongoId.prototype.parse = function( idstring ) {
    'use strict';
    if (typeof idstring !== 'string') idstring = "" + idstring;
    return {
        timestamp: parseInt(idstring.slice( 0,  0+8), 16),
        machineid: parseInt(idstring.slice( 8,  8+6), 16),
        pid:       parseInt(idstring.slice(14, 14+4), 16),
        sequence:  parseInt(idstring.slice(18, 18+6), 16)
    };
};

// return the javascript timestamp (milliseconds) embedded in the id.
// Note that the ids embed unix timestamps (seconds precision).
MongoId.prototype.getTimestamp = function( idstring ) {
    return parseInt(idstring.slice(0, 8), 16) * 1000;
};
