'use strict';

const log = require('./logger');
const { Crawler } = require('./crawler');
const { waitUntil } = require('./retry');
const later = require('later');

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


function createCrawler() {
    const options = {
        startPageURL: 'https://subway.simba.taobao.com/#!/manage/campaign/index',
        // startPageURL: 'https://subway.simba.taobao.com/#!/manage/campaign/detail?campaignId=40195486&start=2020-01-14&end=2020-01-14',
        minWait: (GM_config.get('minWait') || 3)*1000,
        maxWait: (GM_config.get('maxWait') || 5)*1000,
        gotoUrl: async (url) => { location.href = url },
        resourceList: [
            require('./CampaignsPage'),
            require('./AdgroupsPage'),
            require('./KeywordsPage'),
        ],
    }
    return new Crawler(options);
}



const menus = [
    {
        name: '启动定时抓取',
        fn: startScheduler,
        accessKey: 'start'
    },
    {
        name: '终止定时抓取',
        fn: endScheduler,
        accessKey: 'end'
    },
    {
        name: '抓取一次',
        fn: startScrawl,
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

function startScheduler(){
    if(timer){
        alert("爬虫正在进行中。请勿重复启动");
        return;
    }
    const text = GM_config.get('scrawlScheduleText') || 'at 23:50 also every 1 hour between 1 and 23';
    try{
        const sched = later.parse.text(text);
        timer = later.setInterval(startScrawl, sched);
        log.debug('startScheduler: next 24 occurences: ', later.schedule(sched).next(24));
    }catch{
        alert('定时器配置错误，请重新配置');
    }
}

function endScheduler(){
    if(!timer){
        alert("定时器尚未启动.");
        return;
    }
    timer.clear();
    timer = null;
}

function startScrawl(){
    if(crawler){
        crawler.clear();
    }
    crawler = createCrawler();
    crawler.start().then(() => {
        log.debug('startScrawl: crawler done.');
    }).catch( e => {
        log.debug('startScrawl: crawler quit with error: ', e);
    });
}

function downloadData(){
    log.debug('downloadData:');
}

function clearData(){
    const { clear } = require('./db');
    clear();
}

function startDownloadScheduler(){
    const text = GM_config.get('downloadScheduleText') || 'at 23:58';
    log.debug('startDownloadScheduler: text:', text);
    try{
        const sched = later.parse.text(text);
        later.setInterval(downloadData, sched);
        log.debug('startDownloadScheduler: next 10 occurences: ', later.schedule(sched).next(10));
    }catch (e) {
        log.error(e);
        alert('定时器配置错误，请重新配置');
    }
}

let timer = null;
let crawler = null;

setupConfig();
later.date.localTime();
startDownloadScheduler();

