/**
 * kqueue example
 *
 * Copyright (c) 2014, Kinvey, Inc. All rights reserved.
 *
 * This software is licensed to you under the Kinvey terms of service located at
 * http://www.kinvey.com/terms-of-use. By downloading, accessing and/or using this
 * software, you hereby accept such terms of service  (and any agreement referenced
 * therein) and agree that you have read, understand and agree to be bound by such
 * terms of service and are of legal age to agree to such terms with Kinvey.
 *
 * This software contains valuable confidential and proprietary information of
 * KINVEY, INC and is subject to applicable licensing agreements.
 * Unauthorized reproduction, transmission or distribution of this file and its
 * contents is a violation of applicable laws.
 */

var beanstalkHost = 'localhost';
var beanstalkPort = 11300;

var doInserts = doRuns = 0;
var doInserts = 10000;          // how many jobs to insert into the queue
var doRuns = 10000;              // how many jobs to run from the queue
var jobtype = 'testjob1';       // tube to put jobs into
var workerCount = 4;            // number of job runners

// initialize worker cluster
var _cluster;
if (workerCount > 1) {
    _cluster = require('cluster');
    if (_cluster.isMaster) {
        for (var i=1; i<workerCount; i++) {
            var worker = _cluster.fork();
        }
    }
    doInserts = Math.floor(doInserts / workerCount);
    doRuns = Math.floor(doRuns / workerCount);
}

// gather all potential exits to only close the queue when everyones done
var _doneCount = 0;
function done( queue ) {
    _doneCount += 1;
    var expectedDoneCount = !!doInserts + !!doRuns;
    if (_doneCount >= expectedDoneCount) {
        queue.close();
        if (_cluster && _cluster.isMaster) _cluster.disconnect();
    }
}

// run the queue
var buildQueue = require('../index');
var config = {
    host: beanstalkHost,
    port: beanstalkPort,
}
buildQueue(config, function(err, queue) {
    var nadded = 0;
    if (doInserts) {
        var insertsStartTm = Date.now();
        console.log("Inserts started at ", insertsStartTm);
        for (var i=1; i<=doInserts; i++) {
            queue.addJob(jobtype, 'myPayload' + i, function(err, jobid) {
                // added job
                if (err) throw err;
                ++nadded;
                if (nadded >= doInserts) {
                    console.log("inserted ", doInserts, "in", Date.now()-insertsStartTm, "ms");
                    done(queue);
                }
            });
        }
    }

    if (doRuns) setTimeout(function() {
        var runsStartTm = Date.now();
        console.log("Runs started at ", runsStartTm);
        queue.addHandler(
            jobtype,
            function handleJob( job, cb ) {
                // process myPayload = job.payload
                // ...
                queue.deleteJob(job, function(err) {
                    // job finished and removed
                    cb(err);
                });
            },
            function(err) {
                if (err) throw new Error("unable to register handler for jobtype", err);
            }
        );
        queue.runJobs({countLimit: doRuns, timeLimitMs: -1}, function(err, count) {
            // processed count jobs
            console.log("processed", count, "jobs in", Date.now()-runsStartTm, "ms");
            done(queue);
        });
    }, 1);

    if (!doInserts && !doRuns) done(queue);
});
