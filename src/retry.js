const log = require('./logger');

async function retry(fn, count = 5, interval = 1000) {
    var retriesLeft = count;
    return new Promise((resolve, reject) => {
        fn()
            .then(resolve)
            .catch((error) => {
                setTimeout(() => {
                    if (retriesLeft <= 1) {
                        // reject('maximum retries exceeded');
                        reject(error);
                    } else {
                        retry(fn, retriesLeft - 1, interval).then(resolve, reject);
                    }
                    // Passing on "reject" is the important part
                }, interval);
            });
    });
}

async function check(fn, count = 5, interval = 1000 ){
    return new Promise((resolve, reject) => {
        var retryLeft = count;
        const timerID = setInterval(() => {
            log.debug('check: retryLeft:', retryLeft);
            if(fn()){
                clearInterval(timerID);
                resolve();
                return
            }

            retryLeft --;
            if( retryLeft <= 0 ){
                clearInterval(timerID);
                reject();
            }
        }, interval)
    })

}

async function waitUntil( fn, maxWait = 10000, interval = 1000) {
    return check(fn, Math.ceil(maxWait/interval), interval)
}

async function delayDo( fn, delay = 1000) {
    return new Promise( (resolve, _) => {
        setTimeout( () => {
            fn();
            resolve();
        }, delay)
    })
}

module.exports = {
    retry, check, waitUntil, delayDo
}