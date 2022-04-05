// ------
// @name         Flight Rising Item Tooltip Parser
// @version      0.4
// @updated      2021-01-01
// @description  Parses Flight Rising item tooltips.
// @require      https://code.jquery.com/jquery-1.10.2.min.js
// @require      https://github.com/jickyk/fr_userscripts/blob/main/tab_tool.js
// @author       Jicky
// ------

var itemTooltipParser = (function() {

    // PRIVATE MEMBERS
    // ------

    function tryParseInt(val) {
        if (val && val!='') { return parseInt(val); } else { return null; }
    }


    // PUBLIC MEMBERS
    // ------

    var publicMembers = {};

    function parseAll(tab) {
        tab ||= parseTabName();
        let tooltips = {};
        $('div.itemtip').each(function(index, div) {
            let tt = parseDiv(div, { tab: tab });
            tooltips[tt.id] = tt;
        });
        return tooltips;
    }
    publicMembers.parseAll = parseAll;

    function parseDiv(div, item) {
        if (!item) { item={id: null}; } else if (!item.id) { item.id=null; }

        item.name = $(div).find('div.itemtitle').text().trim();
        item.category = $(div).find('div.itemcategory').text().trim();
        item.description = $(div).find('div.itemdesc').text().trim();

        if (!item.description || item.description=='') {
            item.description = $(div).find('div.skindesc').text().trim();
        }
        
        let m = /20\d\d/.exec(item.description);
        item.limited = !!m;

        m = /rarity-(\d+)/.exec($(div).attr('class'));
        if (m) { item.rarity = parseInt(m[1]); }

        if (!item.tab || !item.id) {
            m=/\/(\w+)\/(\d+)\./.exec($(div).find('img.itemicon').attr('src'));
            item.tab ||= m[1];
            item.id ||= parseInt(m[2]);
        }

        item.sellVal = tryParseInt($(div).find('div.sellval').text().trim());
        item.foodVal = tryParseInt($(div).find('div.foodval').text().trim());

        return item;
    }
    publicMembers.parseDiv = parseDiv;

    function parseId(itemId) {
        return parseDiv($(`div#tooltip-${itemId}`), { id: itemId });
    }
    publicMembers.parseId = parseId;
    
    // FIXME: Use tabTool instead
    function parseTabName() {
        let rx = /auction-house\/(sell|buy)\/\w+\/(\w+)/;
        let m = rx.exec(window.location.href);
        if (m) { return m[2]; } else { return null; }
    }
    publicMembers.parseTabName = parseTabName;


    return publicMembers;
})();

window.itemTooltipParser = itemTooltipParser;

window.parseItemTooltips = itemTooltipParser.parseAll;
