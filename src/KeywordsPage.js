const DataFrame = dfjs.DataFrame;
const log = require('./logger');
const {
    concat2DArray,
    simplifyText,
    extractDataFromTable,
    getParameterFromUrl,
} = require('./helper');


class KeywordsPage {

    constructor() {
        this.findNewUrl = true;
        this.onDataFrameReady = this.saveData;
    }

    id = 'Keywords';

    onPageReady = async (fetchSN) => {
        const dataFrame = this.parseData(fetchSN);
        await this.onDataFrameReady(dataFrame);
    }

    triggerOnUrl = (url) => {
        return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/adgroup\/detail)(.*)/);
    };

    getUrlsToAdd = () => [];
    isPageReady = () => $('.table-td .bp-table tr').length > 0;

    saveData = async (dataFrame) => {
        const { db } = require('./db');
        await db['keywords_log'].bulkPut(dataFrame.toCollection())
        await db['headers'].put({ table_name: 'keywords_log', 'columns': dataFrame.listColumns() });
    }

    parseData = (fetchSN) => {
        const REMOVE_SIGN = '%TO_REMOVE%'
        const leftColumns = [`${REMOVE_SIGN}_1`, '状态', `${REMOVE_SIGN}_2`, '关键词'];
        const leftData = extractDataFromTable('.freeze-td table.bp-table', 'tr', 'td');
        let hasSmartLibrary = false;
        if (leftData.length > 0) {
            const row = leftData[0];
            const result = row[1].match(/(.*)(流量智选词包)/);
            if (result) {
                hasSmartLibrary = true;
                row[1] = result[1];
                row[3] = result[2];
            }
        }

        const rightHead = extractDataFromTable('table.bp-table.scroll-th', 'tr', 'th');
        // log.debug('rightHead:', rightHead);
        const rightColumns = rightHead[0]
        const columnsToReplace = ['质量分（PC）', '质量分（移动）', '排名（PC）', '排名（移动）', '出价（PC）', '出价（移动）'];
        rightColumns.splice(0, columnsToReplace.length, ...columnsToReplace);

        const rightData = extractDataFromTable('.table-td .bp-table', 'tr', 'td');

        const columns = leftColumns.concat(rightColumns);
        const data = concat2DArray(leftData, rightData);

        let dataFrame = new DataFrame(data, columns);
        dataFrame = dataFrame.restructure(columns.filter(col => !col.includes(REMOVE_SIGN)));

        dataFrame = dataFrame.withColumn('关键词', (row) => row.get('关键词').replace(/查看历史报表关键词全景图$/, ''));

        const campaignId = getParameterFromUrl(location.href, 'campaignId');
        dataFrame = dataFrame.withColumn('推广计划ID', () => campaignId);

        const adgroupID = getParameterFromUrl(location.href, 'adGroupId');
        dataFrame = dataFrame.withColumn('推广单元ID', () => adgroupID);

        const productUrl = $('article.box > a.imgcn80').attr('href');
        const productId = getParameterFromUrl(productUrl, 'id');
        dataFrame = dataFrame.withColumn('宝贝ID', () => productId);

        const timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
        dataFrame = dataFrame.withColumn('抓取时间', () => timeStr);

        dataFrame = dataFrame.withColumn('Fetch SN', () => fetchSN);

        const shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
        dataFrame = dataFrame.withColumn('店铺名称', () => shopName);

        dataFrame.show();

        return dataFrame;
    };
}

module.exports = KeywordsPage;