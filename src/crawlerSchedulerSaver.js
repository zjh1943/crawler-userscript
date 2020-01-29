const log = require('./logger');

const KEY_CRAWLER_SCHEDULER = 'key_crawler_scheduler';

// === scheduler 存储和恢复 === 
function saveCrawlerScheduler(text) {
    GM_setValue(KEY_CRAWLER_SCHEDULER, text);
}

function clearCrawlerScheduler() {
    GM_deleteValue(KEY_CRAWLER_SCHEDULER);
}
function restoreScrawlerScheduler(startCrawlerSchedulerByText) {
    const text = GM_getValue(KEY_CRAWLER_SCHEDULER);
    log.debug(`restoreScrawlerScheduler. text = ${text} `);
    if (text) {
        startCrawlerSchedulerByText(text);
    }
}
// === scheduler 存储和恢复 === 

module.exports = {
    saveCrawlerScheduler,
    clearCrawlerScheduler,
    restoreScrawlerScheduler,
}