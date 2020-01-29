'use strict';


const DataFrame = dfjs.DataFrame;
const log = require('./logger');
const { Crawler } = require('./crawler');
const { delayDo } = require('./retry');
const later = require('later');
const crawlerSaver = require('./crawlerSaver');
const schedulerSaver = require('./crawlerSchedulerSaver');


function setupConfig() {
    GM_config.init(
        {
            'id': 'Taobao_Crawler_Config',
            'fields':
            {
                hidden1: {
                    section: ['操作等待时间', '每加载一个网页后，等待一些时间，防止访问过快而被淘宝官方察觉.'],
                    type: 'hidden',
                },
                'minWait':
                {
                    'label': '最少等待时间（秒）',
                    'type': 'int',
                    'default': '3'
                },
                'maxWait':
                {
                    'label': '最长等待时间（秒）',
                    'type': 'int',
                    'default': '5'
                },
                hidden2: {
                    'section': ['定时器配置', '配置方法请参考这里：<a href="https://bunkat.github.io/later/parsers.html#text" target=”_blank”>配置帮助</a>'],
                    type: 'hidden',
                },
                'scrawlScheduleText':
                {
                    'label': '抓取定时器配置',
                    'type': 'text',
                    'default': 'at 23:50 also every 1 hour between 1 and 23'
                },
                'downloadScheduleText':
                {
                    'label': '下载定时器配置',
                    'type': 'text',
                    'default': 'at 23:58',
                },
                hidden3: {
                    'section': ['淘宝账户配置', '当登陆状态实效时，需要重新登陆。'],
                    type: 'hidden',
                },
                'taobaoAccount':
                {
                    'label': '直通车账户',
                    'type': 'text',
                    'default': ''
                },
                'taobaoPWD':
                {
                    'label': '直通车密码',
                    'type': 'text',
                    'default': ''
                }
            }
        });
}


const loginOptions = {
    loginPageURL: 'https://subway.simba.taobao.com/indexnew.jsp',
    // mx-view="common-home/views/pages/home/login"
    needLogin: () => {
        const mainWindow = $('div.home-body iframe').length > 0;

        let subWindow = $('#J_LoginBox .bd').length > 0;
        if (subWindow) {
            subWindow = $('#J_LoginBox .bd').css('display') !== 'none';
        }
        return mainWindow || subWindow;
    },
    isLoginPageReady: () => true,
    isLoginSuccess: () => {
        return $('#J_LoginBox .bd').css('display') === 'none';
    },
    doLogin: async () => {
        await delayDo(() => {
            const account = GM_config.get('taobaoAccount');
            log.debug('doLogin. type account: ', account);
            $('#J_StaticForm input#TPL_username_1').val(account);
        }, 1000)

        await delayDo(() => {
            const pwd = GM_config.get('taobaoPWD');
            log.debug('doLogin. type pwd: ', pwd)
            $('#J_StaticForm input#TPL_password_1').val(pwd);
        }, 1000)

        await delayDo(() => {
            log.debug('doLogin. submit')
            $('button#J_SubmitStatic').click();
        }, 2000)

    }
};

function createCrawler() {
    const options = {
        startPageURL: 'https://subway.simba.taobao.com/#!/manage/campaign/index',
        // startPageURL: 'https://subway.simba.taobao.com/#!/manage/campaign/detail?campaignId=40195486&start=2020-01-14&end=2020-01-14',
        minWait: (GM_config.get('minWait') || 3) * 1000,
        maxWait: (GM_config.get('maxWait') || 5) * 1000,
        gotoUrl: async (url) => {
            log.debug('gotoUrl:', url);
            location.href = url
        },
        pageList: [
            require('./CampaignsPage'),
            require('./AdgroupsPage'),
            require('./KeywordsPage'),
        ],
        login: loginOptions,
        onPageStart: () => {
            crawlerSaver.saveCrawler(currRunningCrawler);
        },
        onCrawlComplete: () => {
            crawlerSaver.clearCrawler();
        }
    }
    return new Crawler(options);
}


const menus = [
    {
        name: '启动定时抓取',
        fn: startCrawlerScheduler,
        accessKey: 'start'
    },
    {
        name: '终止定时抓取',
        fn: stopCrawlerScheduler,
        accessKey: 'end'
    },
    {
        name: '抓取一次',
        fn: scrawlOnce,
        accessKey: 'once'
    },
    {
        name: '下载数据',
        fn: downloadData,
        accessKey: 'download',
    },
    {
        name: '清空数据',
        fn: clearData,
        accessKey: 'clear',
    },
    {
        name: '爬虫配置',
        fn: () => GM_config.open(),
        accessKey: 'config'
    },
];

menus.forEach(m => {
    GM_registerMenuCommand(m.name, m.fn, m.accessKey);
});


function startCrawlerSchedulerByText(text) {
    if (crawlerScheduler) {
        alert("爬虫正在进行中。请勿重复启动");
        return;
    }
    try {
        const sched = later.parse.text(text);
        schedulerSaver.saveCrawlerScheduler(text);
        crawlerScheduler = later.setInterval(scrawlOnce, sched);
        log.debug('startCrawlerScheduler: next 24 occurences: ', later.schedule(sched).next(24));
    } catch{
        alert('定时器配置错误，请重新配置');
    }
}

function startCrawlerScheduler() {
    const text = GM_config.get('scrawlScheduleText') || 'at 23:50 also every 1 hour between 1 and 23';
    startCrawlerSchedulerByText(text);
}

function stopCrawlerScheduler() {
    schedulerSaver.clearCrawlerScheduler();
    if (!crawlerScheduler) {
        alert("定时器尚未启动.");
        return;
    }
    crawlerScheduler.clear();
    crawlerScheduler = null;
}

function scrawlOnce() {
    if (currRunningCrawler) {
        currRunningCrawler.clear();
    }
    currRunningCrawler = createCrawler();
    currRunningCrawler.start().then(() => {
        log.debug('scrawlOnce: crawler done.');
    }).catch(e => {
        log.debug('scrawlOnce: crawler quit with error: ', e);
    });
}

async function downloadData() {
    log.debug('downloadData:');

    const { db } = require('./db');
    const workbook = XLSX.utils.book_new();
    const tables = ['campaigns_log', 'adgroups_log', 'keywords_log'];

    for ( const name of tables ) {
        const data = await db[name].toArray();
        const sheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, sheet, name);
    }

    const timeStr = moment().format('YYYY-MM-DD_hh-mm-ss');
    XLSX.writeFile(workbook, `AntCrawler_${timeStr}.xls`)
}

function clearData() {
    const DB = require('./db');
    DB.clear();
}

function startDownloadScheduler() {
    const text = GM_config.get('downloadScheduleText') || 'at 23:58';
    log.debug('startDownloadScheduler: text:', text);
    try {
        const sched = later.parse.text(text);
        later.setInterval(downloadData, sched);
        log.debug('startDownloadScheduler: next 10 occurences: ', later.schedule(sched).next(10));
    } catch (e) {
        log.error(e);
        alert('定时器配置错误，请重新配置');
    }
}

let crawlerScheduler = null;
let currRunningCrawler = null;

window.onload = async () => {
    setupConfig();
    later.date.localTime();

    // top window
    if (window.top == window.self) {

        log.debug('top window');
        // 初始化

        // 启动下载数据的调度器
        startDownloadScheduler();

        // 恢复调度器
        schedulerSaver.restoreScrawlerScheduler(startCrawlerSchedulerByText);

        // 恢复之前未完成的爬取任务
        if (crawlerSaver.hasUnfinishedTask()) {
            log.debug(`restore Unfinished Crawler`);

            if (!loginOptions.needLogin()) {
                currRunningCrawler = createCrawler();
                crawlerSaver.restoreCrawler(currRunningCrawler);
            }
        }
    } else { // inner window
        log.debug('inner window');
        // 判断是否是登陆页面
        if (crawlerSaver.hasUnfinishedTask() && loginOptions.needLogin()) {
            log.debug(`login`);
            currRunningCrawler = createCrawler();
            await currRunningCrawler.login();
        }
    }


};