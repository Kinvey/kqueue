Kinvey Queueing Service
=======================

Kinvey Hackathon, 2015-10-07 - [Andras](https://github.com/andrasq).

A robust job queueing / job running service, built on top of beanstalkd,
kqueue and qrpc.  Jobs are checkpointed when inserted, and are retried until
successfully run.

The service waits for new jobs in the queue, runs them, and retries any that fail.

As a quick test, from the command line type:

        $ node lib/kqs.js &
        $ node test/makerpc.js insert '{type:"ping",data:{a:1}}' \
        >     | nc localhost 14151
        # => AR: 1444272543090: Queue ping running, payload = { a: 1 }


Features
--------

* per-job priority, higher priority jobs run first
* guaranteed delivery:  once accepted, is not lost
* non-blocking, insert succeeds as soon as saved to journal
* durable: jobs checkpointed to journal file by both the kqs and beanstalk;
  job accepted only after being recorded to journal
* robust: if node crashes, job times out and is run again on another server
* guaranteed execution: jobs run at-least-once, retried until completed successfully
* arbitrary job payload sizes, oversize data stored in bulk store (mongodb)
* fast, low overhead rpc api
* no global state, perfectly scalable; each kqs server can run completely standalone


API
---

The API is newline terminated json string RPC calls.

### insert

Insert one or more jobs into the queue.  The job(s) are written to a journal
file, and inserted in the background after the call returns.  An object parameter
is the job to insert, an array must contain jobs.

The job object must contain a field `type` that identifies the job handler, and
may optionally contain the fields

        { type: jobtype,                // job type, string, required
          data: payload,                // job payload, any js value, default undefined
          prio: 'normal',               // priority, urgent|high|normal|low|bulk default normal
          delay: 0,                     // run after delay seconds, default 0
          ttr: 30 }                     // job runtime limit, re-run if exceeded, default 30

### quit

Exit the kqs server.

### stats

Return stats on the kqs server.

### ping

Testing call, returns "pong".

### echo

Testing call, returns the call arguments it got.


Lessons Learned
---------------

* neat how easy it is to set up a new service with [qrpc](https://npmjs.org/package/qrpc)
* robustness is a matter of checkpointing along the way; easiest checkpoint is a journal file.
  KQS has checkpoints between caller and service (journal file), service and queue (beanstalkd -b -f)
* it simplifies things to have ready-made service building blocks like
  [qfputs](https://npmjs.org/package/qfputs) (writing) and
  [qbuffer](https://npmjs.org/package/qbuffer) (reading)
* nodejs streams are great in theory, but fault-tolerant error handling is still complex.
  Easy enough to die an error, but retries and graceful degradation is not really supported,
  and in production code many of the advantages of streams have been lost.
  E.g., stream errors are not propagated; the only feedback of receipt of data is
  the 'drain' event, which does not say anything about whether it was checkpointed yet;
  no way to throttle data at sub-chunk granularity.
* nodejs evented model is great if neither performance nor blocking is an issue,
  but becomes tricky to "play nice".  E.g., chunk delivery is synchronous, cannot yield,
  thus data processing will block all other tasks and i/o events.

Todo
----

* configure jobtype handling in config file (for job classes, server pools)
* "fair share" scheduler
* call logs (latency, duration)
* healthcheck call
* unit test: binary payloads
* allow jobs to feed back ok/fail/again status
