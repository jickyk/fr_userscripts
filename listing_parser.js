// FLIGHT RISING AUCTION LISTING PARSER
// 
// Intended for use on:
//     /auction-house/buy/*
//     /auction-house/activity/sold
//     /auction-house/activity/expired
//     /auction-house/activity/current
//     /auction-house/activity/history
// 
// Requirements:
//     itemTooltipParser
//     tabTool




// TODO: Parse dragon attributes.



// GLOBALS
// ------

var treasurePerGem = 1500.0;


// ------
// AUCTION LISTING PARSER
// ------

var aHListingParser =  (function() {

    // PRIVATE MEMBERS
    // ------

    var parsed = {
        tooltips: null, 
        listings: null, 
    }

    function tryParseInt(val) {
        if (val && val!='') { return parseInt(val); } else { return null; }
    }



    // PUBLIC MEMBERS
    // ------

    var publicMembers = {};


    // PARSING

    function parseAll(tooltips) {
        let date = new Date();
        tooltips ||= getTooltips();
        let listings = [];
        $("div.ah-listing-row").each(function(index, row) {
            let listing = parseListingRowDiv(row, date, tooltips);
            listings.push(listing);
        });
        parsed.listings = listings;
        return listings;
    }
    publicMembers.parseAll = parseAll;

    function parseListingRowDiv(row, date, tooltips) {
        date ||= ( new Date() );

        let lst = new AHListing();

        lst.id = row.getAttribute('data-listing-id');

        let node = row.querySelector('div.itemicon');
        lst.item.name = node.getAttribute('data-name');

        if (lst.item.name) {
            lst.item.id = row.getAttribute('data-listing-itemid');
            lst.item.tab = row.getAttribute('data-listing-tab');
            if (tooltips) {
                let tooltip = tooltips[lst.item.id];
                if (tooltip) { 
                    lst.item.sellValue = tooltip.sellVal;
                    lst.item.category = tooltip.category;
                    lst.item.limited = tooltip.limited;
                }
            }
        } else {
            lst.dragonId = row.getAttribute('data-listing-dragonid');
            lst.item.tab = 'dragons';
        }

        lst.quantity = tryParseInt(node.getAttribute('data-quantity'));
        if (!lst.quantity || lst.quantity=='') { lst.quantity=1; }
        lst.stackable = (node.getAttribute('data-stackable')=='1');

        lst.totalCost = parseInt(row.querySelector('span.ah-listing-cost').innerText.trim());

        node = row.querySelector('img.ah-listing-currency-icon');
        lst.isGems = (node.getAttribute('src').includes('gem'));

        node = row.querySelector('div.ah-listing-expiry');
        if (node) { // Will not be present on `/activity/expired`, `~/sold`
            lst.time.scraped = date;
            lst.time.remaining = tryParseInt(node.getAttribute('data-expiry-seconds'));
        }

        // Seller name/ID - will not be present on `/activity/*`
        if (node) {
            // REVIEW: There is probably a better way to do this
            node = node.previousElementSibling;
            if (!node) { return lst; }
            node = node.previousElementSibling;
            if (!node) { return lst; }
            node = node.querySelector('a');
            if (node) {
                lst.seller.name = node.innerText.trim();
                lst.seller.id = node.getAttribute('href').split('/')[4];
            }
        }

        return lst;
    }
    publicMembers.parseListingRowDiv = parseListingRowDiv;


    // ACCESSORS

    function setTooltips(tooltipMap) {
        parsed ||= {};
        parsed.tooltips = tooltipMap;
    }
    publicMembers.setTooltips = setTooltips;

    function getTooltips() {
        parsed ||= {};
        parsed.tooltips ||= itemTooltipParser.parseAll();
        return parsed.tooltips;
    }
    publicMembers.getTooltips = getTooltips;

    function data() { return parsed; }
    publicMembers.data = data;


    return publicMembers;
})();
window.aHListingParser = aHListingParser;



// ------
// LISTING OBJECT
// ------

function AHListing(args) {
    args ||= {};

    // REVIEW: Saner way to handle this...?
    this.customTreasurePerGem = args.treasurePerGem;
    this.treasurePerGem = function() {
        return (this.customTreasurePerGem || treasurePerGem || 1500.0);
    }

    this.id = (args.lstId || args.id);
    this.listingId = function() { return this.id; }

    if (args.dragonId) {
        this.dragonId = args.dragonId;
    } else {
        let tooltip = (args.tooltip || {});
        this.item = {
            id: (args.itemId || tooltip.id),
            name: (args.name || tooltip.name),
            tab: (args.tab || tooltip.tab),
            category: (args.category || tooltip.category),
            sellValue: (args.sellValue || tooltip.sellVal), 
            limited: tooltip.limited,
        };
    }
    this.itemId = function() { if (this.item) { return this.item.id; } }

    this.quantity = (args.quantity || 1);
    this.stackable = args.stackable;

    this.isGems = args.isGems;
    this.currency = function() {
        if (this.isGems) { return 'gems'; } else { return 'treasure'; }
    }

    this.totalCost = args.totalCost;
    this.unitCost = function() {
        return this.totalCost / this.quantity;
    }
    this.baseCost = function() {
        if (this.isGems) {
            return this.unitCost() * this.treasurePerGem();
        } else {
            return this.unitCost();
        }
    }
    this.cost = function() {
        let output = {
            currency: this.currency(),
            total: this.totalCost,
            unit: this.unitCost(),
        }
        if (this.isGems) {
            output.inGems = output.unit;
            output.inTreasure = output.unit * this.treasurePerGem();
        } else {
            output.inTreasure = output.unit;
            output.inGems = output.unit / this.treasurePerGem();
        }
        return output;
    }

    this.isUnderpriced = function() {
        if (!Number.isInteger(this.item.sellValue)) {
            return false;
        } else {
            return (this.item.sellValue >= this.baseCost());
        }
    }

    this.time = {
        remaining: args.timeRemaining,
        scraped: args.timeScraped
    };
    this.expires = function() {
        return this.incrementDateBy(this.time.remaining, this.time.scraped);
    }

    this.seller = {
        name: args.sellerName,
        id: args.sellerId
    };


    // CONVERSION / OUTPUT
    // ------

    this.toObj = function() { // automated toObj
        let output = {};
        for (const [key,val] of Object.entries(this)) {
            if (typeof(val) != 'function') { output[key] = val; }
        }
        return output;
    }
    this.toJSON = function() { return JSON.stringify(this.toObj()); }
    this.toString = function() {
        let str = `{ name: '${this.item.name}', itemId: ${this.item.id}, listingId: ${this.id}`;
        if (this.isGems) { str+=', gems: true'; }
        str+=`, baseCost: ${this.baseCost()}`;
        if (this.quantity > 1) { str+=`, quantity: ${this.quantity}`; }
        if (this.isUnderpriced) { str+=', underpriced: true'; }
        return `${str} }`;
    }


    // HELPERS
    // ------

    this.incrementDateBy = function(seconds, date) {
        if (!date) {date = new Date()}
        let millisecs = date.valueOf();
        millisecs = millisecs + (seconds*1000);
        return new Date(millisecs);
    }
}
window.AHListing = AHListing;