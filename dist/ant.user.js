// ==UserScript==
// @name         Taobao Subway Crawler
// @namespace    http://tampermonkey.net/
// @version      0.1.580717208
// @description  try to take over the world!
// @author       You
// @match        *.taobao.com/*
// @run-at       document-idle
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @require      http://code.jquery.com/jquery-3.4.1.slim.min.js
// @require      https://gmousse.github.io/dataframe-js/dist/dataframe.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/dexie/2.0.4/dexie.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.15.5/xlsx.full.min.js
// @require      http://res.bookbook.pub/js/later/1.2.0/later.min.js
// @grant             unsafeWindow
// @grant             GM_xmlhttpRequest
// @grant             GM_setClipboard
// @grant             GM_setValue
// @grant             GM_getValue
// @grant             GM_deleteValue
// @grant             GM_openInTab
// @grant             GM_registerMenuCommand
// @grant             GM_unregisterMenuCommand
// ==/UserScript==

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var DataFrame = dfjs.DataFrame;

var _require = require('./helper'),
    createUrlGetter = _require.createUrlGetter,
    extractDataAndSimplify = _require.extractDataAndSimplify,
    simplifyText = _require.simplifyText,
    extractDataFromTable = _require.extractDataFromTable,
    getParameterFromUrl = _require.getParameterFromUrl;

var anchorFilter = function anchorFilter(ele) {
  /** 暂停状态，不抓取 */
  return $(ele).closest('tr').find('td span strong:contains("暂停")').length <= 0;
};

var AdgroupsPage = function AdgroupsPage() {
  var _this = this;

  _classCallCheck(this, AdgroupsPage);

  _defineProperty(this, "id", 'Adgroups');

  _defineProperty(this, "triggerOnUrl", function (url) {
    return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/campaign\/detail)(.*)/);
  });

  _defineProperty(this, "getUrlsToAdd", function () {
    return _this.findNewUrl ? createUrlGetter('a.ad-title', anchorFilter) : [];
  });

  _defineProperty(this, "isPageReady", function () {
    return $('a.ad-title').length > 0 && $('#bp-scroll-table tr th').length > 0;
  });

  _defineProperty(this, "onPageReady",
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee(fetchSN) {
      var dataFrame;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              dataFrame = _this.parseData(fetchSN);
              _context.next = 3;
              return _this.onDataFrameReady(dataFrame);

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());

  _defineProperty(this, "parseData", function (fetchSN) {
    var head = extractDataAndSimplify('#bp-scroll-table', 'tr', 'th');
    var columns = head[0].map(function (v) {
      if (v.startsWith('状态')) return '状态';else if (v.startsWith('营销场景')) return '营销场景';else return v;
    });

    var dataExtractor = function dataExtractor(ele) {
      var text = '';

      if ($(ele).find('.ad-title').length > 0) {
        text = $(ele).find('.ad-title').text();
      } else {
        text = $(ele).text();
      }

      return simplifyText(text);
    };

    var data = extractDataFromTable('table.bp-table[bx-name="table"]', 'tr', 'td', dataExtractor);
    var dataFrame = new DataFrame(data, columns);
    dataFrame = dataFrame.restructure(columns.filter(function (col) {
      return !!col;
    }));
    var urls = $.map($('a.ad-title'), function (value) {
      return $(value).attr('href');
    });
    var campaignIds = urls.map(function (v) {
      return getParameterFromUrl(v, 'campaignId');
    });
    dataFrame = dataFrame.withColumn('推广计划ID', function (_, index) {
      return campaignIds[index];
    });
    var adgroupIds = urls.map(function (v) {
      return getParameterFromUrl(v, 'adGroupId');
    });
    dataFrame = dataFrame.withColumn('推广单元ID', function (_, index) {
      return adgroupIds[index];
    });
    var productIds = urls.map(function (v) {
      return getParameterFromUrl(v, 'productId');
    });
    dataFrame = dataFrame.withColumn('宝贝ID', function (_, index) {
      return productIds[index];
    });
    var timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
    dataFrame = dataFrame.withColumn('抓取时间', function () {
      return timeStr;
    });
    dataFrame = dataFrame.withColumn('Fetch SN', function () {
      return fetchSN;
    });
    var shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
    dataFrame = dataFrame.withColumn('店铺名称', function () {
      return shopName;
    });
    dataFrame.show();
    return dataFrame;
  });

  _defineProperty(this, "saveData",
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee2(dataFrame) {
      var _require2, db;

      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _require2 = require('./db'), db = _require2.db;
              _context2.next = 3;
              return db['adgroups_log'].bulkPut(dataFrame.toCollection());

            case 3:
              _context2.next = 5;
              return db['headers'].put({
                table_name: 'adgroups_log',
                'columns': dataFrame.listColumns()
              });

            case 5:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }());

  this.findNewUrl = true;
  this.onDataFrameReady = this.saveData;
};

;
module.exports = AdgroupsPage;

},{"./db":7,"./helper":8}],2:[function(require,module,exports){
"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var DataFrame = dfjs.DataFrame;

var _require = require('./helper'),
    createUrlGetter = _require.createUrlGetter,
    extractDataAndSimplify = _require.extractDataAndSimplify,
    concat2DArray = _require.concat2DArray,
    getParameterFromUrl = _require.getParameterFromUrl;

var log = require('./logger');

var anchorFilter = function anchorFilter(ele) {
  /** 暂停状态，不抓取 */
  return $(ele).closest('tr').find('span.status-0').length <= 0;
};

var CampaignsPage = function CampaignsPage() {
  var _this = this;

  _classCallCheck(this, CampaignsPage);

  _defineProperty(this, "id", 'Campaigns');

  _defineProperty(this, "onPageReady",
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee(fetchSN) {
      var dataFrame;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              dataFrame = _this.parseData(fetchSN);
              _context.next = 3;
              return _this.onDataFrameReady(dataFrame);

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());

  _defineProperty(this, "triggerOnUrl", function (url) {
    return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/campaign\/index)(.*)/);
  });

  _defineProperty(this, "getUrlsToAdd", function () {
    return _this.findNewUrl ? createUrlGetter('.manage-common-table-container div.editor-content a', anchorFilter)() : [];
  });

  _defineProperty(this, "isPageReady", function () {
    var ret = $('.manage-common-table-container div.editor-content a').length > 0;
    log.debug('isPageReady:', ret);
    return ret;
  });

  _defineProperty(this, "saveData",
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee2(dataFrame) {
      var _require2, db;

      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _require2 = require('./db'), db = _require2.db;
              _context2.next = 3;
              return db['campaigns_log'].bulkPut(dataFrame.toCollection());

            case 3:
              _context2.next = 5;
              return db['headers'].put({
                table_name: 'campaigns_log',
                'columns': dataFrame.listColumns()
              });

            case 5:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }());

  _defineProperty(this, "parseData", function (fetchSN) {
    var leftHead = extractDataAndSimplify('table[left="true"] thead', 'tr', 'th');
    var leftData = extractDataAndSimplify('table[left="true"] tbody', 'tr[mxv]');
    var rightHead = extractDataAndSimplify('table[center="true"] thead', 'tr', 'th');
    var rightData = extractDataAndSimplify('table[center="true"] tbody', 'tr:not(.operation-tr):not(:last-of-type)', 'td');
    var columns = concat2DArray(leftHead, rightHead)[0];
    var data = concat2DArray(leftData, rightData);
    var dataFrame = new DataFrame(data, columns);
    dataFrame = dataFrame.restructure(columns.filter(function (col) {
      return !!col;
    }));
    var urls = $.map($('table[left="true"] tbody tr[mxv] .editor a'), function (value) {
      return $(value).attr('href');
    });
    var campaignIds = urls.map(function (v) {
      return getParameterFromUrl(v, 'campaignId');
    });
    dataFrame = dataFrame.withColumn('推广计划ID', function (_, index) {
      return campaignIds[index];
    });
    var timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
    dataFrame = dataFrame.withColumn('抓取时间', function () {
      return timeStr;
    });
    dataFrame = dataFrame.withColumn('Fetch SN', function () {
      return fetchSN;
    });
    var shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
    dataFrame = dataFrame.withColumn('店铺名称', function () {
      return shopName;
    });
    dataFrame.show();
    return dataFrame;
  });

  this.findNewUrl = true;
  this.onDataFrameReady = this.saveData;
};

module.exports = CampaignsPage;

},{"./db":7,"./helper":8,"./logger":10}],3:[function(require,module,exports){
"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var DataFrame = dfjs.DataFrame;

var log = require('./logger');

var _require = require('./helper'),
    concat2DArray = _require.concat2DArray,
    simplifyText = _require.simplifyText,
    extractDataFromTable = _require.extractDataFromTable,
    getParameterFromUrl = _require.getParameterFromUrl;

var KeywordsPage = function KeywordsPage() {
  var _this = this;

  _classCallCheck(this, KeywordsPage);

  _defineProperty(this, "id", 'Keywords');

  _defineProperty(this, "onPageReady",
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee(fetchSN) {
      var dataFrame;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              dataFrame = _this.parseData(fetchSN);
              _context.next = 3;
              return _this.onDataFrameReady(dataFrame);

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());

  _defineProperty(this, "triggerOnUrl", function (url) {
    return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/adgroup\/detail)(.*)/);
  });

  _defineProperty(this, "getUrlsToAdd", function () {
    return [];
  });

  _defineProperty(this, "isPageReady", function () {
    return $('.table-td .bp-table tr').length > 0;
  });

  _defineProperty(this, "saveData",
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee2(dataFrame) {
      var _require2, db;

      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _require2 = require('./db'), db = _require2.db;
              _context2.next = 3;
              return db['keywords_log'].bulkPut(dataFrame.toCollection());

            case 3:
              _context2.next = 5;
              return db['headers'].put({
                table_name: 'keywords_log',
                'columns': dataFrame.listColumns()
              });

            case 5:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }());

  _defineProperty(this, "parseData", function (fetchSN) {
    var REMOVE_SIGN = '%TO_REMOVE%';
    var leftColumns = ["".concat(REMOVE_SIGN, "_1"), '状态', "".concat(REMOVE_SIGN, "_2"), '关键词'];
    var leftData = extractDataFromTable('.freeze-td table.bp-table', 'tr', 'td');
    var hasSmartLibrary = false;

    if (leftData.length > 0) {
      var row = leftData[0];
      var result = row[1].match(/(.*)(流量智选词包)/);

      if (result) {
        hasSmartLibrary = true;
        row[1] = result[1];
        row[3] = result[2];
      }
    }

    var rightHead = extractDataFromTable('table.bp-table.scroll-th', 'tr', 'th'); // log.debug('rightHead:', rightHead);

    var rightColumns = rightHead[0];
    var columnsToReplace = ['质量分（PC）', '质量分（移动）', '排名（PC）', '排名（移动）', '出价（PC）', '出价（移动）'];
    rightColumns.splice.apply(rightColumns, [0, columnsToReplace.length].concat(columnsToReplace));
    var rightData = extractDataFromTable('.table-td .bp-table', 'tr', 'td');
    var columns = leftColumns.concat(rightColumns);
    var data = concat2DArray(leftData, rightData);
    var dataFrame = new DataFrame(data, columns);
    dataFrame = dataFrame.restructure(columns.filter(function (col) {
      return !col.includes(REMOVE_SIGN);
    }));
    var campaignId = getParameterFromUrl(location.href, 'campaignId');
    dataFrame = dataFrame.withColumn('推广计划ID', function () {
      return campaignId;
    });
    var adgroupID = getParameterFromUrl(location.href, 'adGroupId');
    dataFrame = dataFrame.withColumn('推广单元ID', function () {
      return adgroupID;
    });
    var productId = getParameterFromUrl(location.href, 'productId');
    dataFrame = dataFrame.withColumn('宝贝ID', function () {
      return productId;
    });
    var timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
    dataFrame = dataFrame.withColumn('抓取时间', function () {
      return timeStr;
    });
    dataFrame = dataFrame.withColumn('Fetch SN', function () {
      return fetchSN;
    });
    var shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
    dataFrame = dataFrame.withColumn('店铺名称', function () {
      return shopName;
    });
    dataFrame.show();
    return dataFrame;
  });

  this.findNewUrl = true;
  this.onDataFrameReady = this.saveData;
};

module.exports = KeywordsPage;

},{"./db":7,"./helper":8,"./logger":10}],4:[function(require,module,exports){
"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require('./retry'),
    check = _require.check,
    retry = _require.retry,
    waitUntil = _require.waitUntil;

var log = require('./logger');

var Page =
/*#__PURE__*/
function () {
  function Page() {
    _classCallCheck(this, Page);

    _defineProperty(this, "id", '');
  }

  _createClass(Page, [{
    key: "triggerOnUrl",
    value: function triggerOnUrl(url) {
      return false;
    }
  }, {
    key: "isPageReady",
    value: function isPageReady() {
      return false;
    }
  }, {
    key: "onPageReady",
    value: function onPageReady() {
      return true;
    }
  }, {
    key: "getUrlsToAdd",
    value: function getUrlsToAdd() {
      return [];
    }
  }]);

  return Page;
}();
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


var Crawler =
/**
 * @type {CrawlerOption}
 */
// 每启动一次 crawler，将分配一个新的 SN，作为此次抓取的唯一标识符。
// 将要抓取的 URL
// 正在抓取的 URL

/**
 * @param {CrawlerOption} options
 */
function Crawler(options) {
  var _this = this;

  _classCallCheck(this, Crawler);

  _defineProperty(this, "options", _defineProperty({
    startPageURL: '',
    pageList: [],
    maxWait: 10000,
    retryCount: 3,
    operateInterval: 1000,
    minWait: 3000
  }, "maxWait", 8000));

  _defineProperty(this, "fetchSN", new Date().getTime());

  _defineProperty(this, "urlList", []);

  _defineProperty(this, "currUrl", null);

  _defineProperty(this, "crawledUrlSet", new Set());

  _defineProperty(this, "isCrawling", false);

  _defineProperty(this, "isPause", false);

  _defineProperty(this, "isToBeClear", false);

  _defineProperty(this, "clear", function () {
    _this.urlList = [];

    _this.crawledUrlSet.clear();

    _this.isPause = false;
    _this.isCrawling = false;
    _this.isToBeClear = true;
  });

  _defineProperty(this, "start",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            log.debug('_start', _this.urlList);
            _this.urlList = [_this.options.startPageURL];
            _this.isPause = false;
            _this.isToBeClear = false;
            _this.isCrawling = true;
            _this.fetchSN = new Date().getTime();
            return _context.abrupt("return", _this._start());

          case 7:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })));

  _defineProperty(this, "restoreFromSavedState",
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee2(urlList, crawledUrlSet) {
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _this.urlList = urlList;
              _this.crawledUrlSet = crawledUrlSet;
              _this.isCrawling = true;
              _this.isPause = false;
              _this.isToBeClear = false;
              _this.fetchSN = new Date().getTime();
              return _context2.abrupt("return", _this._start());

            case 7:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x, _x2) {
      return _ref2.apply(this, arguments);
    };
  }());

  _defineProperty(this, "pause", function () {
    log.debug('_pause: this.urlList:', _this.urlList);
    _this.isPause = true;
  });

  _defineProperty(this, "resume",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3() {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            log.debug('_resume: this.urlList:', _this.urlList);
            _this.isPause = false;
            return _context3.abrupt("return", _this._start());

          case 3:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  })));

  _defineProperty(this, "_start",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4() {
    var _this$options, minWait, maxWait, onPageStart, onPageComplete, onCrawlComplete, timeToWait, url;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            log.debug('_start: begin. this.urlList:', _this.urlList);
            _this$options = _this.options, minWait = _this$options.minWait, maxWait = _this$options.maxWait, onPageStart = _this$options.onPageStart, onPageComplete = _this$options.onPageComplete, onCrawlComplete = _this$options.onCrawlComplete;
            timeToWait = Math.floor(Math.random() * (maxWait - minWait)) + minWait;

            if (!(_this.urlList.length > 0)) {
              _context4.next = 11;
              break;
            }

            url = _this.urlList.splice(0, 1)[0];
            _this.currUrl = url;

            _this.crawledUrlSet.add(url);

            if (onPageStart) onPageStart(url);
            return _context4.abrupt("return", _this._crawlPage(url)["catch"](function (reason) {
              /** 如果中间失败了，还是继续下一波，不要影响下一条任务 */
              log.error('_start: crawl page fail:', url, ', reason:', reason);
            }).then(function () {
              return new Promise(function (resolve, _) {
                _this.currUrl = null;
                if (onPageComplete) onPageComplete(url);
                log.debug('_stat: wait time = ', timeToWait);
                setTimeout(resolve, timeToWait);
              });
            }).then(function () {
              if (_this.isToBeClear) {
                if (onCrawlComplete) onCrawlComplete();
                return Promise.reject(Crawler.QUIT_REASON_CLEAR);
              } else if (_this.isPause) {
                return Promise.reject(Crawler.QUIT_REASON_PAUSE);
              } else {
                return _this._start();
              }
            }));

          case 11:
            _this.isCrawling = false;
            if (onCrawlComplete) onCrawlComplete();

          case 13:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  })));

  _defineProperty(this, "_openPageOnce",
  /*#__PURE__*/
  function () {
    var _ref5 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee5(url, isPageReady) {
      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              log.debug('_openPageOnce:', url);
              return _context5.abrupt("return", _this.options.gotoUrl(url).then(function () {
                return waitUntil(isPageReady, _this.options.maxWait);
              }));

            case 2:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5);
    }));

    return function (_x3, _x4) {
      return _ref5.apply(this, arguments);
    };
  }());

  _defineProperty(this, "_runFunctionAndLoginIfNeed",
  /*#__PURE__*/
  function () {
    var _ref6 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee6(fn) {
      var _len,
          args,
          _key,
          login,
          needLogin,
          _args6 = arguments;

      return regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              for (_len = _args6.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = _args6[_key];
              }

              login = _this.options.login;

              if (login) {
                _context6.next = 4;
                break;
              }

              return _context6.abrupt("return", fn.apply(void 0, args));

            case 4:
              needLogin = login.needLogin;
              return _context6.abrupt("return", fn.apply(void 0, args)["catch"](function () {
                if (needLogin()) {
                  return _this.login().then(function () {
                    return fn.apply(void 0, args);
                  });
                } else {
                  return Promise.reject();
                }
              }));

            case 6:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6);
    }));

    return function (_x5) {
      return _ref6.apply(this, arguments);
    };
  }());

  _defineProperty(this, "_openPageAndLoginIfNeed",
  /*#__PURE__*/
  function () {
    var _ref7 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee8(url) {
      var pageList, page, isPageReady, onPageReady, getUrlsToAdd;
      return regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              log.debug('_openPageAndLoginIfNeed: ', url);
              pageList = _this.options.pageList;
              page = pageList.find(function (r) {
                return r.triggerOnUrl(url);
              });
              isPageReady = page.isPageReady, onPageReady = page.onPageReady, getUrlsToAdd = page.getUrlsToAdd;
              return _context8.abrupt("return", _this._runFunctionAndLoginIfNeed(_this._openPageOnce, url, isPageReady).then(
              /*#__PURE__*/
              _asyncToGenerator(
              /*#__PURE__*/
              regeneratorRuntime.mark(function _callee7() {
                var newUrls;
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                  while (1) {
                    switch (_context7.prev = _context7.next) {
                      case 0:
                        _context7.next = 2;
                        return onPageReady(_this.fetchSN);

                      case 2:
                        newUrls = getUrlsToAdd().filter(function (u) {
                          return !_this.crawledUrlSet.has(u);
                        });
                        log.debug('_openPageAndLoginIfNeed. newUrls:', newUrls);
                        _this.urlList = _this.urlList.concat(newUrls);

                      case 5:
                      case "end":
                        return _context7.stop();
                    }
                  }
                }, _callee7);
              }))));

            case 5:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8);
    }));

    return function (_x6) {
      return _ref7.apply(this, arguments);
    };
  }());

  _defineProperty(this, "_crawlPage",
  /*#__PURE__*/
  function () {
    var _ref9 = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee9(url) {
      var retryCount;
      return regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              log.debug('_crawlPage: ', url);
              retryCount = _this.options.retryCount;
              return _context9.abrupt("return", retry(function () {
                return _this._openPageAndLoginIfNeed(url);
              }, retryCount));

            case 3:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9);
    }));

    return function (_x7) {
      return _ref9.apply(this, arguments);
    };
  }());

  _defineProperty(this, "login",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee10() {
    var _this$options2, login, maxWait, loginPageURL, isLoginPageReady, isLoginSuccess, doLogin, p;

    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            log.debug('login');
            _this$options2 = _this.options, login = _this$options2.login, maxWait = _this$options2.maxWait;

            if (login) {
              _context10.next = 6;
              break;
            }

            return _context10.abrupt("return");

          case 6:
            loginPageURL = login.loginPageURL, isLoginPageReady = login.isLoginPageReady, isLoginSuccess = login.isLoginSuccess, doLogin = login.doLogin;
            p = null;

            if (isLoginPageReady()) {
              log.debug('login: isLoginPageReady.');
              p = doLogin();
            } else {
              log.debug('login: needReload');
              p = _this._openPageOnce(loginPageURL, isLoginPageReady).then(doLogin);
            }

            return _context10.abrupt("return", p.then(function () {
              return waitUntil(isLoginSuccess, maxWait);
            }));

          case 10:
          case "end":
            return _context10.stop();
        }
      }
    }, _callee10);
  })));

  for (var key in options) {
    this.options[key] = options[key];
  }
};

_defineProperty(Crawler, "QUIT_REASON_CLEAR", 'quit_reason_clear');

_defineProperty(Crawler, "QUIT_REASON_PAUSE", 'quit_reason_pause');

module.exports = {
  Crawler: Crawler,
  Page: Page
};

},{"./logger":10,"./retry":11}],5:[function(require,module,exports){
"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var log = require('./logger');

var KEY_CRAWLER_STATE = 'key_crawler_state';

function saveCrawler(crawler) {
  GM_setValue(KEY_CRAWLER_STATE, JSON.stringify({
    isCrawling: crawler.isCrawling,
    currUrl: crawler.currUrl,
    urlList: crawler.urlList,
    crawledUrls: _toConsumableArray(crawler.crawledUrlSet)
  }));
}

function hasUnfinishedTask() {
  var state = JSON.parse(GM_getValue(KEY_CRAWLER_STATE, null));
  log.debug("hasUnfinishedTask. state = ", state);
  return state && state.isCrawling;
}

function restoreCrawler(crawler) {
  var state = JSON.parse(GM_getValue(KEY_CRAWLER_STATE, null));
  log.debug("restoreCrawler. state = ", state);
  var urlList = state.urlList,
      currUrl = state.currUrl,
      crawledUrls = state.crawledUrls;
  var crawledUrlSet = new Set(crawledUrls);

  if (currUrl) {
    urlList.splice(0, 0, currUrl);
    crawledUrlSet["delete"](currUrl);
  }

  return crawler.restoreFromSavedState(urlList, crawledUrlSet);
}

function clearCrawler() {
  GM_deleteValue(KEY_CRAWLER_STATE);
}

module.exports = {
  saveCrawler: saveCrawler,
  clearCrawler: clearCrawler,
  hasUnfinishedTask: hasUnfinishedTask,
  restoreCrawler: restoreCrawler
};

},{"./logger":10}],6:[function(require,module,exports){
"use strict";

var log = require('./logger');

var KEY_CRAWLER_SCHEDULER = 'key_crawler_scheduler'; // === scheduler 存储和恢复 === 

function saveCrawlerScheduler(text) {
  GM_setValue(KEY_CRAWLER_SCHEDULER, text);
}

function clearCrawlerScheduler() {
  GM_deleteValue(KEY_CRAWLER_SCHEDULER);
}

function restoreScrawlerScheduler(startCrawlerSchedulerByText) {
  var text = GM_getValue(KEY_CRAWLER_SCHEDULER);
  log.debug("restoreScrawlerScheduler. text = ".concat(text, " "));

  if (text) {
    startCrawlerSchedulerByText(text);
  }
} // === scheduler 存储和恢复 === 


module.exports = {
  saveCrawlerScheduler: saveCrawlerScheduler,
  clearCrawlerScheduler: clearCrawlerScheduler,
  restoreScrawlerScheduler: restoreScrawlerScheduler
};

},{"./logger":10}],7:[function(require,module,exports){
"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var db = new Dexie('ant_log');

function initSchema() {
  db.version(1).stores({
    'campaigns_log': '++,推广计划ID',
    'adgroups_log': '++,推广计划ID,推广单元ID',
    'keywords_log': '++,推广计划ID,推广单元ID,关键词'
  });
  db.version(2).stores({
    'campaigns_log': '++,推广计划ID',
    'adgroups_log': '++,推广计划ID,推广单元ID',
    'keywords_log': '++,推广计划ID,推广单元ID,关键词',
    'headers': '&table_name'
  });
}

function clear() {
  return _clear.apply(this, arguments);
}

function _clear() {
  _clear = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return db['campaigns_log'].clear();

          case 2:
            _context.next = 4;
            return db['adgroups_log'].clear();

          case 4:
            _context.next = 6;
            return db['keywords_log'].clear();

          case 6:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _clear.apply(this, arguments);
}

initSchema();
module.exports = {
  db: db,
  clear: clear,
  initSchema: initSchema
};

},{}],8:[function(require,module,exports){
"use strict";

var createUrlGetter = function createUrlGetter(cssSelector) {
  var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  return function () {
    var list = [];
    var queryList = $(cssSelector);
    queryList.each(function () {
      if (filter && !filter(this)) return;
      var url = $(this).attr('href');
      if (!url) return;

      if (url.startsWith('#')) {
        list.push('https://subway.simba.taobao.com/' + url);
      } else if (url.startsWith('https')) {
        list.push(url);
      }
    });
    return list;
  };
};

function extractDataFromTable(table) {
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'tr';
  var cell = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'td';
  var textExtractor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
  var ret = [];
  $(table).find(row).each(function () {
    var row = [];
    $(this).find(cell).each(function () {
      textExtractor = textExtractor || function (ele) {
        return simplifyText($(ele).text());
      };

      row.push(textExtractor(this));
    });
    ret.push(row);
  });
  return ret;
}

function simplifyText(str) {
  var ret = str || '';
  ret = ret.replace(/[\s\r\n\t\ue000-\uffff]|(󰅂)|(Ũ)/g, '');
  ret = ret.trim();
  return ret;
}

function extractDataAndSimplify(table) {
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'tr';
  var cell = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'td';
  return extractDataFromTable(table, row, cell);
}

function concat2DArray(left, right) {
  return left.map(function (value, index) {
    return value.concat(right[index]);
  });
}

function getParameterFromUrl(url, name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  return results == null ? null : results[1];
}

function downloadXls(data, fileName) {
  var hiddenElement = document.createElement('a');
  hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
  hiddenElement.target = '_blank';
  hiddenElement.download = 'people.csv';
  hiddenElement.click();
}

module.exports = {
  createUrlGetter: createUrlGetter,
  extractDataFromTable: extractDataFromTable,
  simplifyText: simplifyText,
  extractDataAndSimplify: extractDataAndSimplify,
  concat2DArray: concat2DArray,
  getParameterFromUrl: getParameterFromUrl
};

},{}],9:[function(require,module,exports){
'use strict';

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var DataFrame = dfjs.DataFrame;

var log = require('./logger');

var _require = require('./crawler'),
    Crawler = _require.Crawler;

var _require2 = require('./retry'),
    delayDo = _require2.delayDo;

var crawlerSaver = require('./crawlerSaver');

var schedulerSaver = require('./crawlerSchedulerSaver');

function initConfigPannel() {
  GM_config.init({
    'id': 'Taobao_Crawler_Config',
    'fields': {
      hidden1: {
        section: ['操作等待时间', '每加载一个网页后，等待一些时间，防止访问过快而被淘宝官方察觉.'],
        type: 'hidden'
      },
      'minWait': {
        'label': '最少等待时间（秒）',
        'type': 'int',
        'default': '3'
      },
      'maxWait': {
        'label': '最长等待时间（秒）',
        'type': 'int',
        'default': '5'
      },
      hidden2: {
        'section': ['定时器配置', '配置方法请参考这里：<a href="https://bunkat.github.io/later/parsers.html#text" target=”_blank”>配置帮助</a>'],
        type: 'hidden'
      },
      'scrawlScheduleText': {
        'label': '抓取定时器配置',
        'type': 'text',
        'default': 'at 23:50 also every 1 hour between 1 and 23'
      },
      'downloadScheduleText': {
        'label': '下载定时器配置',
        'type': 'text',
        'default': 'at 23:58'
      },
      hidden3: {
        'section': ['淘宝账户配置', '当登陆状态实效时，需要重新登陆。'],
        type: 'hidden'
      },
      'taobaoAccount': {
        'label': '直通车账户',
        'type': 'text',
        'default': ''
      },
      'taobaoPWD': {
        'label': '直通车密码',
        'type': 'text',
        'default': ''
      }
    }
  });
}

var loginOptions = {
  loginPageURL: 'https://subway.simba.taobao.com/indexnew.jsp',
  // mx-view="common-home/views/pages/home/login"
  needLogin: function needLogin() {
    var mainWindow = $('div.home-body iframe').length > 0;
    var subWindow = $('#J_LoginBox .bd').length > 0;

    if (subWindow) {
      subWindow = $('#J_LoginBox .bd').css('display') !== 'none';
    }

    return mainWindow || subWindow;
  },
  isLoginPageReady: function isLoginPageReady() {
    return true;
  },
  isLoginSuccess: function isLoginSuccess() {
    return $('#J_LoginBox .bd').css('display') === 'none';
  },
  doLogin: function () {
    var _doLogin = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee() {
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return delayDo(function () {
                var account = GM_config.get('taobaoAccount');
                log.debug('doLogin. type account: ', account);
                $('#J_StaticForm input#TPL_username_1').val(account);
              }, 1000);

            case 2:
              _context.next = 4;
              return delayDo(function () {
                var pwd = GM_config.get('taobaoPWD');
                log.debug('doLogin. type pwd: ', pwd);
                $('#J_StaticForm input#TPL_password_1').val(pwd);
              }, 1000);

            case 4:
              _context.next = 6;
              return delayDo(function () {
                log.debug('doLogin. submit');
                $('button#J_SubmitStatic').click();
              }, 2000);

            case 6:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    function doLogin() {
      return _doLogin.apply(this, arguments);
    }

    return doLogin;
  }()
};

function createCrawlerOptions() {
  var KeywordsPage = require('./KeywordsPage');

  var CampaignsPage = require('./CampaignsPage');

  var AdgroupsPage = require('./AdgroupsPage');

  var options = {
    startPageURL: 'https://subway.simba.taobao.com/#!/manage/campaign/index',
    // startPageURL: 'https://subway.simba.taobao.com/#!/manage/campaign/detail?campaignId=40195486&start=2020-01-14&end=2020-01-14',
    minWait: (GM_config.get('minWait') || 3) * 1000,
    maxWait: (GM_config.get('maxWait') || 5) * 1000,
    gotoUrl: function () {
      var _gotoUrl = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2(url) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                log.debug('gotoUrl:', url);
                location.href = url;

              case 2:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      function gotoUrl(_x) {
        return _gotoUrl.apply(this, arguments);
      }

      return gotoUrl;
    }(),
    pageList: [new CampaignsPage(), new AdgroupsPage(), new KeywordsPage()],
    login: loginOptions,
    onPageStart: function onPageStart() {
      crawlerSaver.saveCrawler(currRunningCrawler);
    },
    onCrawlComplete: function onCrawlComplete() {
      crawlerSaver.clearCrawler();
    }
  };
  return options;
}

function createDefaultCrawler() {
  var options = createCrawlerOptions();
  return new Crawler(options);
}

function createOnePageCrawler() {
  var options = createCrawlerOptions();
  var pageList = options.pageList;
  var url = window.location.href;
  var newPageList = pageList.filter(function (p) {
    return p.triggerOnUrl(url);
  });
  newPageList.forEach(function (p) {
    log.debug('createOnePageCrawler: id = ', p.id);
    p.findNewUrl = false;

    p.onDataFrameReady =
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee3(dataFrame) {
        var workbook, data, option, sheet, timeStr, prefix;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                workbook = XLSX.utils.book_new();
                data = dataFrame.toCollection(); // const header = await db['headers'].where({ 'table_name': tableName }).first();

                option = undefined; // header ? { header } : undefined;

                sheet = XLSX.utils.json_to_sheet(data, option);
                XLSX.utils.book_append_sheet(workbook, sheet, p.id);
                timeStr = moment().format('YYYY-MM-DD_hh-mm-ss');
                prefix = p.id;
                XLSX.writeFile(workbook, "".concat(prefix, "_").concat(timeStr, ".xls"));

              case 8:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x2) {
        return _ref.apply(this, arguments);
      };
    }();
  });
  options.pageList = newPageList;
  options.startPageURL = url;

  options.onPageStart = function () {};

  options.onCrawlComplete = function () {};

  return new Crawler(options);
}

function crawlCurrPage() {
  var crawler = createOnePageCrawler();
  crawler.start();
}

var GMMenus = [{
  name: '启动定时抓取',
  fn: startCrawlerScheduler,
  accessKey: 'start'
}, {
  name: '终止定时抓取',
  fn: stopCrawlerScheduler,
  accessKey: 'end'
}, {
  name: '仅抓取一次',
  fn: scrawlOnce,
  accessKey: 'once'
}, {
  name: '仅抓取此页',
  fn: crawlCurrPage,
  accessKey: 'curr'
}, {
  name: '下载缓存的数据',
  fn: downloadData,
  accessKey: 'download'
}, {
  name: '清空缓存的数据',
  fn: clearData,
  accessKey: 'clear'
}, {
  name: '爬虫配置',
  fn: function fn() {
    return GM_config.open();
  },
  accessKey: 'config'
}];
GMMenus.forEach(function (m) {
  GM_registerMenuCommand(m.name, m.fn, m.accessKey);
});

function startCrawlerSchedulerByText(text) {
  if (crawlerScheduler) {
    alert("爬虫正在进行中。请勿重复启动");
    return;
  }

  try {
    var sched = later.parse.text(text);
    schedulerSaver.saveCrawlerScheduler(text);
    crawlerScheduler = later.setInterval(scrawlOnce, sched);
    log.debug('startCrawlerScheduler: next 24 occurences: ', later.schedule(sched).next(24));
  } catch (_unused) {
    alert('定时器配置错误，请重新配置');
  }
}

function startCrawlerScheduler() {
  var text = GM_config.get('scrawlScheduleText') || 'at 23:50 also every 1 hour between 1 and 23';
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

  currRunningCrawler = createDefaultCrawler();
  currRunningCrawler.start().then(function () {
    log.debug('scrawlOnce: crawler done.');
  })["catch"](function (e) {
    log.debug('scrawlOnce: crawler quit with error: ', e);
  });
}

function downloadData() {
  return _downloadData.apply(this, arguments);
}

function _downloadData() {
  _downloadData = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee5() {
    var clearAfterDownload,
        _require3,
        db,
        clear,
        workbook,
        tables,
        _i,
        _tables,
        tableName,
        data,
        option,
        sheet,
        timeStr,
        prefix,
        _args5 = arguments;

    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            clearAfterDownload = _args5.length > 0 && _args5[0] !== undefined ? _args5[0] : false;
            log.debug('downloadData: tables: ', tables);
            _require3 = require('./db'), db = _require3.db, clear = _require3.clear;
            workbook = XLSX.utils.book_new();
            tables = ['campaigns_log', 'adgroups_log', 'keywords_log'];
            _i = 0, _tables = tables;

          case 6:
            if (!(_i < _tables.length)) {
              _context5.next = 17;
              break;
            }

            tableName = _tables[_i];
            _context5.next = 10;
            return db[tableName].toArray();

          case 10:
            data = _context5.sent;
            // const header = await db['headers'].where({ 'table_name': tableName }).first();
            option = undefined; // header ? { header } : undefined;

            sheet = XLSX.utils.json_to_sheet(data, option);
            XLSX.utils.book_append_sheet(workbook, sheet, tableName);

          case 14:
            _i++;
            _context5.next = 6;
            break;

          case 17:
            timeStr = moment().format('YYYY-MM-DD_hh-mm-ss');
            prefix = tables.length === 1 ? tables[0] : 'AntCrawler';
            XLSX.writeFile(workbook, "".concat(prefix, "_").concat(timeStr, ".xls"));

            if (!clearAfterDownload) {
              _context5.next = 23;
              break;
            }

            _context5.next = 23;
            return clear();

          case 23:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _downloadData.apply(this, arguments);
}

function clearData() {
  var DB = require('./db');

  DB.clear();
}

function startDownloadScheduler() {
  var text = GM_config.get('downloadScheduleText') || 'at 23:58';
  log.debug('startDownloadScheduler: text:', text);

  try {
    var sched = later.parse.text(text);
    later.setInterval(function () {
      return downloadData(true);
    }, sched);
    log.debug('startDownloadScheduler: next 10 occurences: ', later.schedule(sched).next(10));
  } catch (e) {
    log.error(e);
    alert('定时器配置错误，请重新配置');
  }
}

var crawlerScheduler = null;
var currRunningCrawler = null;
window.onload =
/*#__PURE__*/
_asyncToGenerator(
/*#__PURE__*/
regeneratorRuntime.mark(function _callee4() {
  return regeneratorRuntime.wrap(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          initConfigPannel();
          later.date.localTime(); // 在 Tampermonkey 中，一个网页有多个 frame，每个 frame 都满足 userscript 的触发条件时，会启动多个实例。
          // 在 Tampermonkey 中，不同源的 iframe ，很难进行直接操作。所以，必须分开在两个环境中进行。
          // top window

          if (!(window.top == window.self)) {
            _context4.next = 9;
            break;
          }

          log.debug('top window'); // 初始化
          // 启动下载数据的调度器

          startDownloadScheduler(); // 恢复调度器

          schedulerSaver.restoreScrawlerScheduler(startCrawlerSchedulerByText); // 恢复之前未完成的爬取任务

          if (crawlerSaver.hasUnfinishedTask()) {
            log.debug("restore Unfinished Crawler");

            if (!loginOptions.needLogin()) {
              currRunningCrawler = createDefaultCrawler();
              crawlerSaver.restoreCrawler(currRunningCrawler);
            }
          }

          _context4.next = 15;
          break;

        case 9:
          // inner window
          log.debug('inner window'); // 判断是否是登陆页面

          if (!(crawlerSaver.hasUnfinishedTask() && loginOptions.needLogin())) {
            _context4.next = 15;
            break;
          }

          log.debug("login");
          currRunningCrawler = createDefaultCrawler();
          _context4.next = 15;
          return currRunningCrawler.login();

        case 15:
        case "end":
          return _context4.stop();
      }
    }
  }, _callee4);
}));

},{"./AdgroupsPage":1,"./CampaignsPage":2,"./KeywordsPage":3,"./crawler":4,"./crawlerSaver":5,"./crawlerSchedulerSaver":6,"./db":7,"./logger":10,"./retry":11}],10:[function(require,module,exports){
"use strict";

var createLog = function createLog(fn) {
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return fn.apply(void 0, ["[ ==== ".concat(moment().format('YYYY-MM-DD HH:mm:ss'), " ==== ]")].concat(args));
  };
};

var log = {
  debug: createLog(console.log),
  log: createLog(console.log),
  trace: createLog(console.trace),
  info: createLog(console.info),
  warn: createLog(console.warn),
  error: createLog(console.error)
};
module.exports = log;

},{}],11:[function(require,module,exports){
"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var log = require('./logger');

function retry(_x) {
  return _retry.apply(this, arguments);
}

function _retry() {
  _retry = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(fn) {
    var count,
        interval,
        retriesLeft,
        _args = arguments;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            count = _args.length > 1 && _args[1] !== undefined ? _args[1] : 5;
            interval = _args.length > 2 && _args[2] !== undefined ? _args[2] : 1000;
            retriesLeft = count;
            return _context.abrupt("return", new Promise(function (resolve, reject) {
              fn().then(resolve)["catch"](function (error) {
                setTimeout(function () {
                  if (retriesLeft <= 1) {
                    // reject('maximum retries exceeded');
                    reject(error);
                  } else {
                    retry(fn, retriesLeft - 1, interval).then(resolve, reject);
                  } // Passing on "reject" is the important part

                }, interval);
              });
            }));

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _retry.apply(this, arguments);
}

function check(_x2) {
  return _check.apply(this, arguments);
}

function _check() {
  _check = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(fn) {
    var count,
        interval,
        _args2 = arguments;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            count = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : 5;
            interval = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : 1000;
            return _context2.abrupt("return", new Promise(function (resolve, reject) {
              var retryLeft = count;
              var timerID = setInterval(function () {
                log.debug('check: retryLeft:', retryLeft);

                if (fn()) {
                  clearInterval(timerID);
                  resolve();
                  return;
                }

                retryLeft--;

                if (retryLeft <= 0) {
                  clearInterval(timerID);
                  reject();
                }
              }, interval);
            }));

          case 3:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _check.apply(this, arguments);
}

function waitUntil(_x3) {
  return _waitUntil.apply(this, arguments);
}

function _waitUntil() {
  _waitUntil = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(fn) {
    var maxWait,
        interval,
        _args3 = arguments;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            maxWait = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : 10000;
            interval = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : 1000;
            return _context3.abrupt("return", check(fn, Math.ceil(maxWait / interval), interval));

          case 3:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _waitUntil.apply(this, arguments);
}

function delayDo(_x4) {
  return _delayDo.apply(this, arguments);
}

function _delayDo() {
  _delayDo = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4(fn) {
    var delay,
        _args4 = arguments;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            delay = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : 1000;
            return _context4.abrupt("return", new Promise(function (resolve, _) {
              setTimeout(function () {
                fn();
                resolve();
              }, delay);
            }));

          case 2:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _delayDo.apply(this, arguments);
}

module.exports = {
  retry: retry,
  check: check,
  waitUntil: waitUntil,
  delayDo: delayDo
};

},{"./logger":10}]},{},[9]);
