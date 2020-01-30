const DataFrame = dfjs.DataFrame;

const {
    createUrlGetter,
    extractDataAndSimplify,
    simplifyText,
    extractDataFromTable,
    getParameterFromUrl,
} = require('./helper');






const anchorFilter = (ele) => {
    /** 暂停状态，不抓取 */
    return $(ele).closest('tr').find('td span strong:contains("暂停")').length <= 0;
}

class AdgroupsPage {

    constructor() {
        this.findNewUrl = true;
        this.onDataFrameReady = this.saveData;
    }

    id = 'Adgroups';

    triggerOnUrl = (url) => {
        return !!url && !!url.match(/(https:\/\/subway.simba.taobao.com)?\/?(#\!\/manage\/campaign\/detail)(.*)/);
    };

    getUrlsToAdd = () => {
        return this.findNewUrl ?
            createUrlGetter('a.ad-title', anchorFilter) :
            [];
    }
    isPageReady = () => $('a.ad-title').length > 0 && $('#bp-scroll-table tr th').length > 0;

    onPageReady = async () => {
        const dataFrame = this.parseData();
        await this.onDataFrameReady(dataFrame);
    }

    parseData = () => {
        const head = extractDataAndSimplify('#bp-scroll-table', 'tr', 'th');
        const columns = head[0].map(
            (v) => {
                if (v.startsWith('状态')) return '状态';
                else if (v.startsWith('营销场景')) return '营销场景';
                else return v;
            }
        );

        const dataExtractor = (ele) => {
            let text = '';
            if ($(ele).find('.ad-title').length > 0) {
                text = $(ele).find('.ad-title').text();
            } else {
                text = $(ele).text();
            }
            return simplifyText(text);
        }
        const data = extractDataFromTable('table.bp-table[bx-name="table"]', 'tr', 'td', dataExtractor);


        let dataFrame = new DataFrame(data, columns);
        dataFrame = dataFrame.restructure(columns.filter(col => !!col));

        const urls = $.map($('a.ad-title'), value => $(value).attr('href'));
        const campaignIds = urls.map(v => getParameterFromUrl(v, 'campaignId'));
        dataFrame = dataFrame.withColumn('推广计划ID', (_, index) => campaignIds[index]);

        const adgroupIds = urls.map(v => getParameterFromUrl(v, 'adGroupId'));
        dataFrame = dataFrame.withColumn('推广单元ID', (_, index) => adgroupIds[index]);

        const productIds = urls.map(v => getParameterFromUrl(v, 'productId'));
        dataFrame = dataFrame.withColumn('宝贝ID', (_, index) => productIds[index]);

        const timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
        dataFrame = dataFrame.withColumn('抓取时间', () => timeStr);

        const fetchSn = Date.now().toString();
        dataFrame = dataFrame.withColumn('Fetch SN', () => fetchSn);

        const shopName = $('span.header-nickname-inside:nth-of-type(1)').text();
        dataFrame = dataFrame.withColumn('店铺名称', () => shopName);

        dataFrame.show();

        return dataFrame;
    };

    saveData = async (dataFrame) => {
        const { db } = require('./db');
        await db['adgroups_log'].bulkPut(dataFrame.toCollection())
        await db['headers'].put({ table_name: 'adgroups_log', 'columns': dataFrame.listColumns() });
    }

};

module.exports = AdgroupsPage;