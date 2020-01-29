const DataFrame = dfjs.DataFrame;
const log = require('./logger');
const {
    concat2DArray,
    simplifyText,
    extractDataFromTable,
    getParameterFromUrl,
} = require('./helper');


async function parseData() {
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

    const campaignId = getParameterFromUrl(location.href, 'campaignId');
    dataFrame = dataFrame.withColumn('推广计划ID', () => campaignId);

    const adgroupID = getParameterFromUrl(location.href, 'adGroupId');
    dataFrame = dataFrame.withColumn('推广单元ID', () => adgroupID);

    const productId = getParameterFromUrl(location.href, 'productId');
    dataFrame = dataFrame.withColumn('宝贝ID', () => productId);

    const timeStr = moment().format('YYYY-MM-DD hh:mm:ss');
    dataFrame = dataFrame.withColumn('抓取时间', () => timeStr);

    const fetchSn = Date.now().toString();
    dataFrame = dataFrame.withColumn('Fetch SN', () => fetchSn);

    const shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
    dataFrame = dataFrame.withColumn('店铺名称', () => shopName);

    dataFrame.show();

    const { db } = require('./db');
    await db['keywords_log'].bulkPut(dataFrame.toCollection())

};

const KeywordsPage = {
    id: 'keywordsList',
    onPageReady: parseData,
    triggerOnUrl: (url) => {
        return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/adgroup\/detail)(.*)/);
    },
    getUrlsToAdd: () => [],
    isPageReady: () => $('.table-td .bp-table tr').length > 0,
}

module.exports = KeywordsPage;