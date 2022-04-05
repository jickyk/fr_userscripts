// ==UserScript==
// @name         Flight Rising Item Tooltip Parser
// @namespace    https://greasyfork.org/users/547396
// @match        https://*.flightrising.com/*
// @grant        none
// @version      0.5
// @author       Jicky
// @description  Parses Flight Rising item tooltips. Updated 2022-04-05.
// @icon         https://www.google.com/s2/favicons?domain=flightrising.com
// @license      GPL-3.0-or-later
// ==/UserScript==

function itemTooltipParser() {

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
};

window.itemTooltipParser = itemTooltipParser;
