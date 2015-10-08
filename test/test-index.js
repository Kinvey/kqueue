'use strict'

var kqueue = require('../index')

module.exports = {
    'package should parse': function(t) {
        require('../package.json')
        t.done()
    },

    'should export KQueue': function(t) {
        t.equal(kqueue.KQueue, require('../lib/kqueue.js'))
        t.done()
    },

    'should export buildQueue': function(t) {
        t.equal(typeof kqueue.buildQueue, 'function')
        t.done()
    },

    'buildQueue should return a KQueue': function(t) {
        kqueue.buildQueue({}, function(err, q) {
            t.ok(q instanceof kqueue.KQueue)
            t.done()
        })
    },
}

// TODO: figure out why unit tests have a .15 sec overhead
