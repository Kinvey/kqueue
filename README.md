kqueue
======

Kinvey Hackathon, 2014-10-09 - Andras.

## Summary

Job queue and job runner built on top of beanstalkd.  Working prototype.

- guaranteed execution
    - waiting jobs are saved to durable store (see note about race condition in TODO below)
    - queued jobs will be retried until deleted (explicit delete required)
- job priorities
- deferred execution
- job types (channels)
- per-jobtype job handlers

----
        var KQueue = require('kqueue');
        var queue = new KQueue({host: '0.0.0.0', port: 11300});
        queue.open(function(err) {
            for (var i=1; i<=10; i++) {
                queue.addJob('jobtype1', 'myPayload' + i, function(err, jobid) {
                    if (err) throw err;
                });
            }

            queue.addHandler('jobtype1', function(job, cb) {
                var myPayload = job.payload;
                queue.deleteJob(job, function(err) {
                    // could also just ignore delete errors, job would run again
                    cb(err);
                });
            });

            queue.runJobs({countLimit: 100, timeLimitMs: 200}, function(err, count) {
                if (err) throw err;
                // actually ran count jobs
            });
            queue.close();
        });


----
## Calls

## `KQueue(options)`
Options:

        beanstalkClient: // required, eg KQueue.Connection
        jobStore: // required, eg JobStoreMock
        retryDelaySec: 30
        log: // logger with info/debug/error methods

### `open(callback)`

### `close(callback)`

### `addJob(jobtype, myPayload, options, function(err, jobid))`
Options:

        priority: KQueue.PRIO_NORMAL (PRIO_URGENT, PRIO_HIGH, PRIO_NORMAL, PRIO_LOW, PRIO_BULK)
        delay: 0
        ttr: 30

### `addHandler(jobtype, handlerFunc(jobObject, callback), callback)`
        var myPayload = jobObject.payload

### `removeHandler(jobtype, callback)`

### `renewJob(jobObject, callback)`

### `deleteJob(jobObject, callback)`

### `ungetJob(jobObject, newPriority, afterDelaySeconds, callback)`

### `retryJob(jobObject, reasonMessage, callback)`

### `runJobs(options, function(err, countRan))`
Options:

        timeLimitMs
        countLimit

----
## Todo

- unit tests
- attach a durable jobStore for large payloads
- log more info (there is logging support built in)
- hooks for monitoring and alerting
- minor refactoring to smooth out the interfaces
- clean up, remove remnants of scaffolding
- fully decouple from fivebeans beanstalkd bindings
- iron out clustered mode q.close kink
- address race condition: only confirm addJob() when synced by beanstalkd (configured 50ms sync interval)
- try bonded mode, single binding to multiple connections
- try bonded mode: single binding to multiple beanstalkd servers
- investigate job delete speed issue (try batched with netcat, try with -f 10000 sync)
- integrate qbean, time batched throughput

Lessons
----

- nodejs modules have weird avoidable quirks (async recursion depth, fivebeans order of operations)
- some information not visible until late into the project, eg beanstalkd job delete rate, max payload size
- sometimes a hackathon has a mini-hackathon lurking inside: qbean!
