
const { check, retry, waitUntil } = require('./retry');
const log = require('./logger');

class Page {
    id = '';
    triggerOnUrl(url) { return false; }
    isPageReady() { return false; }
    onPageReady() { return true; }
    getUrlsToAdd() { return []; }
}
/**
 * @typedef {Object} ResourceOption
 * @property {string} id
 * @property {function} triggerOnUrl 当前配置适用于哪个 URL，`(url) => boolean`
 * @property {function} isPageReady 网页是否加载完全，`(document) => boolean`
 * @property {function} onPageReady 网页已经加载成功，需要在这里处理数据，或者执行某些操作。`(document) => boolean`
 * @property {function} getUrlsToAdd 当前网页有哪些链接该加入队列 `(document) => string[]`
 * 
 * @typedef {Object} LoginOption
 * @property {string} loginPageURL
 * @property {function} needLogin 根据当前网页内容决定是否需要重新登录。`(document) => boolean`
 * @property {function} isLoginPageReady 登陆页面是否已经加载成功。`(document) => boolean`
 * @property {function} isLoginSuccess 登陆是否成功。`(document) => boolean`
 * @property {function} doLogin 执行登陆。`(document) => Promise`
 */


/**
 * @typedef {Object} CrawlerOption 
 * @property  {string} startPageURL
 * @property  {function} gotoUrl `(url) => Promise`
 * @property  {ResourceOption[]} pageList 资源列表
 * @property  {LoginOption} [login] 登陆配置，如果不需要登陆，可以不设置
 * @property  {number} [maxWait=10000] 加载网页时最长加载时间，单位：ms，
 * @property  {number} [retryCount=3] 网页加载未成功时，最多重试次数，
 * @property  {number} [operateInterval=1000] 每次操作间隔时间 
 * @property  {function} [onCrawlComplete] `() => void`
 * @property  {function} [onPageStart] `() => void`
 * @property  {function} [onPageComplete] `() => void`
 * @property  {number} [maxWait=8000] 每次加载完网页后停留时间 
 * @property  {number} [minWait=3000] 每次加载完网页后停留时间 
 */

/**
 * 爬虫调度器
 */
class Crawler {

    static QUIT_REASON_CLEAR = 'quit_reason_clear';
    static QUIT_REASON_PAUSE = 'quit_reason_pause';
    /**
     * @type {CrawlerOption}
     */
    options = {
        startPageURL: '',
        pageList: [],
        maxWait: 10000,
        retryCount: 3,
        operateInterval: 1000,
        minWait: 3000,
        maxWait: 8000,
    }

    fetchSN = new Date().getTime(); // 每启动一次 crawler，将分配一个新的 SN，作为此次抓取的唯一标识符。
    urlList = []; // 将要抓取的 URL
    currUrl = null; // 正在抓取的 URL
    crawledUrlSet = new Set();

    /**
     * @param {CrawlerOption} options
     */
    constructor(options) {
        for (let key in options) {
            this.options[key] = options[key]
        }
    }

    isCrawling = false; // 一次抓取正在进行中。
    isPause = false; // 一次抓取被暂停。稍后可以被恢复。
    isToBeClear = false; // 此次抓取将要被停止。

    clear = () => {
        this.urlList = [];
        this.crawledUrlSet.clear();
        this.isPause = false;
        this.isCrawling = false;
        this.isToBeClear = true;
    }

    start = async () => {
        log.debug('_start', this.urlList);
        this.urlList = [this.options.startPageURL];
        this.isPause = false;
        this.isToBeClear = false;
        this.isCrawling = true;
        this.fetchSN = new Date().getTime()
        return this._start()
    }

    restoreFromSavedState = async (urlList, crawledUrlSet) => {
        this.urlList = urlList;
        this.crawledUrlSet = crawledUrlSet;
        this.isCrawling = true;
        this.isPause = false;
        this.isToBeClear = false;
        this.fetchSN = new Date().getTime()
        return this._start();
    }

    pause = () => {
        log.debug('_pause: this.urlList:', this.urlList);
        this.isPause = true;
    }

    resume = async () => {
        log.debug('_resume: this.urlList:', this.urlList);
        this.isPause = false;
        return this._start();
    }

    _start = async () => {
        log.debug('_start: begin. this.urlList:', this.urlList);
        const { minWait, maxWait, onPageStart, onPageComplete, onCrawlComplete } = this.options;
        const timeToWait = Math.floor(Math.random() * (maxWait - minWait)) + minWait;

        if (this.urlList.length > 0) {
            const url = this.urlList.splice(0, 1)[0];
            this.currUrl = url;
            this.crawledUrlSet.add(url);
            if (onPageStart) onPageStart(url);
            return this._crawlPage(url)
                .catch((reason) => {
                    /** 如果中间失败了，还是继续下一波，不要影响下一条任务 */
                    log.error('_start: crawl page fail:', url, ', reason:', reason);
                })
                .then(() => new Promise((resolve, _) => {
                    this.currUrl = null;
                    if (onPageComplete) onPageComplete(url);
                    log.debug('_stat: wait time = ', timeToWait);
                    setTimeout(resolve, timeToWait);
                }))
                .then(() => {
                    if (this.isToBeClear) {
                        if (onCrawlComplete) onCrawlComplete();
                        return Promise.reject(Crawler.QUIT_REASON_CLEAR);
                    } else if (this.isPause) {
                        return Promise.reject(Crawler.QUIT_REASON_PAUSE);
                    } else {
                        return this._start();
                    }
                })
        } else {
            this.isCrawling = false;
            if (onCrawlComplete) onCrawlComplete();
        }
    }

    _openPageOnce = async (url, isPageReady) => {
        // log.debug('_openPageOnce:', url);
        return this.options.gotoUrl(url)
            .then(() => {
                return waitUntil(isPageReady, this.options.maxWait)
            })
    }

    _runFunctionAndLoginIfNeed = async (fn, ...args) => {
        const { login } = this.options;
        if (!login) { // 如果未设置 login 配置，则说明不需要登陆
            return fn(...args);
        }

        const { needLogin } = login;
        return fn(...args)
            .catch(() => {
                if (needLogin()) {
                    return this.login()
                        .then(() => fn(...args))
                } else {
                    return Promise.reject()
                }
            })
    }


    _openPageAndLoginIfNeed = async (url) => {
        // log.debug('_openPageAndLoginIfNeed: ', url)
        const { pageList } = this.options;
        const page = pageList.find((r) => r.triggerOnUrl(url));
        const { isPageReady, onPageReady, getUrlsToAdd } = page;

        return this._runFunctionAndLoginIfNeed(this._openPageOnce, url, isPageReady)
            .then(async () => {
                await onPageReady(this.fetchSN);
                let newUrls = getUrlsToAdd();
                newUrls = newUrls.filter((u) => !this.crawledUrlSet.has(u))
                log.debug('_openPageAndLoginIfNeed. newUrls:', newUrls);
                this.urlList = this.urlList.concat(newUrls);
            })
    }

    _crawlPage = async (url) => {
        log.debug('_crawlPage: ', url)
        const { retryCount } = this.options;

        return retry(() => this._openPageAndLoginIfNeed(url), retryCount)
    }

    login = async () => {
        log.debug('login');
        const { login, maxWait } = this.options;
        if (!login) return;
        else {
            const { loginPageURL, isLoginPageReady, isLoginSuccess, doLogin } = login;

            var p = null;
            if (isLoginPageReady()) {
                log.debug('login: isLoginPageReady.');
                p = doLogin();
            } else {
                log.debug('login: needReload');
                p = this._openPageOnce(loginPageURL, isLoginPageReady).then(doLogin);
            }
            return p.then(() => waitUntil(isLoginSuccess, maxWait))
        }
    }
}





module.exports = {
    Crawler,
    Page,
}; 