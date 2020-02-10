// ==UserScript==
// @name         Taobao Subway Crawler
// @version      0.2.1
// @author       zjh1943
// @description  This userscript can crawl taobao subway campaign data every one hour.
// @match        *.taobao.com/*
// @homePage     https://github.com/zjh1943/crawler-userscript
// @updateURL    https://openuserjs.org/meta/zjh1943/My_Script.meta.js
// @license      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @copyright    2020, zjh1943
// @run-at       document-idle
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.slim.min.js
// @require      https://gmousse.github.io/dataframe-js/dist/dataframe.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/dexie/2.0.4/dexie.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.15.5/xlsx.full.min.js
// @require      https://unpkg.com/later2@2.0.1/later.min.js
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

/*{%code%}*/