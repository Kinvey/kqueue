/**
 * KQueue -- simple job queue on top of beanstalkd and any key-value store.
 *
 * Copyright (c) 2014, Kinvey, Inc. All rights reserved.
 *
 * 2014-10-06 - AR.
 */

/* jshint: lastsemic: true */
/* global console, process, module, require, global */
/* global setTimeout, setImmediate */

'use strict';

module.exports = KQueue;


function time() {
    var t1 = process.hrtime();
    return t1[0] + t1[1] * 0.000000001;
}

var events = require('events');
var util = require('util');

var CallbackManager = require('./CallbackManager.js');
var beans = require('fivebeans');
var qflow = require('./qflow');
var mongoid = require('./mongoid');


function KQueue( options ) {
    // function form returns a new object, constructor form returns self
    if (!this || this === global) return KQueue.apply({}, arguments);

    events.EventEmitter.call(this);

    options = options || {};
    if (!options.beanstalkClient) throw new Error("missing options.beanstalkClient");
    if (!options.jobStore) throw new Error("missing options.jobStore");

    // fill in missing settings with defaults
    var settings = {
        beanstalkClient: 'required',
        jobStore: 'required',
        retryDelaySec: 30,
        log: {
            info: function(msg) { console.log(new Date().toISOString() + " [info] " + msg); },
            debug: function(msg) { console.log(new Date().toISOString() + " [debug] " + msg); },
            error: function(msg) { console.log(new Date().toISOString() + " [error] " + msg); },
        },
    };
    // pull in setting overrides from options
    for (var i in settings) {
        settings[i] = options[i] ? options[i] : settings[i];
    }

    this.config = settings;
    this._handlers = {};
    this._arrivalsList = {};
    this._arrivalsList._empty = true;
    this.nowWatching = {};
    this.nowNumWatched = 0;
    this.client = settings.beanstalkClient;
    this.store = settings.jobStore;
    this.log = settings.log;

    // beanstalk priorities are 0..2^32-1.  Ours are 10k, +/-
    this.PRIO_URGENT = 8000;
    this.PRIO_HIGH = 9000;
    this.PRIO_NORMAL = 10000;
    this.PRIO_LOW = 11000;
    this.PRIO_BULK = 12000;
}
util.inherits(KQueue, events.EventEmitter);

/**
 * Start the queue, call callback when ready to use.
 */
KQueue.prototype.open = function open( callback ) {
    var self = this;
    // TODO: do not depend on client being an event emitter, use a start() method
    this.client.on('connect', function(err, ret) {
        self.log.info("Started.");
        callback(err, ret);
    });
};

/**
 * Close the connection to the client, open() with no arguments will reopen.
 */
KQueue.prototype.close = function close( callback ) {
    this.client.end();
// FIXME: no way to reopen!  Must have access to BeanstalkClientFivebeans for that.
// FIXME: once closed, is no longer usable.
    this.log.info("Stopped.");
    if (callback) callback();
};

/**
 * register a function to handle jobs of type jobtype.
 * Note that the handler function is activated before this function returns,
 * ie the handler might start running before the callback.
 */
// TODO: any reason to allow multiple handlers per jobtype?
// TODO: any reason to have a callback here?
KQueue.prototype.addHandler = function addHandler( jobtype, handlerFunc, cb ) {
    var self = this;
    this._handlers[jobtype] = handlerFunc;
    this.client.watch(jobtype, function(err, numWatched) {
        if (err) err = new Error(err);
        cb(err);
    });
};

/**
 * unregister the handler function for jobs of type jobtype.
 * The handler function is guaranteed not to be called after cb runs.
 * Unhandled jobs will remain in the queue, waiting for a handler.
 */
// TODO: any reason to allow handler removal by function object (vs jobtype)?
// TODO: any reason to have a callback here?
KQueue.prototype.removeHandler = function removeHandler( jobtype, cb ) {
    var self = this;
    self.client.ignore(jobtype, function(err, numwatched) {
        // note: cannot ignore 'default', gets NOT_IGNORED
        if (err) err = new Error(err);
        delete(self._handlers[jobtype]);
        cb(err);
    });
};

/**
 * Run waiting jobs for up to timeLimitMs milliseconds,
 * then return.  Will return early if no jobs found.
 * If called with a timeout of 0 ms, it will run just 1 or 0 jobs.
 */
KQueue.prototype.runJobs = function runJobs( options, cb ) {
    options = options || {};
    // by default, run just 1 waiting job, do not wait, do not loop
    var timeLimitMs = options.timeLimitMs || 0;         // do not wait
    var countLimit = options.countLimit || 1;           // run just 1 job
    var self = this;
    var stopTime = Date.now() + timeLimitMs;

    // TODO: scheduling fairness might be improved by watching/ignoring
    // different subsets of the handled types, ie preferentially running
    // some types over others.

    // note: multiple concurrent handlers should be ok,
    // each would fetch and dispatch one job at a time.

    var done = false;
    var misfiledCount = 0;
    var handledCount = 0;
    qflow.repeatUntil(
        function(nextJob) {
            self._getWatchedJob(function(err, job) {
                if (countLimit >= 0 && handledCount >= countLimit) return cb(null, done = true);
                var shouldStop = function() {
                    if (countLimit >= 0 && handledCount >= countLimit ||
                        timeLimitMs >= 0 && Date.now() >= stopTime)
                    {
                        return true;
                    }
                    else return false;
                };
                if (err) return nextJob(err);
                if (!job) {
                    if (shouldStop()) return nextJob(null, true);
                    else return setImmediate(function() {
                        nextJob(null, false);
                    });
                }
                else {
                    if (!self._handlers[job.jobtype]) {
                        // release jobs we didnt expect to see.  Should never happen.
                        // This is built into beanstalk, but release so it will run sooner
                        misfiledCount += 1;
                        self.ungetJob(job, job.priority, 0, function() { });
                        nextJob(null, shouldStop());
                    }
                    else {
                        handledCount += 1;
                        var jobHandler = self._handlers[job.jobtype];
                        jobHandler(job, function(err) {
                            if (err) {
                                // on job error requeue the job and go on to the next one
                                // retryJob() will log a "job failed" message
                                self.retryJob(job, function(err) { nextJob(null, shouldStop()); });
                            }
                            else {
                                self.deleteJob(job, function() { });
                                nextJob(null, shouldStop());
                                // note: the handler may have unregistered its jobtype
                            }
                        });
                    }
                }
            });
        },
        function(err, ret) {
            cb(err, handledCount);
        }
    );
};

/**
 * enqueue a job of type jobtype with the given payload
 * This creates a job object that will be returned to handlers.
 */
KQueue.prototype.addJob = function addJob( jobtype, payload, callOptions, cb ) {
    if (!cb) { cb = callOptions; callOptions = {}; }
    if (jobtype.length > 200) return cb(new Error(jobtype + ": name too long, must be < 200 bytes"));

    var defaultOptions = {
        priority: this.PRIO_NORMAL,     // job priority, 0 is most urgent, 2^32 - 1 is lowest
        delay: 0,                       // seconds before job is eligible to run
        ttr: 30,                        // once running, seconds to finish
    };

    var options = {};
    for (var i in defaultOptions) {
        options[i] = callOptions[i] || defaultOptions[i];
    }

    var job = {
        _id: mongoid(),
        jobtype: jobtype,
        priority: options.priority,
        delay: options.delay,
        ttr: options.ttr,
        enqueueMs: Date.now(),
        payloadType: 'direct',
        payload: payload,
    };
    job.doneAddCallback = cb;
    if (!this._arrivalsList[jobtype]) this._arrivalsList[jobtype] = [];
    this._arrivalsList[jobtype].push(job);
    this._arrivalsList._empty = false;
    if (!this._insertRunning) {
        var self = this;
        this._insertRunning = true;
        // _runInsert runs concurrently with everything else
        var ignoreRunInsertCompletion = function() { };
        setImmediate(function() { self._runInsert(ignoreRunInsertCompletion); });
    }
    return;
};

/**
 * Extend the amount of time the handler has to process this job
 * by an additional TTR (time to run) seconds, starting now.  Jobs that
 * exceed their TTR are reset and become eligible to be run again.
 */
KQueue.prototype.renewJob = function renewJob( job, cb ) {
    this.client.touch(job.jobid, function(err, ok) {
        if (err) return cb(new Error(err));
        cb();
    });
};

/**
 * Remove the job from the queue.  This is part of normal job processing.
 * Jobs that are not deleted will time out and be reset to be run again.
 * (Jobs can also be returned, renewed, or retried)
 */
KQueue.prototype.deleteJob = function deleteJob( job, cb ) {
    cb = cb || function(){ };
    this.client.destroy(job.jobid, function(err) {
        if (err) return cb(new Error(err));
        if (job.payloadType === 'stored') {
            self.store.destroy(job._id, function(err) {
                cb(err);
            });
        }
        else cb();
    });
};

/**
 * Return the job to the queue unrun, to be picked up asap.
 */
KQueue.prototype.ungetJob = function ungetJob( job, newPriority, afterDelaySeconds, cb ) {
    cb = cb || function(){ };
    this.client.release(job.id, newPriority, afterDelaySeconds, function(err) {
        if (err) cb(new Error(err));
        else cb();
    });
};

/**
 * Return the job back to the queue to try again later.
 */
KQueue.prototype.retryJob = function retryJob( job, reasonMessage, cb ) {
    if (!cb && typeof reasonMessage === 'function') { cb = reasonMessage; reasonMessage = ""; }
    cb = cb || function(){ };
    this.log.info(job.jobtype + ": " + (reasonMessage ? reasonMessage : "job error") + ", retrying in " + this.config.retryDelaySec + " sec");
    this.client.release(job.id, job.priority, this.config.retryDelaySec, function(err) {
        if (err) cb(new Error(err));
        else cb();
    });
};


KQueue.prototype._ignore = function _ignore( tubename, cb ) {
    var self = this;
    self.client.ignore(tubename, function(err) {
        // note: cannot ignore 'default', gets NOT_IGNORED
        if (err) return cb(new Error(err));
        cb();
    });
};

// insert the already arrived jobs.  New arrivals will be inserted the next time.
KQueue.prototype._runInsert = function _runInsert( insertDone ) {
    var self = this;

    // _runInsert returns (calls its callback) only when no jobs to insert
    if (self._arrivalsList._empty) {
        self._insertRunning = false;
        return insertDone();
    }

    // grab the arrived jobs, and re-initialize to hold the new arrivals
    var jobs = self._arrivalsList;
    self._arrivalsList = {};
    self._arrivalsList._empty = true;
    // strip the metadata added by addJob
    delete(jobs._empty);

    var jobtype;
    var job;

    var jobtypes = [];
    for (jobtype in jobs) jobtypes.push(jobtype);

    // for each jobtype and for each job, insert them all
    var insertCount = 0;
    qflow.repeatWhile(
        function() {
            jobtype = jobtypes.shift();
            return !!jobtype;
        },
        function(nextJobtype) {
            self.client.use(jobtype, function(err) {
                if (err) {
                    // if cannot insert the jobtype, all jobs of this type error out
                    for (var i in jobs[jobtype]) {
                        var doneAddCallback = jobs[i].doneAddCallback;
                        doneAddCallback(err);
                    }
                    nextJobtype();
                }
                else {
                    // otherwise insert each job, reporting errors individually
// TODO: add callbacks to CallbackManager, and release each one only after
// a successful status check after the beanstalkd -f flush interval has elapsed.
// This will guarantee that the job was registered (and not silently dropped).
                    qflow.repeatWhile(
                        function() {
                            job = jobs[jobtype].shift();
                            return !!job;
                        },
                        function(nextJob) {
                            // run the callback of each job
                            var doneAddCallback = job.doneAddCallback;
                            job.doneAddCallback = undefined;
                            self._putJob(job, function(err, jobid) {
                                insertCount += 1;
                                doneAddCallback(err, jobid);
                                nextJob();
                            });
                        },
                        function(err) {
                            nextJobtype(err);
                        }
                    );
                }
            });
        },
        function(err) {
            // when all done, go and check for any new arrivals.
            // This function loops until out of jobs to insert.
            setImmediate(function(){ self._runInsert(insertDone); });
        }
    );
};

KQueue.prototype._quickStatus = function _quickStatus( cb ) {
    this.client.touch(-1, function(err) {
        if (err !== 'NOT_FOUND') return cb(new Error("status check failed, unexpected beanstalk response"));
        cb();
    });
};

// enqueue a job into the channel currently in use
// small payloads are sent to beanstalkd directly, large ones via jobStore
KQueue.prototype._putJob = function _putJob( job, cb ) {
    var self = this;
    var payload;

    try {
        payload = JSON.stringify(job);
        if (payload.length <= 65535) {
            self.client.put(job.priority, job.delay, job.ttr, payload, function(err, jobid) {
                // NOTE: mysterious "EXPECTED_CRLF" errors are from missing prio/delay/ttr params
                cb(err, jobid);
            });
        }
        else {
            // beanstalkd accepts payloads up to 64KB, so handle larger
            // by saving the full job to the store, and just the frame to the queue
            // The queue will schedule the frame, we will retrieve the payload.
            this.jobStore.set(job._id, payload, function(err) {
                if (err) return cb(new Error("unable to store.set payload: " + err.message));
                job.payload = job._id;
                job.payloadType = 'stored';
                // since the job stringified once, it will again
                payload = JSON.stringify(job);
                self.client.put(job.priority, job.delay, job.ttr, payload, cb);
            });
        }
    }
    catch (err) {
        cb(err);
    }
};

// get a job from one of the channels watched
// returns a queued job object else false
KQueue.prototype._getWatchedJob = function _getWatchedJob( cb ) {
    var self = this;
    try {
        var timeout = 0;
        self.client.reserve_with_timeout(timeout, function(err, jobid, jobbody) {
            if (!err) {
                var job = JSON.parse(jobbody.toString());
                // need to annotate the job object with its beanstalk job id
                job.jobid = jobid;
                if (job.payloadType === 'direct') {
                    cb(null, job);
                }
                else {
// TODO: integrate with with a durable jobStore
                    self.store.get(job.id, function(err, payload) {
                        if (err) return cb(new Error("unable to store.get payload: " + err.message));
                        job.payload = JSON.parse(payload);
                        cb(null, job);
                    });
                }
            }
            else if (err === 'DEADLINE_SOON') {
                // one of the running jobs has <= 1 second left to finish
                // Beanstalk doesnt tell us which job, though, so to act on this
                // would have renewJob() all running jobs.
            }
            else if (err === 'TIMED_OUT') {
                // no watched jobtypes waiting, nothing more to do
                return cb(null, false);
            }
            else {
                // should not happen, but notify us just in case
                return cb(new Error(err));
            }
        });
    }
    catch (err) {
        cb(err);
    }
};
