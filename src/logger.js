

const createLog = (fn) => (...args) => {
    return fn(`[ ==== ${moment().format('YYYY-MM-DD HH:mm:ss')} ==== ]`, ...args)
}
const log = {
    debug: createLog(console.log),
    log: createLog(console.log),
    trace: createLog(console.trace),
    info: createLog(console.info),
    warn: createLog(console.warn),
    error: createLog(console.error),
}

module.exports = log;