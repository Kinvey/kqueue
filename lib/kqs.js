/**
 * KQS Server
 *
 * Copyright (c) 2015, Kinvey, Inc. All rights reserved.
 *
 * 2015-10-07 - AR.
 * Hackathon!
 */


'use strict'

var fs = require('fs')
var aflow = require('aflow')
var qrpc = require('qrpc')
var kqueue = require('../index')
var KQueue = require('./kqueue.js')
var QFputs = require('qfputs')
var QBuffer = require('qbuffer')

var config = require('qconfig') || {}
var sections = { server:1, store:1, bean:1, logs:1 }
for (var section in sections) if (!config[section]) config[section] = {}


function logit(msg, a, b, c, d, e) {
    console.log(new Date().toISOString(), msg, a, b, c, d, e)
}

var qconf = {
    systemId: config.server.systemId || null,
    host: config.bean.host || 'localhost',
    port: config.bean.port || 11300,
    mongodbUrl: config.store.mongodbUrl || null,
    retryDelaySec: config.bean.retryDelaySec,
    beanstalkFlushInterval: config.bean.flushInterval,
}
var queue = kqueue.buildQueue(qconf, function(err, queue) {
    if (err) throw err

    var server = qrpc.createServer()

    var journalFilename = (config.logs.dir || ".") + "/" + (config.logs.journal || "journal.log")
    var journal = new QFputs(journalFilename)
    var serverState = {
        journalFilename: journalFilename,
        journal: journal,
        callCount: 0,
        jobCount: 0,
        errorCount: 0,
    }
    configureServer(server, queue, config, serverState)
    configureQueue(queue, config)

    var port = config.server.port || 14151
    server.listen(port, function() {
        logit("KQS Started, listening on port %d", port)

        function serverLoop() {
            queue.runJobs({ timeLimitMs: 200 }, function(err, nrun) {
                if (err) {
                    logit("queue ERROR: ", err)
                    serverState.errorCount += 1
                }
                serverState.jobCount += nrun
                setImmediate(serverLoop)
            })
        }
        serverLoop()
    })
})


/*
 * define the server api (handled calls)
 */
function configureServer( server, queue, config, serverState ) {

    server.addHandler('insert', function(req, res, next) {
        if (!isAuth(req)) return next(new Error("not authorized"))

        var job = req.m
        if (!job) return next(new Error("job required"))

        var i, jobs = Array.isArray(job) ? job : [job]
        for (i=0; i<jobs.length; i++) {
            if (!jobs[i].type) return next(new Error("job.type required"))
            serverState.journal.write(JSON.stringify(jobs[i]) + "\n")
        }

        serverState.journal.fflush(function(err) {
            if (err) {
                logit("error writing journal file %s:", serverState.journalFilename, err)
                serverState.errorCount += 1
                return next(new Error("error writing journal file" + err))
            }
            insertJobsFromJournal(serverState.journal, serverState.journalFilename, queue, function(err) {
                if (err) {
                    serverState.errorCount += 1
                    logit("error inserting jobs into the queue")
                }
                // as long as the job was saved to the journal, other errors are not seen by the caller
            })
        })
    })

    server.addHandler('quit', function(req, res, next) {
        if (!isAuth(req)) return next(new Error("not authorized"))
        logit("KQS 'quit' command, shutting down")
        server.close()
        queue.close()
    })

    server.addHandler('stats', function(req, res, next) {
        if (!isAuth(req)) return next(new Error("not authorized"))
        next(null, {
            // TODO: this is a rather skimpy assortment...
            callCount: serverState.callCount,
            jobCount: serverState.jobCount,
            errorCount: serverState.errorCount,
            process: {
                pid: proces.pid,
                memoryUsage: process.memoryUsage(),
            },
            queue: queue.stats(),
        })
    })

    server.addHandler('echo', function(req, res, next) {
        if (!isAuth(req)) return next(new Error("not authorized"))
        next(null, req.m)
    })

    server.addHandler('ping', function(req, res, next) {
        if (!isAuth(req)) return next(new Error("not authorized"))
        next(null, "pong")
    })


    /*
     * helpers
     */

    function isAuth(req) {
        var auth = req.m && req.m.auth || {}
        serverState.callCount += 1

        // TODO: allow access to anyone without credentials and to the 'KQS' sample user
        if (auth.usr === 'KQS' && auth.pwd === 'KQS') return true
        if (!auth.usr && !auth.pwd) return true

        return false
    }

    var _isInserting = false
    function insertJobsFromJournal( journal, filename, queue, callback ) {
        var error = null

        if (_isInserting) return callback(new Error("insert already in progress"))
        _isInserting = true

        var grabbedFile = filename + ".1"
        journal.renameFile(filename, grabbedFile, function(err) {
            if (err && err.message.indexOf('EEXIST') === -1) {
                _isInserting = false
                if (err.message.indexOf('ENOENT') >= 0) {
                    // journal does not exist, nothing to do
                    return callback()
                }
                logit("unable to acquire journal file %s:", grabbedFile, err)
                return callback(err)
            }
            function decodeLine(line) { try { return JSON.parse(line) } catch (err) { return err } }
            var qbuf = new QBuffer({ encoding: 'utf8', decoder: decodeLine })
            var stream = fs.createReadStream(grabbedFile, {highWaterMark: 409600})
                .on('data', function(chunk) { qbuf.write(chunk) })
                .on('end', function() { qbuf.end() })
                .on('error', function(err) { error = err; qbuf.end() })
            aflow.repeatWhile(
                function() {
                    return !error && (qbuf.length > 0 || !qbuf.ended)
                },
                function(done) {
                    var job = qbuf.peekline()
                    if (job instanceof Error) {
                        // guard against broken files, but allow blank lines
                        // skip broken lines, do not hold up the others
                        var line = qbuf.read(qbuf.linelength(), 'utf8')
                        if (line === "\n") return done()
                        logit("ERROR: cannot decode journal line:", line)
                        return done(job)
                    }
                    else if (job) {
                        addJobToQueue(job, function(err) {
                            // on insert error try again next time
                            // TODO: a persistent data error will logjam the inserts, monitor the journal length
                            if (err) logit("unable to insert queue job:", err)
                            else qbuf.skip(qbuf.linelength())
                            done(err)
                        })
                    }
                    else setTimeout(done, 2)
                },
                function(err) {
                    if (error) logit("error reading journal %s:", filename, error.stack)
                    fs.unlink(grabbedFile, function(err) {
                        if (err && err.indexOf('ENOENT') === -1) logit("error removing processed journal %s:", grabbedFile, err)
                        _isInserting = false
                        setImmediate(insertJobsFromJournal, journal, filename, queue, callback)
                        callback(error || err)
                    })
                }
            )
        })
    }

    // job: { type, data, prio, delay, ttr }
    function addJobToQueue( job, cb ) {
        var prioMap = {
            'urgent': KQueue.PRIO_URGENT,
            'high': KQueue.PRIO_HIGH,
            'normal': KQueue.PRIO_NORMAL,
            'low': KQueue.PRIO_LOW,
            'bulk': KQueue.PRIO_BULK,
        }
        var jobOpts = {
            // TODO: test
            priority: prioMap[job.prio] || undefined,
            delay: parseInt(job.delay) || undefined,
            ttr: parseInt(job.ttr) || undefined,
        }
        queue.addJob(job.type, job.data, jobOpts, function(err, jobid) {
            cb(err, jobid)
        })
    }
}


function configureQueue( queue, config ) {

    // add handles for the jobtypes this server is configured to run
    // types without handlers will be ignored and left queued

    if (true) {
        queue.addHandler('ping', function(job, cb) {
            console.log("AR: %d: Queue ping running, payload =", Date.now(), job.payload, job)
            cb()
        })
    }
}
