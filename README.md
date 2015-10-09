kqueue
======

Kinvey Hackathon, 2014-10-09 - [Andras](https://github.com/andrasq).

Job queue and job runner built on top of [beanstalkd](https://github.com/kr/beanstalkd).  Working prototype.
Three days, 1000 lines of code, 95% functionality.

## Summary

Kqueue is a reliable real-time job scheduling and execution engine that
guarantees delivery and eventual job completion.  Queued jobs will
remain queued until successfully processed by their respective handlers.

A job is a payload (message) sent to a specific handler (recipient).
Messages are matched to message handlers by the jobtype string (channel).
Messages added to the job queue remain until explicitly removed.
(See the [beanstalk job lifecycle description](https://github.com/kr/beanstalkd/blob/master/doc/protocol.md#job-lifecycle).)

### Install

        npm install git://github.com/Kinvey/kqueue

### Features

- real-time (scheduling/routing/execution overhead under .5 ms)
- guaranteed execution
    - "run at least once": explicity delete required, else will retry
    - "run eventually": handlers do not have to be currently active
    - "queue and forget": waiting jobs are saved to durable store (see notes about race condition and SPOF in TODO below)
- postdated execution, can be set for later delivery
- job priorities, more urgent jobs first
- unlimited number of job types (channels)
- per-jobtype job handlers (listeners)
- per-jobtype suspend/resume of message delivery

### Example

        var KQueue = require('kqueue').KQueue;
        var queue = new KQueue({
            host: 'localhost',
            port: 11300
        });
        queue.open(function(err) {
            for (var i=1; i<=10; i++) {
                queue.addJob('jobtype1', 'myPayload' + i, function(err, jobid) {
                    // added job
                });
            }

            queue.addHandler(
                'jobtype1',
                function handleJob( job, cb ) {
                    // process myPayload = job.data
                    // ...
                    queue.deleteJob(job, function(err) {
                        // job finished and removed
                        cb(err);
                    });
                },
                function(err) {
                    // registered job handler
                }
            );

            queue.runJobs({countLimit: 100, timeLimitMs: 200}, function(err, count) {
                // processed count jobs
                // once inserts have finished, finish up
                queue.close();
            });
        });


----
## Calls

### KQueue( options )
Options:

        host: '0.0.0.0'   // beanstalkd daemon server
        port: 11300       // beanstalkd daemon port
        bulkStore: null   // bulk key-value store for job data with get/set/delete methods

### open( callback )

### close( callback )

### addJob( jobtype, myPayload, options, function(err, jobid ))

Options:

        priority: KQueue.PRIO_NORMAL
                        // PRIO_URGENT, PRIO_HIGH, PRIO_NORMAL, PRIO_LOW, PRIO_BULK
        delay: 0        // seconds before eligible to run
        ttr: 30         // once reserved, must finish in 30 seconds else will be re-queued

### addHandler( jobtype, handlerFunc(jobObject, cb), callback )

Register the handler function to process jobs of type jobtype.  The
queue starts listening for and running jobs of jobtype.  The callback is
called once the listener has been installed.

The handler is a function taking two arguments, the job object and a callback.
The job arguments are in `job.data`.  The callback must be called when the
handler is done, else the computation will block.

        var myPayload = jobObject.data

### removeHandler( jobtype, callback )

### renewJob( jobObject, callback )

### deleteJob( jobObject, callback )

### ungetJob( jobObject, newPriority, afterDelaySeconds, callback )

### retryJob( jobObject, reasonMessage, callback )

### runJobs( options, function(err, countRan) )
Options:

        timeLimitMs     0: do not wait, >0: wait ms, -1: unlimited
        countLimit      >0: at most count, <0: unlimited

### purgeJobs( jobtype, [matchingRegExp,] cb )

Delete all queued jobs of type jobtype whose serialized form matches the given
regular expression (by default all jobs match).  Returns the count of jobs
deleted.  This is an administrative command for advanced users only.  Do not
call this command on servers that are listening for jobs.


----
## Todo

- unit tests
- log more info (there is logging support built in)
- analyze and address points of failure (and SPOF)
- add calls for introspection, queue stats, job stats
- minor refactoring to smooth out the interfaces
- clean up, remove remnants of scaffolding
- try bonded mode, single interface to multiple connections
- try bonded mode: single interface to multiple beanstalkd servers
- maybe allow multiple job handlers (listeners) for pub/sub like message multicast

Lessons
----

- nodejs modules have weird avoidable quirks (async recursion depth, fivebeans order of operations)
- some information not visible until late into the project, eg beanstalkd job delete rate, max payload size
- sometimes a hackathon has a mini-hackathon lurking inside: qbean! (batching beanstalkd driver)
- clustered mode triples throughput (4-core system)
