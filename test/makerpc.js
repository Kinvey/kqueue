/**
 * makerpc -- build a qrpc formatted call
 * usage: node test/makerpc.js CALL [DATA]
 */

if (process.argv[1].slice(-4) === 'unit') return

if (process.argv.length < 3) {
    process.stderr.write("usage: node makerpc.js CALL [DATA]\n")
    process.exit(1)
}

var call = process.argv[2]
var data = process.argv[3] || undefined

// parse js syntax, so '123' is number and '"123"' is string
try { data = eval("var x = " + data + "; x") } catch (err) { data = data }

process.stdout.write(JSON.stringify({
    v: 1,
    id: 0,
    n: call,
    m: data,
}) + "\n")
