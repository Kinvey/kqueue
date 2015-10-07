'use strict'

var BeanstalkClientMock = require('../lib/BeanstalkClientMock.js')
var JobStoreMock = require('../lib/JobStoreMock.js')
var kqueue = require('../index')

module.exports = {
    setUp: function(done) {
        this.jobtype = 'type1'
        this.payload = 'payload1'
        this.jobStore = new JobStoreMock()
        this.jobStore.tag = 'Andras'
        var self = this
        kqueue.buildQueue({
            BeanstalkClient: BeanstalkClientMock,
            bulkStore: this.jobStore,
        }, function(err, queue) {
            self.queue = queue
            self.bean = queue.bean
            done()
        })
    },

    tearDown: function(done) {
        done()
    },

    'addJob': {
        'should use() then put() into beanstalk': function(t) {
            var self = this
            this.queue.addJob(this.jobtype, this.payload, function addJobCallback(err, jobid) {
                t.equal(self.bean.calls[0][0], self.jobtype)
                t.equal(self.bean.calls[0].name, 'use')
                t.equal(self.bean.calls[1].name, 'put')
                // calls[0][1] is a wrappered addJobCallback
                t.done()
            })
        },

        'should insert into beanstalk': function(t) {
            var self = this
            var options = { priority: 123, delay: 234, ttr: 345 }
            this.queue.addJob(this.jobtype, this.payload, options, function addJobCallback(err, jobid) {
                t.equal(self.bean.calls[1][0], 123)
                t.equal(self.bean.calls[1][1], 234)
                t.equal(self.bean.calls[1][2], 345)
                var inserted = JSON.parse(self.bean.calls[1][3])
                t.equal(inserted.payload, self.payload)
                // calls[1][4] is a wrappered addJobCallback
                t.done()
            })
        },

        'should save large payloads into jobStore': function(t) {
            var self = this, payload = new Array(70000).join('x')
            this.queue.addJob(this.jobtype, payload, function(err, jobid) {
                var keys = self.jobStore.keys()
                self.jobStore.get(keys[0], function(err, data) {
                    var job = JSON.parse(data);
                    t.equal(job.payload, payload)
                    t.done()
                })
            })
        },
    },

    'deleteJob': {
        'should call bean.delete() with the jobid': function(t) {
            var bean = this.bean
            this.queue.deleteJob({jobid: 1234}, function(err) {
                t.equal(bean.calls[0].name, 'delete')
                t.equal(bean.calls[0][0], 1234)
                t.done()
            })
        },

        'should delete large payload from jobStore': function(t) {
            var self = this, payload = new Array(70000).join('x')
            this.queue.addJob(this.jobtype, payload, function(err, jobid) {
                var key = self.jobStore.keys()[0]
                // delete by id, unit tests can do that
                self.queue.deleteJob({jobid: jobid}, function(err) {
                    t.equal(self.jobStore.keys().length, 0)
                    t.done()
                })
            })
        },
    },
}
