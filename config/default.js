/**
 * KQS server configuration
 *
 * Copyright (c) 2015, Kinvey, Inc. All rights reserved.
 */


module.exports = {
    server: {
        systemId: 0,
        port: 14151,
    },

    store: {
        mongodbUrl: "mongodb://localhost/kqueue",
        dbname: 'kqueue',
        collection: 'store',
    },

    bean: {
        host: 'localhost',
        port: 11300,
        flushInterval: 0,
    },

    logs: {
        dir: ".",
        journal: "journal.log",
    },
}
