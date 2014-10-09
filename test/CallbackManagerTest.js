var CallbackManager = require ('../lib/CallbackManager');

function uniqid() {
    return Math.floor(Math.random() * 0x1000000).toString(16);
}

module.exports = {
    setUp: function(next) {
        // c.u.t. == 'class under test'
        this.cut = new CallbackManager();
        this.tag = uniqid();
        next();
    },

    testAddShouldAppendToPending: function(t) {
        this.cut.addCallback(this.tag);
        t.ok(this.cut.pending.indexOf(this.tag) >= 0, "should have pushed");
        t.done();
    },

    testStageShouldTransferFromPending: function(t) {
        this.cut.addCallback(this.tag);
        this.cut.stage();
        t.ok(this.cut.pending.indexOf(this.tag) < 0, "should have cleared pending");
        t.ok(this.cut.staged.indexOf(this.tag) >= 0, "should have staged");
        t.done();
    },

    testReleaseShouldCallStagedCallbacksWithPassedValues: function(t) {
        var called = {};
        this.cut.addCallback(function(err, ret){ called.a = [err, ret]; });
        this.cut.addCallback(function(err, ret){ called.b = [err, ret]; });
        this.cut.stage();
        this.cut.addCallback(function(err, ret){ called.c = [err, ret]; });
        var err = uniqid();
        var ret = uniqid();
        this.cut.release(err, ret, function() {
            t.ok(called.a, "should have called first staged callback");
            t.ok(called.b, "should have called second staged callback");
            t.ok(!called.c, "should not call unstaged callback");
            t.equals(called.a[0], err, ".a expected passed err");
            t.equals(called.a[1], ret, ".a expected passed result");
            t.equals(called.b[0], err, ".b expected passed err");
            t.equals(called.b[1], ret, ".b expected passed result");
            t.done();
        });
    }
}
