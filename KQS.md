Kinvey Queueing Service
=======================

An robust job queueing / running service, built on top of beanstalkd, kqueue
and qrpc.

The service, while running, listens for new jobs in the queue, runs them, and 

        $ node lib/kqs.js &
        $ node test/makerpc.js insert '[{type:"ping",data:{a:1}}]' \
        >     | nc localhost 14151
        # => AR: 1444272543090: Queue ping running, payload = { a: 1 }

API
---

### insert

insert one or more jobs into the queue.  The job(s) are written to a journal
file, and inserted in the background after the call returns.

### quit

exit the kqs server

### stats

return stats on the kqs server

### ping

testing call, returns "pong"

### echo

testing call, returns the call arguments it receives
