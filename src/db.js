const db = new Dexie('ant_log');

function initSchema(){
    db.version(1).stores({
        'campaigns_log': '++,推广计划ID',
        'adgroups_log': '++,推广计划ID,推广单元ID',
        'keywords_log': '++,推广计划ID,推广单元ID,关键词',
    });
    db.version(2).stores({
        'campaigns_log': '++,推广计划ID',
        'adgroups_log': '++,推广计划ID,推广单元ID',
        'keywords_log': '++,推广计划ID,推广单元ID,关键词',
        'headers': '&table_name',
    });
}


function clear() {
    db['campaigns_log'].clear();
    db['adgroups_log'].clear();
    db['keywords_log'].clear();
}

initSchema();

module.exports = {
    db,
    clear,
    initSchema
};