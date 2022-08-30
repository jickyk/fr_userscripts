// ------
// @name         itemTooltipParser - flightrising.com
// @version      0.6
// @namespace    https://greasyfork.org/users/683745-jicky
// @description  Parses Flight Rising item tooltips.
// @author       Jicky
// @require      https://raw.githubusercontent.com/jickyk/fr_userscripts/refactoring/tab_tool.js
// ------

// FIXME: @require should switch to `/main/tab_tool.js` when `refactoring` branch is merged.

// FIXME: Some modules may refer to `itemTooltipParser()` (fun) rather than `itemTooltipParser` (var)

var itemTooltipParser = (function() {
  var publicMembers = {};
  
  // PUBLIC MEMBERS
  // ------

  function parseAll(tab) {
    tab ||= tabTool.parseCurrentTab();
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
      m = /\/(\w+)\/(\d+)\./.exec($(div).find('img.itemicon').attr('src'));
      item.tab ||= m[1];
      item.id ||= parseInt(m[2]);
    }

    item.sellValue = tryParseInt($(div).find('div.sellval').text().trim());
    item.foodValue = tryParseInt($(div).find('div.foodval').text().trim());

    return new Tooltip(item);
  }
  publicMembers.parseDiv = parseDiv;

  function parseId(itemId) {
    return parseDiv($(`div#tooltip-${itemId}`), { id: itemId });
  }
  publicMembers.parseId = parseId;
  
  function Tooltip(args) {
    args ||= {};
    for (const key of ['id','name','tab','category','rarity','description',
      'sellValue','foodValue']) {
      this[key]=args[key];
    }
    this.tabId = tabTool.getTabId({name: this.name, tab: this.tab, category: this.category});
    this.tab = this.tabId;
    this.tabInfo = function() {
      return tabTool.getItemTabSet({name: this.name, tab: this.tab, category: this.category});
    }
  }


  // PRIVATE MEMBERS
  // ------

  function tryParseInt(val) {
    if (val && val!='') { return parseInt(val); } else { return null; }
  }


  return publicMembers;
})();

window.itemTooltipParser = itemTooltipParser;
