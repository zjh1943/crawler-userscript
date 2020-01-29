
const createUrlGetter = (cssSelector, filter = undefined) => () => {
    const list = [];
    const queryList = $(cssSelector);
    queryList.each(function () {
        if(filter && !filter(this)) return;

        const url = $(this).attr('href');
        if (!url) return;

        if (url.startsWith('#')) {
            list.push('https://subway.simba.taobao.com/' + url)
        } else if (url.startsWith('https')) {
            list.push(url)
        }
    });
    return list;
};

function extractDataFromTable(table, row = 'tr', cell = 'td', textExtractor = undefined) {
    const ret = [];
    $(table).find(row).each(function () {
        const row = [];
        $(this).find(cell).each(function () {
            textExtractor = textExtractor || ((ele) => simplifyText($(ele).text()));
            row.push(textExtractor(this));
        });
        ret.push(row);
    })
    return ret;
}

function simplifyText(str) {
    var ret = str || '';
    ret = ret.replace(/[\s\r\n\t\ue000-\uffff]|(󰅂)|(Ũ)/g, '');
    ret = ret.trim();
    return ret;
}

function extractDataAndSimplify(table, row = 'tr', cell = 'td') {
    return extractDataFromTable(table, row, cell);
}

function concat2DArray(left, right) {
    return left.map((value, index) => value.concat(right[index]));
}


function getParameterFromUrl(url, name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results == null ? null : results[1];
}

function downloadXls( data, fileName) {
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'people.csv';
    hiddenElement.click();
}


module.exports = {
    createUrlGetter,
    extractDataFromTable,
    simplifyText,
    extractDataAndSimplify,
    concat2DArray,
    getParameterFromUrl,
}