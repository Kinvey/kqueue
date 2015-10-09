'use strict'

var fs = require('fs')
var kqueue = require('../')

module.exports = {
    setUp: function(done) {
        this.outputFile = "unittest.out"
        this.journalFile = "unitjournal.log"
        var self = this
        var config = {
            server: { systemId: 1, port: 14151 },
            store: { mongodbUrl: "mongodb://localhost:27017/kqueue", dbname: "kqueue", collection: "unittest" },
            bean: { host: 'localhost', port: 11300, flushInterval: 2 },
            logs: { logDir: ".", journal: this.journalFile },
        }
        this.queue = kqueue.buildQueue(config, function(err, queue) {
            if (err) return done(err)
            self.queue = queue
            queue.addHandler('unittest', function(job, cb) {
                // the unittest queue job writes its argument to a file
                fs.writeFile(self.outputFile, JSON.stringify(job.data), cb)
            })
            queue.addHandler('speedtest', function(job, cb) {
                cb()
            })

            queue.purgeJobs('unittest', function(err) {
                if (err) return done(err)
                queue.purgeJobs('speedtest', function(err) {
                    if (err) return done(err)
                    fs.unlink(self.journalFile, function() {
                        done()
                    })
                })
            })
        })
    },

    tearDown: function(done) {
        fs.unlink(this.outputFile, function(err) {
            done()
        })
    },

    'should purge jobs': function(t) {
        var self = this
        var payload = (Math.random() * 0x100000000 >>> 0).toString(16)
        this.queue.addJob('unittest', 1, function(err, jobid1) {
            t.ifError(err)
            t.ok(jobid1 > 0)
            self.queue.addJob('unittest', 2, function(err, jobid2) {
                t.ifError(err)
                t.ok(jobid2 > jobid1)
                self.queue.purgeJobs('unittest', function(err, deletedCount) {
                    t.equal(deletedCount, 2)
                    self.queue.addJob('unittest', payload, function(err, jobid) {
                        t.ifError()
                        self.queue.runJobs({ countLimit: 1 }, function(err, runCount) {
                            t.ifError()
                            t.equal(runCount, 1)
                            fs.readFile(self.outputFile, 'utf8', function(err, contents) {
                                t.ifError(err)
                                t.equal(JSON.parse(contents), payload)
                                t.done()
                            })
                        })
                    })
                })
            })
        })
    },

    'should run queue job with small payload': function(t) {
        var self = this
        var payload = { uniq: (Math.random() * 0x100000000 >>> 0).toString(16) }
        this.queue.addJob('unittest', payload, function(err, jobid) {
            t.ifError(err)
            self.queue.runJobs({ timeLimitMs: 5 }, function(err, runCount) {
                t.ifError(err)
                fs.readFile(self.outputFile, 'utf8', function(err, contents) {
                    t.ifError(err)
                    t.equal(contents, '{"uniq":"' + payload.uniq + '"}')
                    t.done()
                })
            })
        })
    },

    'should run queue job with large payload': function(t) {
        var self = this
        var payload = { payload: new Array(100001).join('x') }
        this.queue.addJob('unittest', payload, function(err, jobid) {
            t.ifError(err)
            self.queue.runJobs({ timeLimitMs: 5 }, function(err, runCount) {
                t.ifError(err)
                fs.readFile(self.outputFile, 'utf8', function(err, contents) {
                    t.ifError(err)
                    t.ok(contents.match(/{"payload":"x{100000}"}/))
                    t.done()
                })
            })
        })
    },

    'should run many jobs quickly': function(t) {
        var self = this
        var i, count = 0
        var njobs = 1000
        var t1 = Date.now()
        for (i=0; i<njobs; i++) this.queue.addJob('speedtest', { a : i }, function(err, jobid) {
            t.ifError(err)
            count += 1
            if (count === njobs) {
                var t2 = Date.now()
                console.log("AR: inserted %d jobs in %d ms", njobs, t2 - t1)
                t1 = Date.now()
                self.queue.runJobs({ countLimit: 10*njobs }, function(err, runCount) {
                    t2 = Date.now()
                    console.log("AR: run %d jobs in %d ms", runCount, t2-t1)
                    t.ifError(err)
                    t.done()
                })
            }
        })
    },
}
