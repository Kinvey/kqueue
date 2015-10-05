'use strict'

var buildQueue = require('../index')
var KQueue = require('../lib/kqueue')

module.exports = {
    'package should parse': function(t) {
        require('../package.json')
        t.done()
    },

    'buildQueue should return a KQueue': function(t) {
        buildQueue({}, function(err, q) {
            t.ok(q instanceof KQueue)
            t.done()
        })
    },
}
