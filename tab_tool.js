// ------
// @name         Flight Rising - Tab Identification Tools
// @version      0.4
// @description  Parser to identify currently-active inventory tab in Flight Rising (flightrising.com).
// @author       Jicky
// ------

var frTabTool = (function() {

    // DATA
    // ------

    var validTabs = ['food','mats','app','dragons','fam','battle','skins','specialty','other'];

    var tabAliases = {
        food: ['food'],
        mats: ['mats','materials','material','trinket','trinkets'],
        app: ['app','apparel','equipment'],
        dragons: ['dragon'],
        fam: ['fam','familiars','familiar'],
        battle: ['battle','battle_items','battle items'],
        skins: ['skins','skin'],
        specialty: ['specialty','genes','scenes','scenes & vistas','special','trinket','trinkets'],
        other: ['other','bundles','bundle','trinket','trinkets'],
    };

    var tabCategories = {
        food: ['plant','insect','meat','seafood'],
        mats: ['dragonmade','minerals & ores','organics','transmutation','dragonmade material','organic material'],
        app: ['apparel'],
        dragons: [],
        fam: ['familiar'],
        battle: ['ability stone','accessory stone','augment stone','battle item','energy stone'],
        specialty: ['forum vista','specialty items','specialty item'],
        other: ['blueprints','chests','dragon eggs','holiday items','trinkets','chest','holiday item','trinket','dragon egg','blueprint'],
        skins: ['banescale female only','banescale male only','bogsneak female only','bogsneak male only','coatl female only','coatl male only','fae female only','fae male only','gaoler female only','gaoler male only','guardian female only','guardian male only','imperial female only','imperial male only','mirror female only','mirror male only','nocturne female only','nocturne male only','obelisk female only','obelisk male only','pearlcatcher female only','pearlcatcher male only','ridgeback female only','ridgeback male only','skydancer female only','skydancer male only','snapper female only','snapper male only','spiral female only','spiral male only','tundra female only','tundra male only','veilspun female only','veilspun male only','wildclaw female only','wildclaw male only']
    };

    // // Dynamically generate skins list using list of currently-available dragon breeds:
    // 
    // var dragonBreeds = ["banescale", "bogsneak", "coatl", "fae", "gaoler", "guardian", "imperial", "mirror", "nocturne", "obelisk", "pearlcatcher", "ridgeback", "skydancer", "snapper", "spiral", "tundra", "veilspun", "wildclaw"];
    // tabCategories.skins = [];
    // for (const breed in dragonBreeds) {
    //     tabCategories.skins.push(`${breed} male only`);
    //     tabCategories.skins.push(`${breed} female only`);
    // }


    var publicMembers = {};

    function data() {
        return { validTabs: validTabs, aliases: tabAliases, categories: tabCategories };
    }
    publicMembers.data = data;

    function isValid(tabName) {
        return !!validTabs.includes(tabName);
    }
    publicMembers.isValid = isValid;

    function identifyTabFrom(args) {
        let tabName = args.tab || args.tabName;
        let category = args.category || args.cat || args.subcategory;
        let url = args.url;
        let doc = args.doc || args.document || args.page;

        let validTab = null;
        if (tabName) {
            validTab = normalizeTab(tabName);
            if (validTab) { return validTab; }
        }
        if (category) {
            validTab = categoryToTab(category);
            if (validTab) { return validTab; }
        }
        if (url) {
            validTab = urlToTab(url);
            if (validTab) { return validTab; }
        }
        if (doc) {
            validTab = pageToTab(doc);
            if (validTab) { return validTab; }
        }
        return null;
    }
    publicMembers.identifyTabFrom = identifyTabFrom;

    function normalizeTab(tabName) {
        tabName = tabName.toLowerCase();
        if (validTabs.includes(tabName)) {
            return tabName;
        } else if (tabName!='trinket' && tabName!='trinkets') {
            for (const [validTab,aliases] of Object.entries(tabAliases)) {
                if (aliases.includes(tabName)) { return validTab; }
            }
        }
        return null;
    }
    publicMembers.normalizeTab = normalizeTab;

    function categoryToTab(category) {
        category = category.toLowerCase();
        for (const [tabName,categories] of Object.entries(tabCategories)) {
            if (categories.includes(category)) { return tabName; }
        }
        return null;
    }
    publicMembers.categoryToTab = categoryToTab;

    function urlToTab(url) {
        url ||= window.location.href;
        if (!url) { return null; }

        let match;
        let regexs = [
            /auction-house\/(sell|buy)\/\w+\/(?<tab>\w+)/,
            /market\/(treasure|gem)\/(?<tab>\w+)/,
            /(hoard|vault)\/(?<tab>\w+)/,
            /game-database\/items\/(?<tab>\w+)/
        ]
        for (const rx of regexs) {
            match = rx.exec(url)
            if (match) { return normalizeTab(match.groups.tab); }
        }

        if (url.includes('/bestiary')) {
            return 'fam';
        } else if (/(\/(lair|den)\/|(tab=hatchery)|(\/nest))/.exec(url)) {
            return 'dragons';
        }

        return null;
    }
    publicMembers.urlToTab = urlToTab;

    function isDragonPage(url) {
        url ||= window.location.href;
        let rx = /(\/(lair|den)\/|(tab=hatchery)|(\/nest))/
        return !!rx.exec(url);
    }

    function pageToTab(doc) {
        doc ||= document;
        let node, tabName;

        // Works in: Market, AH Sell (not Buy), Hoard/Vault.
        node = doc.querySelector('input[name="tab"]');
        if (node) {
            tabName = normalizeTab(node.getAttribute('value'));
            if (tabName) { return tabName; }
        }

        node = doc.querySelector('span.ah-current-tab')
        if (node) {
            tabName = normalizeTab(node.innerText.trim());
            if (tabName) { return tabName; }
        }

        return null;
    }
    publicMembers.pageToTab = pageToTab;

    // Works in: Market, AH Sell (not Buy), Hoard/Vault.
    function marketPageToTab(doc) {
        doc ||= document;
        let div = doc.querySelector('input[name="tab"]');
        if (!div) { return null; }
        let tabName = div.getAttribute('value');
        return normalizeTab(tabName);
    }
    publicMembers.marketPageToTab = marketPageToTab;

    return publicMembers;
})();

window.frTabTool = frTabTool;