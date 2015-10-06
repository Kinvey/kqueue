'use strict'

var mongodb = require('mongodb')
var JobStoreMongodb = require('../lib/JobStoreMongodb.js')

var mongoUrl = "mongodb://localhost/kqueue"

module.exports = {
    setUp: function(done) {
        var self = this
        mongodb.connect(mongoUrl, function(err, db) {
            self.db = db;
            self.coll = db.db("testKqueue").collection("unittest")
            self.cut = new JobStoreMongodb({ collection: self.coll })
            done();
        })
    },

    tearDown: function(done) {
        this.coll.remove({}, done)
    },

    'should throw error if no collection named': function(t) {
        t.throws(function() {
            var store = new JobStoreMongodb()
        });
        t.done()
    },

    'should set value': function(t) {
        this.cut.set(1, 'a', function(err, ok) {
            t.ifError()
            t.done()
        })
    },

    'should overwrite value': function(t) {
        var cut = this.cut
        cut.set(1, 'a', function(err, ok) {
            t.ifError()
            cut.set(1, 'aa', function(err, ok) {
                t.ifError(err)
                cut.get(1, function(err, ret) {
                    t.ifError(err)
                    t.equal(ret, 'aa')
                    t.done()
                })
            })
        })
    },

    'should set and get values by key': function(t) {
        var keys = [], values = []
        for (var i=0; i<100; i++) {
            keys[i] = (Math.random() * 0x1000000 >>> 0).toString(16)
            values[i] = Math.random() * 0x1000000 >>> 0
            if (Math.random() < .5) values[i] = 'x' + values[i]
        }
        var cut = this.cut
        setValuesByKey(cut, keys, values, function(err) {
            t.ifError(err)
            var gotValues = []
            getValuesByKey(cut, keys, gotValues, function(err) {
                t.ifError()
                for (var i=0; i<keys.length; i++) {
                    t.equal(gotValues[i], values[i])
                    t.equal(typeof gotValues[i], typeof values[i])
                }
                t.done()
            })
        })
    },

    'should delete value by key': function(t) {
        var cut = this.cut
        cut.set(1, 'a', function(err, ok) {
            t.ifError(err)
            cut.delete(1, function(err, ok) {
                t.ifError(err)
                cut.get(1, function(err, ret) {
                    t.ifError(err)
                    t.equal(ret, null)
                    t.done()
                })
            })
        })
    },
}

function getValuesByKey( store, keys, values, cb ) {
    var i = 0
    function getLoop() {
        if (i >= keys.length) return cb(null, values)
        store.get(keys[i], function(err, ret) {
            if (err) return cb(err)
            values[i] = ret
            i += 1
            getLoop()
        })
    }
    getLoop()
}

function setValuesByKey( store, keys, values, cb ) {
    var i = 0
    function setLoop() {
        if (i >= keys.length) return cb(null, values)
        store.set(keys[i], values[i], function(err, ret) {
            if (err) return cb(err)
            i += 1
            setLoop()
        })
    }
    setLoop()
}
