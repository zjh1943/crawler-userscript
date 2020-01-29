const log = require('./logger');

const KEY_CRAWLER_STATE = 'key_crawler_state'

function saveCrawler(crawler) {
    GM_setValue(KEY_CRAWLER_STATE, JSON.stringify({
        isCrawling: crawler.isCrawling,
        currUrl: crawler.currUrl,
        urlList: crawler.urlList,
        crawledUrls: [...crawler.crawledUrlSet],
    }));
}

function hasUnfinishedTask() {
    const state = JSON.parse(GM_getValue(KEY_CRAWLER_STATE, null));
    log.debug(`hasUnfinishedTask. state = `, state);
    return state && state.isCrawling;
}

function restoreCrawler(crawler) {
    const state = JSON.parse(GM_getValue(KEY_CRAWLER_STATE, null));
    log.debug(`restoreCrawler. state = `, state);
    const { urlList, currUrl, crawledUrls } = state;
    const crawledUrlSet = new Set(crawledUrls);
    if (currUrl) {
        urlList.splice(0, 0, currUrl);
        crawledUrlSet.delete(currUrl);
    }
    return crawler.restoreFromSavedState(urlList, crawledUrlSet);
}

function clearCrawler() {
    GM_deleteValue(KEY_CRAWLER_STATE);
}

module.exports = {
    saveCrawler,
    clearCrawler,
    hasUnfinishedTask,
    restoreCrawler,
};