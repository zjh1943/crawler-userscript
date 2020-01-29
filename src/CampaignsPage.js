const DataFrame = dfjs.DataFrame;
const {
    createUrlGetter,
    extractDataAndSimplify,
    concat2DArray,
    getParameterFromUrl,
} = require('./helper');
const log = require('./logger');


async function parseCampaignList() {
    const leftHead = extractDataAndSimplify('table[left="true"] thead', 'tr', 'th');
    const leftData = extractDataAndSimplify('table[left="true"] tbody', 'tr[mxv]');

    const rightHead = extractDataAndSimplify('table[center="true"] thead', 'tr', 'th');
    const rightData = extractDataAndSimplify('table[center="true"] tbody', 'tr:not(.operation-tr):not(:last-of-type)', 'td');

    const columns = concat2DArray(leftHead, rightHead)[0];
    const data = concat2DArray(leftData, rightData);
    let dataFrame = new DataFrame(data, columns);
    dataFrame = dataFrame.restructure(columns.filter(col => !!col));

    const urls = $.map($('table[left="true"] tbody tr[mxv] .editor a'), value => $(value).attr('href'));
    const campaignIds = urls.map(v => getParameterFromUrl(v, 'campaignId'));
    dataFrame = dataFrame.withColumn('推广计划ID', (_, index) => campaignIds[index]);

    const timeStr = moment().format('yyyy-MM-DD hh:mm:ss');
    dataFrame = dataFrame.withColumn('抓取时间', () => timeStr);

    const fetchSn = Date.now().toString();
    dataFrame = dataFrame.withColumn('Fetch SN', () => fetchSn);

    const shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
    dataFrame = dataFrame.withColumn('店铺名称', () => shopName);

    dataFrame.show();

    const { db } = require('./db');
    await db['campaigns_log'].bulkPut(dataFrame.toCollection())

};

const anchorFilter = (ele) => {
    /** 暂停状态，不抓取 */
    return $(ele).closest('tr').find('span.status-0').length <= 0;
}

const CampaignsPage = {
    id: 'campaignList',
    triggerOnUrl: (url) => {
        return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/campaign\/index)(.*)/);
    },
    getUrlsToAdd: createUrlGetter('.manage-common-table-container div.editor-content a', anchorFilter),
    isPageReady: () => {
        const ret = $('.manage-common-table-container div.editor-content a').length > 0;
        log.debug('isPageReady:', ret);
        return ret;
    },
    onPageReady: parseCampaignList,
}

module.exports = CampaignsPage;