// ------
// @name         tabTool - flightrising.com
// @namespace    https://greasyfork.org/users/683745-jicky
// @version      0.6
// @description  Parser to identify currently-active inventory tab in Flight Rising (flightrising.com).
// @author       Jicky
// @license      GPL-3.0-or-later
// ------

var tabTool = (function() {
  var publicMembers = {};

  // DATA
  // ------

  const tabIds = ['food','mats','app','dragons','fam','battle','skins','specialty','other'];

  const tabAliases = {
    food: ['food'],
    mats: ['mats','materials','material','trinket','trinkets'],
    app: ['app','apparel','equipment'],
    dragons: ['dragons','dragon'],
    fam: ['fam','familiars','familiar'],
    battle: ['battle','battle_items','battle items'],
    skins: ['skins','skin'],
    specialty: ['specialty','genes','scenes','scenes & vistas','special','trinket','trinkets'],
    other: ['other','bundles','bundle','trinket','trinkets'],
  };

  const tabsByType = {
    food: {ah: 'food', hoard: 'food', market: null, legacy: 'food'}, 
    mats: {ah: 'mats', hoard: 'materials', market: null, legacy: 'trinket'}, 
    app: {ah: 'app', hoard: 'apparel', market: 'apparel', legacy: 'equipment'}, 
    fam: {ah: 'fam', hoard: 'familiars', market: 'familiars', legacy: 'familiar'}, 
    battle: {ah: 'battle', hoard: 'battle', market: 'battle', legacy: 'battle_items'},
    skins: {ah: 'skins', hoard: 'skins', market: 'skins', legacy: 'skins'}, 
    specialty: {ah: 'specialty', hoard: 'specialty', market: ['specialty', 'genes', 'scenes'], legacy: 'trinket'}, 
    other: {ah: 'other', hoard: 'other', market: ['bundles'], legacy: 'trinket'},
  };

  // As of 2022-08-27
  const dragonBreeds = ['aberration','banescale','bogsneak','coatl','fae','gaoler','guardian','imperial','mirror','nocturne','obelisk','pearlcatcher','ridgeback','skydancer','snapper','spiral','tundra','veilspun','wildclaw'];

  // Generates skin tab categories list using currently-available dragon breeds
  function skinCategories(breeds) {
    breeds ||= dragonBreeds;
    let cats = [];
    for (const breed in dragonBreeds) {
      cats.push(`${breed} male only`);
      cats.push(`${breed} female only`);
    }
    return cats;
  }

  function tabCategories() {
    return {
      food: ['plant','insect','meat','seafood'],
      mats: ['dragonmade','minerals & ores','organics','transmutation','dragonmade material','organic material'],
      app: ['apparel'],
      dragons: [],
      fam: ['familiar'],
      battle: ['ability stone','accessory stone','augment stone','energy stone','battle item','consumable'],
      specialty: ['forum vista','vista','scene','specialty items','specialty item'],
      other: ['blueprints','chests','dragon eggs','holiday items','trinkets','chest','holiday item','trinket','dragon egg','blueprint'],
      skins: skinCategories(),
    }
  };

  
  // ---
  // PUBLIC MEMBERS
  // ---

  function data() {
    return { byType: tabsByType, ids: tabIds, aliases: tabAliases, categories: tabCategories() };
  }
  publicMembers.data = data;


  // ---
  // PROCESSING
  // ---

  // FIXME: Some modules may refer to `isValid`, which is ambiguous; fix those, then remove
  function isValidTabId(tabName) {
    return !!tabIds.includes(tabName);
  }
  publicMembers.isValidTabId = isValidTabId;
  publicMembers.isValid = isValidTabId; // FIXME: Remove alias later

  // valid `type`s: 'ah','market','hoard','legacy'
  function validTabsFor(type) {
    let output = new Set();
    for (const [id,tabSet] of Object.entries(tabsByType)) {
      let nameSet = tabSet[type];
      if (!nameSet) { // skip this one
      } else if (typeof(nameSet)=='string') { 
        output.add(nameSet);
      } else { 
        for (const name of nameSet) { output.add(name); } 
      }
    }
    return Array.from(output);
  }

  function getTabId(args) {
    if (typeof(args)!='object') return stringToTabId(args);
    let tabName = args.tab || args.tabName;
    let category = args.category || args.cat || args.subcategory;
    let url = args.url;
    let doc = args.doc || args.document || args.page;
    let tabId = null;
    if (tabName) {
      tabId = stringToTabId(tabName);
      if (tabId) return tabId;
    }
    if (category) {
      tabId = categoryToTab(category);
      if (tabId) return tabId;
    }
    if (url) {
      tabId = urlToTab(url);
      if (tabId) return tabId;
    }
    if (doc) {
      tabId = parseDocumentTab(doc);
      if (tabId) return tabId;
    }
    return null;
  }
  publicMembers.getTabId = getTabId;

  function stringToTabId(tabName) {
    tabName = tabName.toLowerCase();
    if (isValidTabId(tabName)) {
      return tabName;
    } else if (tabName!='trinket' && tabName!='trinkets') {
      for (const [validTabId,aliases] of Object.entries(tabAliases)) {
        if (aliases.includes(tabName)) return validTabId;
      }
    }
    return null;
  }
  publicMembers.stringToTabId = stringToTabId;

  function getTabSet(val) {
    if (typeof(val)=='string') {
      return tabsByType[stringToTabId(val)];
    } else {
      return getItemTabSet(val);
    }
  }
  publicMembers.getTabSet = getTabSet;

  function getItemTabSet(item) {
    let tabId = getTabId({ tab: item.tab, category: item.category });
    let tabSet = tabsByType[tabId];
    if (tabSet && (tabId=='other' || tabId=='specialty')) {
      tabSet.market = getItemMarketTab({ tabId: tabId, category: item.category, name: item.name });
    }
    return tabSet;
  }
  publicMembers.getItemTabSet = getItemTabSet;

  function getItemMarketTab(item) {
    let tabId = (item.tabId || getTabId(item));
    let mktTab = tabsByType[tabId].market;
    if (['string','null','undefined'].includes(typeof(mktTab))) { 
      return mktTab;
    } else if (tabId=='other') {
      if (item.category && item.category.toLowerCase().startsWith('chest')) {
        return 'bundles';
      }
    } else if (tabId=='specialty') {
      if ((item.category && ['forum vista','scene','vista'].includes(item.category.toLowerCase())) || /^(Scene|Vista)/.exec(item.name)) {
        return 'scenes'; 
      } else if (/^(Primary|Secondary|Tertiary|Breed\sChange|Remove\sGene)/.exec(item.name)) {
        return 'genes';
      } else {
        return 'specialty';
      }
    }
    return null;
  }
  publicMembers.getItemMarketTab = getItemMarketTab;

  function categoryToTab(category) {
    category = category.toLowerCase();
    for (const [tabName,categories] of Object.entries(tabCategories())) {
      if (categories.includes(category)) { return tabName; }
    }
    return null;
  }
  publicMembers.categoryToTab = categoryToTab;

  // ---
  // PARSING
  // ---

  function parseDocumentTab(doc) {
    doc ||= document;
    let node, tabName;
    node = doc.querySelector('input[name="tab"]'); // in Market, Hoard, AH Sell
    if (node) {
      tabName = stringToTabId(node.getAttribute('value'));
      if (tabName) return tabName;
    }
    node = doc.querySelector('span.ah-current-tab'); // in AH Buy
    if (node) {
      tabName = stringToTabId(node.innerText.trim());
      if (tabName) return tabName;
    }
    return null;
  }
  publicMembers.parseDocumentTab = parseDocumentTab;

  function parseUrlTab(url) {
    url ||= window.location.href;
    if (!url) return null;
    for (const rx of [
      /auction-house\/(sell|buy)\/\w+\/(?<tab>\w+)/,
      /market\/(treasure|gem)\/(?<tab>\w+)/,
      /(hoard|vault)\/(?<tab>\w+)/,
      /game-database\/items\/(?<tab>\w+)/
    ]) {
      let m = rx.exec(url)
      if (m) { return stringToTabId(m.groups.tab); }
    }
    if (url.includes('/bestiary')) {
      return 'fam';
    } else if (/(\/(lair|den)\/|(tab=hatchery)|(\/nest))/.exec(url)) {
      return 'dragons';
    }
    return null;
  }
  publicMembers.parseUrlTab = parseUrlTab;

  function parseCurrentTab(doc, url) {
    let tab = parseDocumentTab(doc);
    if (tab) { return tab; } else { return parseUrlTab(url); }
  }
  publicMembers.parseCurrentTab = parseCurrentTab;

  return publicMembers;
})();

window.tabTool = tabTool;
