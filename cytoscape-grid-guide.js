(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericMap = require("./generic-map");

// Burgled from https://github.com/domenic/dict

module.exports = Dict;
function Dict(values, getDefault) {
    if (!(this instanceof Dict)) {
        return new Dict(values, getDefault);
    }
    getDefault = getDefault || Function.noop;
    this.getDefault = getDefault;
    this.store = Object.create(null);
    this.length = 0;
    this.addEach(values);
}

Dict.Dict = Dict; // hack so require("dict").Dict will work in MontageJS.

Object.addEach(Dict.prototype, GenericCollection.prototype);
Object.addEach(Dict.prototype, GenericMap.prototype);

Dict.from = GenericCollection.from;

Dict.prototype.constructClone = function (values) {
    return new this.constructor(values, this.getDefault);
};

Dict.prototype.assertString = function (key) {
    if (typeof key !== "string") {
        throw new TypeError("key must be a string but Got " + key);
    }
}

Object.defineProperty(Dict.prototype,"$__proto__",{writable:true});
Object.defineProperty(Dict.prototype,"_hasProto",{
    get:function() {
        return this.hasOwnProperty("$__proto__") && typeof this._protoValue !== "undefined";
    }
});
Object.defineProperty(Dict.prototype,"_protoValue",{
    get:function() {
        return this["$__proto__"];
    },
    set: function(value) {
        this["$__proto__"] = value;
    }
});

Object.defineProperty(Dict.prototype,"size",GenericCollection._sizePropertyDescriptor);


Dict.prototype.get = function (key, defaultValue) {
    this.assertString(key);
    if (key === "__proto__") {
        if (this._hasProto) {
            return this._protoValue;
        } else if (arguments.length > 1) {
            return defaultValue;
        } else {
            return this.getDefault(key);
        }
    }
    else {
        if (key in this.store) {
            return this.store[key];
        } else if (arguments.length > 1) {
            return defaultValue;
        } else {
            return this.getDefault(key);
        }
    }
};

Dict.prototype.set = function (key, value) {
    this.assertString(key);
    var isProtoKey = (key === "__proto__");

    if (isProtoKey ? this._hasProto : key in this.store) { // update
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, isProtoKey ? this._protoValue : this.store[key]);
        }

        isProtoKey
            ? this._protoValue = value
            : this.store[key] = value;

        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
        return false;
    } else { // create
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, undefined);
        }
        this.length++;

        isProtoKey
            ? this._protoValue = value
            : this.store[key] = value;

        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
        return true;
    }
};

Dict.prototype.has = function (key) {
    this.assertString(key);
    return key === "__proto__" ? this._hasProto : key in this.store;
};

Dict.prototype["delete"] = function (key) {
    this.assertString(key);
    if (key === "__proto__") {
        if (this._hasProto) {
            if (this.dispatchesMapChanges) {
                this.dispatchBeforeMapChange(key, this._protoValue);
            }
            this._protoValue = undefined;
            this.length--;
            if (this.dispatchesMapChanges) {
                this.dispatchMapChange(key, undefined);
            }
            return true;
        }
        return false;
    }
    else {
        if (key in this.store) {
            if (this.dispatchesMapChanges) {
                this.dispatchBeforeMapChange(key, this.store[key]);
            }
            delete this.store[key];
            this.length--;
            if (this.dispatchesMapChanges) {
                this.dispatchMapChange(key, undefined);
            }
            return true;
        }
        return false;
    }
};

Dict.prototype.clear = function () {
    var key;
    if (this._hasProto) {
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange("__proto__", this._protoValue);
        }
        this._protoValue = undefined;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange("__proto__", undefined);
        }
    }
    for (key in this.store) {
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[key]);
        }
        delete this.store[key];
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
    }
    this.length = 0;
};

Dict.prototype.reduce = function (callback, basis, thisp) {
    if(this._hasProto) {
        basis = callback.call(thisp, basis, "$__proto__", "__proto__", this);
    }
    var store = this.store;
    for (var key in this.store) {
        basis = callback.call(thisp, basis, store[key], key, this);
    }
    return basis;
};

Dict.prototype.reduceRight = function (callback, basis, thisp) {
    var self = this;
    var store = this.store;
    basis = Object.keys(this.store).reduceRight(function (basis, key) {
        return callback.call(thisp, basis, store[key], key, self);
    }, basis);

    if(this._hasProto) {
        return callback.call(thisp, basis, this._protoValue, "__proto__", self);
    }
    return basis;
};

Dict.prototype.one = function () {
    var key;
    for (key in this.store) {
        return this.store[key];
    }
    return this._protoValue;
};

Dict.prototype.toJSON = function () {
    return this.toObject();
};

},{"./generic-collection":6,"./generic-map":7,"./shim":19}],2:[function(require,module,exports){
"use strict";

var Shim = require("./shim");
var Dict = require("./_dict");
var List = require("./_list");
var GenericCollection = require("./generic-collection");
var GenericSet = require("./generic-set");
var TreeLog = require("./tree-log");

var object_has = Object.prototype.hasOwnProperty;

module.exports = FastSet;

function FastSet(values, equals, hash, getDefault) {
    if (!(this instanceof FastSet)) {
        return new FastSet(values, equals, hash, getDefault);
    }
    equals = equals || Object.equals;
    hash = hash || Object.hash;
    getDefault = getDefault || Function.noop;
    this.contentEquals = equals;
    this.contentHash = hash;
    this.getDefault = getDefault;
    var self = this;
    this.buckets = new this.Buckets(null, function getDefaultBucket() {
        return new self.Bucket();
    });
    this.length = 0;
    this.addEach(values);
}

FastSet.FastSet = FastSet; // hack so require("fast-set").FastSet will work in MontageJS

Object.addEach(FastSet.prototype, GenericCollection.prototype);
Object.addEach(FastSet.prototype, GenericSet.prototype);
FastSet.from = GenericCollection.from;

FastSet.prototype.Buckets = Dict;
FastSet.prototype.Bucket = List;

FastSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

FastSet.prototype.has = function (value) {
    var hash = this.contentHash(value);
    return this.buckets.get(hash).has(value);
};

FastSet.prototype.get = function (value, equals) {
    if (equals) {
        throw new Error("FastSet#get does not support second argument: equals");
    }
    var hash = this.contentHash(value);
    var buckets = this.buckets;
    if (buckets.has(hash)) {
        return buckets.get(hash).get(value);
    } else {
        return this.getDefault(value);
    }
};

FastSet.prototype["delete"] = function (value, equals) {
    if (equals) {
        throw new Error("FastSet#delete does not support second argument: equals");
    }
    var hash = this.contentHash(value);
    var buckets = this.buckets;
    if (buckets.has(hash)) {
        var bucket = buckets.get(hash);
        if (bucket["delete"](value)) {
            this.length--;
            if (bucket.length === 0) {
                buckets["delete"](hash);
            }
            return true;
        }
    }
    return false;
};

FastSet.prototype.clear = function () {
    this.buckets.clear();
    this.length = 0;
};

FastSet.prototype.add = function (value) {
    var hash = this.contentHash(value);
    var buckets = this.buckets;
    if (!buckets.has(hash)) {
        buckets.set(hash, new this.Bucket(null, this.contentEquals));
    }
    if (!buckets.get(hash).has(value)) {
        buckets.get(hash).add(value);
        this.length++;
        return true;
    }
    return false;
};

FastSet.prototype.reduce = function (callback, basis /*, thisp*/) {
    var thisp = arguments[2];
    var buckets = this.buckets;
    var index = 0;
    return buckets.reduce(function (basis, bucket) {
        return bucket.reduce(function (basis, value) {
            return callback.call(thisp, basis, value, index++, this);
        }, basis, this);
    }, basis, this);
};

FastSet.prototype.one = function () {
    if (this.length > 0) {
        return this.buckets.one().one();
    }
};

FastSet.prototype.iterate = function () {
    return this.buckets.valuesArray().flatten().iterate();
};

FastSet.prototype.log = function (charmap, logNode, callback, thisp) {
    charmap = charmap || TreeLog.unicodeSharp;
    logNode = logNode || this.logNode;
    if (!callback) {
        callback = console.log;
        thisp = console;
    }
    callback = callback.bind(thisp);

    var buckets = this.buckets, bucketsSize = buckets.size,
        mapIter = buckets.keys(), hash, index = 0,
        branch, leader, bucket;

    while (hash = mapIter.next().value) {
        if (index === bucketsSize - 1) {
            branch = charmap.fromAbove;
            leader = ' ';
        } else if (index === 0) {
            branch = charmap.branchDown;
            leader = charmap.strafe;
        } else {
            branch = charmap.fromBoth;
            leader = charmap.strafe;
        }
        bucket = buckets.get(hash);
        callback.call(thisp, branch + charmap.through + charmap.branchDown + ' ' + hash);
        bucket.forEach(function (value, node) {
            var branch, below, written;
            if (node === bucket.head.prev) {
                branch = charmap.fromAbove;
                below = ' ';
            } else {
                branch = charmap.fromBoth;
                below = charmap.strafe;
            }
            logNode(
                node,
                function (line) {
                    if (!written) {
                        callback.call(thisp, leader + ' ' + branch + charmap.through + charmap.through + line);
                        written = true;
                    } else {
                        callback.call(thisp, leader + ' ' + below + '  ' + line);
                    }
                },
                function (line) {
                    callback.call(thisp, leader + ' ' + charmap.strafe + '  ' + line);
                }
            );
        });
        index++;
    }

    //var hashes = buckets.keysArray();
    // hashes.forEach(function (hash, index) {
    //     var branch;
    //     var leader;
    //     if (index === hashes.length - 1) {
    //         branch = charmap.fromAbove;
    //         leader = ' ';
    //     } else if (index === 0) {
    //         branch = charmap.branchDown;
    //         leader = charmap.strafe;
    //     } else {
    //         branch = charmap.fromBoth;
    //         leader = charmap.strafe;
    //     }
    //     var bucket = buckets.get(hash);
    //     callback.call(thisp, branch + charmap.through + charmap.branchDown + ' ' + hash);
    //     bucket.forEach(function (value, node) {
    //         var branch, below;
    //         if (node === bucket.head.prev) {
    //             branch = charmap.fromAbove;
    //             below = ' ';
    //         } else {
    //             branch = charmap.fromBoth;
    //             below = charmap.strafe;
    //         }
    //         var written;
    //         logNode(
    //             node,
    //             function (line) {
    //                 if (!written) {
    //                     callback.call(thisp, leader + ' ' + branch + charmap.through + charmap.through + line);
    //                     written = true;
    //                 } else {
    //                     callback.call(thisp, leader + ' ' + below + '  ' + line);
    //                 }
    //             },
    //             function (line) {
    //                 callback.call(thisp, leader + ' ' + charmap.strafe + '  ' + line);
    //             }
    //         );
    //     });
    // });
};

FastSet.prototype.logNode = function (node, write) {
    var value = node.value;
    if (Object(value) === value) {
        JSON.stringify(value, null, 4).split("\n").forEach(function (line) {
            write(" " + line);
        });
    } else {
        write(" " + value);
    }
};

},{"./_dict":1,"./_list":3,"./generic-collection":6,"./generic-set":9,"./shim":19,"./tree-log":22}],3:[function(require,module,exports){
"use strict";

module.exports = List;

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericOrder = require("./generic-order");

function List(values, equals, getDefault) {
    return List._init(List, this, values, equals, getDefault);
}

List._init = function (constructor, object, values, equals, getDefault) {
    if (!(object instanceof constructor)) {
        return new constructor(values, equals, getDefault);
    }
    var head = object.head = new object.Node();
    head.next = head;
    head.prev = head;
    object.contentEquals = equals || Object.equals;
    object.getDefault = getDefault || Function.noop;
    object.length = 0;
    object.addEach(values);
}

List.List = List; // hack so require("list").List will work in MontageJS

Object.addEach(List.prototype, GenericCollection.prototype);
Object.addEach(List.prototype, GenericOrder.prototype);

List.from = GenericCollection.from;

List.prototype.constructClone = function (values) {
    return new this.constructor(values, this.contentEquals, this.getDefault);
};

List.prototype.find = function (value, equals, index) {
    equals = equals || this.contentEquals;
    var head = this.head;
    var at = this.scan(index, head.next);
    while (at !== head) {
        if (equals(at.value, value)) {
            return at;
        }
        at = at.next;
    }
};

List.prototype.findLast = function (value, equals, index) {
    equals = equals || this.contentEquals;
    var head = this.head;
    var at = this.scan(index, head.prev);
    while (at !== head) {
        if (equals(at.value, value)) {
            return at;
        }
        at = at.prev;
    }
};

List.prototype.has = function (value, equals) {
    return !!this.find(value, equals);
};

List.prototype.get = function (value, equals) {
    var found = this.find(value, equals);
    if (found) {
        return found.value;
    }
    return this.getDefault(value);
};

// LIFO (delete removes the most recently added equivalent value)
List.prototype["delete"] = function (value, equals) {
    var found = this.findLast(value, equals);
    if (found) {
        found["delete"]();
        this.length--;
        return true;
    }
    return false;
};

List.prototype.deleteAll = function (value, equals) {
    equals = equals || this.contentEquals;
    var head = this.head;
    var at = head.next;
    var count = 0;
    while (at !== head) {
        if (equals(value, at.value)) {
            at["delete"]();
            count++;
        }
        at = at.next;
    }
    this.length -= count;
    return count;
};

List.prototype.clear = function () {
    this.head.next = this.head.prev = this.head;
    this.length = 0;
};

List.prototype.add = function (value) {
    var node = new this.Node(value)
    return this._addNode(node);
};

List.prototype._addNode = function (node) {
    this.head.addBefore(node);
    this.length++;
    return true;
};

List.prototype.push = function () {
    var head = this.head;
    for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        var node = new this.Node(value);
        head.addBefore(node);
    }
    this.length += arguments.length;
};

List.prototype.unshift = function () {
    var at = this.head;
    for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        var node = new this.Node(value);
        at.addAfter(node);
        at = node;
    }
    this.length += arguments.length;
};

List.prototype._shouldPop = function () {
    var value;
    var head = this.head;
    if (head.prev !== head) {
        value = head.prev.value;
    }
    return value;
}

List.prototype.pop = function (_before, _after) {
    var value;
    var head = this.head;
    if (head.prev !== head) {
        value = head.prev.value;
        var index = this.length - 1;
        var popDispatchValueArray = _before ? _before.call(this,value,index) : void 0;
        head.prev['delete']();
        this.length--;
        _after ? _after.call(this,value,index, popDispatchValueArray) : void 0;
    }
    return value;
};

List.prototype.shift = function (_before, _after) {
    var value;
    var head = this.head;
    if (head.prev !== head) {
        value = head.next.value;
        var dispatchValueArray = _before ? _before.call(this,value,0) : void 0;
        head.next['delete']();
        this.length--;
        _after ? _after.call(this,value,0,dispatchValueArray) : void 0;
    }
    return value;
};

List.prototype.peek = function () {
    if (this.head !== this.head.next) {
        return this.head.next.value;
    }
};

List.prototype.poke = function (value) {
    if (this.head !== this.head.next) {
        this.head.next.value = value;
    } else {
        this.push(value);
    }
};

List.prototype.one = function () {
    return this.peek();
};

// TODO
// List.prototype.indexOf = function (value) {
// };

// TODO
// List.prototype.lastIndexOf = function (value) {
// };

// an internal utility for coercing index offsets to nodes
List.prototype.scan = function (at, fallback) {
    var head = this.head;
    if (typeof at === "number") {
        var count = at;
        if (count >= 0) {
            at = head.next;
            while (count) {
                count--;
                at = at.next;
                if (at == head) {
                    break;
                }
            }
        } else {
            at = head;
            while (count < 0) {
                count++;
                at = at.prev;
                if (at == head) {
                    break;
                }
            }
        }
        return at;
    } else {
        return at || fallback;
    }
};

// at and end may both be positive or negative numbers (in which cases they
// correspond to numeric indicies, or nodes)
List.prototype.slice = function (at, end) {
    var sliced = [];
    var head = this.head;
    at = this.scan(at, head.next);
    end = this.scan(end, head);

    while (at !== end && at !== head) {
        sliced.push(at.value);
        at = at.next;
    }

    return sliced;
};

List.prototype.splice = function (at, length /*...plus*/) {
    return this.swap(at, length, Array.prototype.slice.call(arguments, 2));
};

List.prototype.swap = function (start, length, plus, _before, _after) {
    var initial = start;
    // start will be head if start is null or -1 (meaning from the end), but
    // will be head.next if start is 0 (meaning from the beginning)
    start = this.scan(start, this.head);
    if (length == null) {
        length = Infinity;
    }
    plus = Array.from(plus);

    // collect the minus array
    var minus = [];
    var at = start;
    while (length-- && length >= 0 && at !== this.head) {
        minus.push(at.value);
        at = at.next;
    }

    // before range change
    var index, startNode;
    index = _before ? _before.call(this, start, plus, minus) : void 0;

    // delete minus
    var at = start;
    for (var i = 0, at = start; i < minus.length; i++, at = at.next) {
        at["delete"]();
    }
    // add plus
    if (initial == null && at === this.head) {
        at = this.head.next;
    }
    for (var i = 0; i < plus.length; i++) {
        var node = new this.Node(plus[i]);
        at.addBefore(node);
    }
    // adjust length
    this.length += plus.length - minus.length;

    _after ? _after.call(this, start, plus, minus) : void 0;

    return minus;
};

List.prototype.reverse = function () {
    var at = this.head;
    do {
        var temp = at.next;
        at.next = at.prev;
        at.prev = temp;
        at = at.next;
    } while (at !== this.head);
    return this;
};

List.prototype.sort = function () {
    this.swap(0, this.length, this.sorted());
};

// TODO account for missing basis argument
List.prototype.reduce = function (callback, basis /*, thisp*/) {
    var thisp = arguments[2];
    var head = this.head;
    var at = head.next;
    while (at !== head) {
        basis = callback.call(thisp, basis, at.value, at, this);
        at = at.next;
    }
    return basis;
};

List.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    var thisp = arguments[2];
    var head = this.head;
    var at = head.prev;
    while (at !== head) {
        basis = callback.call(thisp, basis, at.value, at, this);
        at = at.prev;
    }
    return basis;
};

List.prototype.updateIndexes = function (node, index) {
    while (node !== this.head) {
        node.index = index++;
        node = node.next;
    }
};


List.prototype.iterate = function () {
    return new ListIterator(this.head);
};

function ListIterator(head) {
    this.head = head;
    this.at = head.next;
};

ListIterator.prototype.__iterationObject = null;
Object.defineProperty(ListIterator.prototype,"_iterationObject", {
    get: function() {
        return this.__iterationObject || (this.__iterationObject = { done: false, value:null});
    }
});


ListIterator.prototype.next = function () {
    if (this.at === this.head) {
        this._iterationObject.done = true;
        this._iterationObject.value = void 0;
    } else {
        var value = this.at.value;
        this.at = this.at.next;
        this._iterationObject.value = value;
    }
    return this._iterationObject;
};

List.prototype.Node = Node;

function Node(value) {
    this.value = value;
    this.prev = null;
    this.next = null;
};

Node.prototype["delete"] = function () {
    this.prev.next = this.next;
    this.next.prev = this.prev;
};

Node.prototype.addBefore = function (node) {
    var prev = this.prev;
    this.prev = node;
    node.prev = prev;
    prev.next = node;
    node.next = this;
};

Node.prototype.addAfter = function (node) {
    var next = this.next;
    this.next = node;
    node.next = next;
    next.prev = node;
    node.prev = this;
};

},{"./generic-collection":6,"./generic-order":8,"./shim":19}],4:[function(require,module,exports){
(function (global){
"use strict";

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var Map, GlobalMap, CollectionsMap;

if((global.Map !== void 0) && (typeof global.Set.prototype.values === "function")) {

    Map = module.exports = global.Map,
    GlobalMap = Map;
    Map.Map = Map; // hack so require("map").Map will work in MontageJS

    // use different strategies for making sets observable between Internet
    // Explorer and other browsers.
    var protoIsSupported = {}.__proto__ === Object.prototype,
        map_makeObservable;

    if (protoIsSupported) {
        map_makeObservable = function () {
            this.__proto__ = ChangeDispatchMap;
        };
    } else {
        map_makeObservable = function () {
            Object.defineProperties(this, observableSetProperties);
        };
    }

    Object.defineProperty(Map.prototype, "makeObservable", {
        value: map_makeObservable,
        writable: true,
        configurable: true,
        enumerable: false
    });

    //This is a no-op test in property-changes.js - PropertyChanges.prototype.makePropertyObservable, so might as well not pay the price every time....
    Object.defineProperty(Map.prototype, "makePropertyObservable", {
        value: function(){},
        writable: true,
        configurable: true,
        enumerable: false
    });


    Map.prototype.constructClone = function (values) {
        return new this.constructor(values);
    };

    Map.prototype.isMap = true;
    Map.prototype.addEach = function (values) {
        if (values && Object(values) === values) {
            if (typeof values.forEach === "function") {
                // copy map-alikes
                if (values.isMap === true) {
                    values.forEach(function (value, key) {
                        this.set(key, value);
                    }, this);
                // iterate key value pairs of other iterables
                } else {
                    values.forEach(function (pair) {
                        this.set(pair[0], pair[1]);
                    }, this);
                }
            } else if (typeof values.length === "number") {
                // Array-like objects that do not implement forEach, ergo,
                // Arguments
                for (var i = 0; i < values.length; i++) {
                    this.add(values[i], i);
                }
            } else {
                // copy other objects as map-alikes
                Object.keys(values).forEach(function (key) {
                    this.set(key, values[key]);
                }, this);
            }
        } else if (values && typeof values.length === "number") {
            // String
            for (var i = 0; i < values.length; i++) {
                this.add(values[i], i);
            }
        }
        return this;
    };

    Map.prototype.add = function (value, key) {
        return this.set(key, value);
    };

    Map.prototype.reduce = function (callback, basis /*, thisp*/) {
        var thisp = arguments[2];
        this.forEach(function(value, key, map) {
            basis = callback.call(thisp, basis, value, key, this);
        });
        return basis;
    };

    Map.prototype.reduceRight = function (callback, basis /*, thisp*/) {
        var thisp = arguments[2];
        var keysIterator = this.keys();
        var size = this.size;
        var reverseOrder = new Array(this.size);
        var aKey, i = 0;
        while ((aKey = keysIterator.next().value)) {
            reverseOrder[--size] = aKey;
        }
        while (i++ < size) {
            basis = callback.call(thisp, basis, this.get(reverseOrder[i]), reverseOrder[i], this);
        }
        return basis;
    };

    Map.prototype.equals = function (that, equals) {
        equals = equals || Object.equals;
        if (this === that) {
            return true;
        } else if (that && typeof that.every === "function") {
            return that.size === this.size && that.every(function (value, key) {
                return equals(this.get(key), value);
            }, this);
        } else {
            var keys = Object.keys(that);
            return keys.length === this.size && Object.keys(that).every(function (key) {
                return equals(this.get(key), that[key]);
            }, this);
        }
    };

    var _keysArrayFunction = function(value,key) {return key;};
    Map.prototype.keysArray = function() {
        return this.map(_keysArrayFunction);
    }
    var _valuesArrayFunction = function(value,key) {return value;};
    Map.prototype.valuesArray = function() {
        return this.map(_valuesArrayFunction);
    }
    var _entriesArrayFunction = function(value,key) {return [key,value];};
    Map.prototype.entriesArray = function() {
        return this.map(_entriesArrayFunction);
    }
    Map.prototype.toJSON = function () {
        return this.entriesArray();
    };

    // XXX deprecated
    Map.prototype.items = function () {
        return this.entriesArray();
    };

    // Map.prototype.contentEquals = Object.equals;
    // Map.prototype.contentHash = Object.hash;


    Map.from = function (value) {
        var result = new this;
        result.addEach(value);
        return result;
    };


    //Backward compatibility:
    Object.defineProperty(Map.prototype,"length",{
        get: function() {
            return this.size;
        },
        enumerable: true,
        configurable:true
    });


    var map_clear = Map.prototype.clear,
        map_set = Map.prototype.set,
        map_delete = Map.prototype.delete;

    var observableMapProperties = {
        clear : {
            value: function () {
                var keys;
                if (this.dispatchesMapChanges) {
                    this.forEach(function (value, key) {
                        this.dispatchBeforeMapChange(key, value);
                    }, this);
                    keys = this.keysArray();
                }
                map_clear.call(this);
                if (this.dispatchesMapChanges) {
                    keys.forEach(function (key) {
                        this.dispatchMapChange(key);
                    }, this);
                }
            },
            writable: true,
            configurable: true

        },
        set : {
            value: function (key, value) {
                var found = this.get(key);
                if (found) { // update
                    if (this.dispatchesMapChanges) {
                        this.dispatchBeforeMapChange(key, found);
                    }

                    map_set.call(this,key, value);

                    if (this.dispatchesMapChanges) {
                        this.dispatchMapChange(key, value);
                    }
                } else { // create
                    if (this.dispatchesMapChanges) {
                        this.dispatchBeforeMapChange(key, undefined);
                    }

                    map_set.call(this,key, value);

                    if (this.dispatchesMapChanges) {
                        this.dispatchMapChange(key, value);
                    }
                }
                return this;
            },
            writable: true,
            configurable: true
        },

        "delete": {
            value: function (key) {
                if (this.has(key)) {
                    if (this.dispatchesMapChanges) {
                        this.dispatchBeforeMapChange(key, this.get(key));
                    }
                    map_delete.call(this,key);

                    if (this.dispatchesMapChanges) {
                        this.dispatchMapChange(key, undefined);
                    }
                    return true;
                }
                return false;
            }
        }
    };



    Object.addEach(Map.prototype, GenericCollection.prototype, false);

    var ChangeDispatchMap = Object.create(Map.prototype, observableMapProperties);
}

    var Set = require("./_set").CollectionsSet;
    var GenericMap = require("./generic-map");

    CollectionsMap = Map = function Map(values, equals, hash, getDefault) {
        if (!(this instanceof Map)) {
            return new Map(values, equals, hash, getDefault);
        }
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || Function.noop;
        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        this.store = new Set(
            undefined,
            function keysEqual(a, b) {
                return equals(a.key, b.key);
            },
            function keyHash(item) {
                return hash(item.key);
            }
        );
        this.length = 0;
        this.addEach(values);
    }

    Map.Map = Map; // hack so require("map").Map will work in MontageJS

    Object.addEach(Map.prototype, GenericCollection.prototype);
    Object.addEach(Map.prototype, GenericMap.prototype); // overrides GenericCollection
    Object.defineProperty(Map.prototype,"size",GenericCollection._sizePropertyDescriptor);

    Map.from = GenericCollection.from;

    Map.prototype.constructClone = function (values) {
        return new this.constructor(
            values,
            this.contentEquals,
            this.contentHash,
            this.getDefault
        );
    };

    Map.prototype.log = function (charmap, logNode, callback, thisp) {
        logNode = logNode || this.logNode;
        this.store.log(charmap, function (node, log, logBefore) {
            logNode(node.value.value, log, logBefore);
        }, callback, thisp);
    };

    Map.prototype.logNode = function (node, log) {
        log(' key: ' + node.key);
        log(' value: ' + node.value);
    };

    if(!GlobalMap) {
        module.exports = CollectionsMap;
    }
    else {
        module.exports = GlobalMap;
        GlobalMap.CollectionsMap = CollectionsMap;
    }

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_set":5,"./generic-collection":6,"./generic-map":7,"./shim":19}],5:[function(require,module,exports){
(function (global){
"use strict";

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericSet = require("./generic-set");
var Set, GlobalSet, CollectionsSet;


if((global.Set !== void 0) && (typeof global.Set.prototype.values === "function")) {

    GlobalSet = module.exports = global.Set;
    GlobalSet.Set = GlobalSet; // hack so require("set").Set will work in MontageJS

    GlobalSet.prototype.reduce = function (callback, basis /*, thisp*/) {
        var thisp = arguments[2];
        this.forEach(function(value) {
            basis = callback.call(thisp, basis, value, this);
        });
        return basis;
    };

    GlobalSet.prototype.reduceRight = function (callback, basis /*, thisp*/) {
        var thisp = arguments[2];
        var setIterator = this.values();
        var size = this.size;
        var reverseOrder = new Array(this.size);
        var value, i = 0;
        while ((value = setIterator.next().value)) {
            reverseOrder[--size] = value;
        }
        while (i++ < size) {
            basis = callback.call(thisp, basis, value, this);
        }
        return basis;
    };

    GlobalSet.prototype.equals = function (that, equals) {
        var self = this;
        return (
            that && typeof that.reduce === "function" &&
            this.size === (that.size || that.length) &&
            that.reduce(function (equal, value) {
                return equal && self.has(value, equals);
            }, true)
        );
    };

    GlobalSet.prototype.constructClone = function (values) {
        return new this.constructor(values, this.contentEquals, this.contentHash, this.getDefault);
    };

    GlobalSet.prototype.toJSON = function () {
        return this.entriesArray();
    };

    GlobalSet.prototype.one = function () {
        if (this.size > 0) {
            return this.values().next().value;
        }
        return undefined;
    };

    GlobalSet.prototype.pop = function () {
        if (this.size) {
            var setIterator = this.values(), aValue, value;
            while(aValue = setIterator.next().value) {
                value = aValue;
            }
            this["delete"](value,this.size-1);
            return value;
        }
    };

    GlobalSet.prototype.shift = function () {
        if (this.size) {
            var firstValue = this.values().next().value;
            this["delete"](firstValue,0);
            return firstValue;
        }
    };

    //Backward compatibility:
    Object.defineProperty(GlobalSet.prototype,"length",{
        get: function() {
            return this.size;
        },
        enumerable: true,
        configurable:true
    });

    GlobalSet.from = function (value) {
        var result = (new this);
        result.addEach(value);
        return result;
    };

    Object.addEach(GlobalSet.prototype, GenericCollection.prototype, false);
    Object.addEach(GlobalSet.prototype, GenericSet.prototype, false);

}



    var List = require("./_list");
    var FastSet = require("./_fast-set");
    var Iterator = require("./iterator");

    CollectionsSet = function CollectionsSet(values, equals, hash, getDefault) {
        return CollectionsSet._init(CollectionsSet, this, values, equals, hash, getDefault);
    }

    CollectionsSet._init = function (constructor, object, values, equals, hash, getDefault) {
        if (!(object instanceof constructor)) {
            return new constructor(values, equals, hash, getDefault);
        }
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || Function.noop;
        object.contentEquals = equals;
        object.contentHash = hash;
        object.getDefault = getDefault;
        // a list of values in insertion order, used for all operations that depend
        // on iterating in insertion order
        object.order = new object.Order(undefined, equals);
        // a set of nodes from the order list, indexed by the corresponding value,
        // used for all operations that need to quickly seek  value in the list
        object.store = new object.Store(
            undefined,
            function (a, b) {
                return equals(a.value, b.value);
            },
            function (node) {
                return hash(node.value);
            }
        );
        object.length = 0;
        object.addEach(values);

    }

    CollectionsSet.Set = CollectionsSet; // hack so require("set").Set will work in MontageJS
    CollectionsSet.CollectionsSet = CollectionsSet;

    Object.addEach(CollectionsSet.prototype, GenericCollection.prototype);
    Object.addEach(CollectionsSet.prototype, GenericSet.prototype);

    CollectionsSet.from = GenericCollection.from;

    Object.defineProperty(CollectionsSet.prototype,"size",GenericCollection._sizePropertyDescriptor);

    //Overrides for consistency:
    // Set.prototype.forEach = GenericCollection.prototype.forEach;


    CollectionsSet.prototype.Order = List;
    CollectionsSet.prototype.Store = FastSet;

    CollectionsSet.prototype.constructClone = function (values) {
        return new this.constructor(values, this.contentEquals, this.contentHash, this.getDefault);
    };

    CollectionsSet.prototype.has = function (value) {
        var node = new this.order.Node(value);
        return this.store.has(node);
    };

    CollectionsSet.prototype.get = function (value, equals) {
        if (equals) {
            throw new Error("Set#get does not support second argument: equals");
        }
        var node = new this.order.Node(value);
        node = this.store.get(node);
        if (node) {
            return node.value;
        } else {
            return this.getDefault(value);
        }
    };

    CollectionsSet.prototype.add = function (value) {
        var node = new this.order.Node(value);
        if (!this.store.has(node)) {
            var index = this.length;
            this.order.add(value);
            node = this.order.head.prev;
            this.store.add(node);
            this.length++;
            return true;
        }
        return false;
    };

    CollectionsSet.prototype["delete"] = function (value, equals) {
        if (equals) {
            throw new Error("Set#delete does not support second argument: equals");
        }
        var node = new this.order.Node(value);
        if (this.store.has(node)) {
            node = this.store.get(node);
            this.store["delete"](node); // removes from the set
            this.order.splice(node, 1); // removes the node from the list
            this.length--;
            return true;
        }
        return false;
    };

    CollectionsSet.prototype.pop = function () {
        if (this.length) {
            var result = this.order.head.prev.value;
            this["delete"](result);
            return result;
        }
    };

    CollectionsSet.prototype.shift = function () {
        if (this.length) {
            var result = this.order.head.next.value;
            this["delete"](result);
            return result;
        }
    };

    CollectionsSet.prototype.one = function () {
        if (this.length > 0) {
            return this.store.one().value;
        }
    };

    CollectionsSet.prototype.clear = function () {
        this.store.clear();
        this.order.clear();
        this.length = 0;
    };
    Object.defineProperty(CollectionsSet.prototype,"_clear", {
        value: CollectionsSet.prototype.clear
    });

    CollectionsSet.prototype.reduce = function (callback, basis /*, thisp*/) {
        var thisp = arguments[2];
        var list = this.order;
        var index = 0;
        return list.reduce(function (basis, value) {
            return callback.call(thisp, basis, value, index++, this);
        }, basis, this);
    };

    CollectionsSet.prototype.reduceRight = function (callback, basis /*, thisp*/) {
        var thisp = arguments[2];
        var list = this.order;
        var index = this.length - 1;
        return list.reduceRight(function (basis, value) {
            return callback.call(thisp, basis, value, index--, this);
        }, basis, this);
    };

    CollectionsSet.prototype.iterate = function () {
        return this.order.iterate();
    };

    CollectionsSet.prototype.values = function () {
        return new Iterator(this);
    };

    CollectionsSet.prototype.log = function () {
        var set = this.store;
        return set.log.apply(set, arguments);
    };



if(!GlobalSet) {
    module.exports = CollectionsSet;
}
else {
    GlobalSet.prototype.valuesArray = GenericSet.prototype.valuesArray;
    GlobalSet.prototype.entriesArray = GenericSet.prototype.entriesArray;
    module.exports = GlobalSet;
    GlobalSet.CollectionsSet = CollectionsSet;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_fast-set":2,"./_list":3,"./generic-collection":6,"./generic-set":9,"./iterator":10,"./shim":19}],6:[function(require,module,exports){
(function (global){
"use strict";

module.exports = GenericCollection;
function GenericCollection() {
    throw new Error("Can't construct. GenericCollection is a mixin.");
}

var DOMTokenList = global.DOMTokenList || function(){};

GenericCollection.EmptyArray = Object.freeze([]);

/* TODO: optimize for DOMTokenList and Array to use for() instead of forEach */
GenericCollection.prototype.addEach = function (values) {
    //We want to eliminate everything but array like: Strings, Arrays, DOMTokenList
    if(values && (values instanceof Array || (values instanceof DOMTokenList) || values instanceof String)) {
        for (var i = 0; i < values.length; i++) {
            this.add(values[i], i);
        }
    }
    else if (values && Object(values) === values) {
        if (typeof values.forEach === "function") {
            values.forEach(this.add, this);
        } else if (typeof values.length === "number") {
            // Array-like objects that do not implement forEach, ergo,
            // Arguments
            for (var i = 0; i < values.length; i++) {
                this.add(values[i], i);
            }
        } else {
            Object.keys(values).forEach(function (key) {
                this.add(values[key], key);
            }, this);
        }
    }
    return this;
};

// This is sufficiently generic for Map (since the value may be a key)
// and ordered collections (since it forwards the equals argument)
GenericCollection.prototype.deleteEach = function (values, equals) {
    values.forEach(function (value) {
        this["delete"](value, equals);
    }, this);
    return this;
};

// all of the following functions are implemented in terms of "reduce".
// some need "constructClone".

GenericCollection.prototype.forEach = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (undefined, value, key, object, depth) {
        callback.call(thisp, value, key, object, depth);
    }, undefined);
};

GenericCollection.prototype.map = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    var result = [];
    this.reduce(function (undefined, value, key, object, depth) {
        result.push(callback.call(thisp, value, key, object, depth));
    }, undefined);
    return result;
};

GenericCollection.prototype.enumerate = function (start) {
    if (start == null) {
        start = 0;
    }
    var result = [];
    this.reduce(function (undefined, value) {
        result.push([start++, value]);
    }, undefined);
    return result;
};

GenericCollection.prototype.group = function (callback, thisp, equals) {
    equals = equals || Object.equals;
    var groups = [];
    var keys = [];
    this.forEach(function (value, key, object) {
        var key = callback.call(thisp, value, key, object);
        var index = keys.indexOf(key, equals);
        var group;
        if (index === -1) {
            group = [];
            groups.push([key, group]);
            keys.push(key);
        } else {
            group = groups[index][1];
        }
        group.push(value);
    });
    return groups;
};

GenericCollection.prototype.toArray = function () {
    return this.map(Function.identity);
};

// this depends on stringable keys, which apply to Array and Iterator
// because they have numeric keys and all Maps since they may use
// strings as keys.  List, Set, and SortedSet have nodes for keys, so
// toObject would not be meaningful.
GenericCollection.prototype.toObject = function () {
    var object = {};
    this.reduce(function (undefined, value, key) {
        object[key] = value;
    }, undefined);
    return object;
};

GenericCollection.from = function () {
    return this.apply(this,arguments);
};

GenericCollection.prototype.filter = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    var result = this.constructClone();
    this.reduce(function (undefined, value, key, object, depth) {
        if (callback.call(thisp, value, key, object, depth)) {
            result.add(value, key);
        }
    }, undefined);
    return result;
};

GenericCollection.prototype.every = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (result, value, key, object, depth) {
        return result && callback.call(thisp, value, key, object, depth);
    }, true);
};

GenericCollection.prototype.some = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (result, value, key, object, depth) {
        return result || callback.call(thisp, value, key, object, depth);
    }, false);
};

GenericCollection.prototype.all = function () {
    return this.every(Boolean);
};

GenericCollection.prototype.any = function () {
    return this.some(Boolean);
};

GenericCollection.prototype.min = function (compare) {
    compare = compare || this.contentCompare || Object.compare;
    var first = true;
    return this.reduce(function (result, value) {
        if (first) {
            first = false;
            return value;
        } else {
            return compare(value, result) < 0 ? value : result;
        }
    }, undefined);
};

GenericCollection.prototype.max = function (compare) {
    compare = compare || this.contentCompare || Object.compare;
    var first = true;
    return this.reduce(function (result, value) {
        if (first) {
            first = false;
            return value;
        } else {
            return compare(value, result) > 0 ? value : result;
        }
    }, undefined);
};

GenericCollection.prototype.sum = function (zero) {
    zero = zero === undefined ? 0 : zero;
    return this.reduce(function (a, b) {
        return a + b;
    }, zero);
};

GenericCollection.prototype.average = function (zero) {
    var sum = zero === undefined ? 0 : zero;
    var count = zero === undefined ? 0 : zero;
    this.reduce(function (undefined, value) {
        sum += value;
        count += 1;
    }, undefined);
    return sum / count;
};

GenericCollection.prototype.concat = function () {
    var result = this.constructClone(this);
    for (var i = 0; i < arguments.length; i++) {
        result.addEach(arguments[i]);
    }
    return result;
};

GenericCollection.prototype.flatten = function () {
    var self = this;
    return this.reduce(function (result, array) {
        array.forEach(function (value) {
            this.push(value);
        }, result, self);
        return result;
    }, []);
};

GenericCollection.prototype.zip = function () {
    var table = Array.prototype.slice.call(arguments);
    table.unshift(this);
    return Array.unzip(table);
}

GenericCollection.prototype.join = function (delimiter) {
    return this.reduce(function (result, string) {
        // work-around for reduce that does not support no-basis form
        if (result === void 0) {
            return string;
        } else {
            return result + delimiter + string;
        }
    }, void 0);
};

GenericCollection.prototype.sorted = function (compare, by, order) {
    compare = compare || this.contentCompare || Object.compare;
    // account for comparators generated by Function.by
    if (compare.by) {
        by = compare.by;
        compare = compare.compare || this.contentCompare || Object.compare;
    } else {
        by = by || Function.identity;
    }
    if (order === undefined)
        order = 1;
    return this.map(function (item) {
        return {
            by: by(item),
            value: item
        };
    })
    .sort(function (a, b) {
        return compare(a.by, b.by) * order;
    })
    .map(function (pair) {
        return pair.value;
    });
};

GenericCollection.prototype.reversed = function () {
    return this.constructClone(this).reverse();
};

GenericCollection.prototype.clone = function (depth, memo) {
    if (depth === undefined) {
        depth = Infinity;
    } else if (depth === 0) {
        return this;
    }
    var clone = this.constructClone();
    this.forEach(function (value, key) {
        clone.add(Object.clone(value, depth - 1, memo), key);
    }, this);
    return clone;
};

GenericCollection.prototype.only = function () {
    if (this.length === 1) {
        return this.one();
    }
};

GenericCollection.prototype.iterator = function () {
    return this.iterate.apply(this, arguments);
};

GenericCollection._sizePropertyDescriptor = {
    get: function() {
        return this.length;
    },
    enumerable: false,
    configurable: true
};

Object.defineProperty(GenericCollection.prototype,"size",GenericCollection._sizePropertyDescriptor);

require("./shim-array");

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./shim-array":15}],7:[function(require,module,exports){
"use strict";

var Object = require("./shim-object");
var Iterator = require("./iterator");

module.exports = GenericMap;
function GenericMap() {
    throw new Error("Can't construct. GenericMap is a mixin.");
}

// all of these methods depend on the constructor providing a `store` set

GenericMap.prototype.isMap = true;

GenericMap.prototype.addEach = function (values) {
    var i;
    if (values && Object(values) === values) {
        if (typeof values.forEach === "function") {
            // copy map-alikes
            if (values.isMap === true) {
                values.forEach(function (value, key) {
                    this.set(key, value);
                }, this);
            // iterate key value pairs of other iterables
            } else {
                values.forEach(function (pair) {
                    this.set(pair[0], pair[1]);
                }, this);
            }
        } else if (typeof values.length === "number") {
            // Array-like objects that do not implement forEach, ergo,
            // Arguments
            for (i = 0; i < values.length; i++) {
                this.add(values[i], i);
            }
        } else {
            // copy other objects as map-alikes
            Object.keys(values).forEach(function (key) {
                this.set(key, values[key]);
            }, this);
        }
    } else if (values && typeof values.length === "number") {
        // String
        for (i = 0; i < values.length; i++) {
            this.add(values[i], i);
        }
    }
    return this;
};

GenericMap.prototype.get = function (key, defaultValue) {
    var item = this.store.get(new this.Item(key));
    if (item) {
        return item.value;
    } else if (arguments.length > 1) {
        console.log("Use of a second argument as default value is deprecated to match standards");
        return defaultValue;
    } else {
        return this.getDefault(key);
    }
};

GenericMap.prototype.set = function (key, value) {
    var item = new this.Item(key, value);
    var found = this.store.get(item);
    var grew = false;
    if (found) { // update
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, found.value);
        }
        found.value = value;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
    } else { // create
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, undefined);
        }
        if (this.store.add(item)) {
            this.length++;
            grew = true;
        }
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
    }
    return grew;
};

GenericMap.prototype.add = function (value, key) {
    return this.set(key, value);
};

GenericMap.prototype.has = function (key) {
    return this.store.has(new this.Item(key));
};

GenericMap.prototype['delete'] = function (key) {
    var item = new this.Item(key);
    if (this.store.has(item)) {
        var from = this.store.get(item).value;
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, from);
        }
        this.store["delete"](item);
        this.length--;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
        return true;
    }
    return false;
};

GenericMap.prototype.clear = function () {
    var keys, key;
    if (this.dispatchesMapChanges) {
        this.forEach(function (value, key) {
            this.dispatchBeforeMapChange(key, value);
        }, this);
        keys = this.keysArray();
    }
    this.store.clear();
    this.length = 0;
    if (this.dispatchesMapChanges) {
        for(var i=0;(key = keys[i]);i++) {
            this.dispatchMapChange(key);
        }
        // keys.forEach(function (key) {
        //     this.dispatchMapChange(key);
        // }, this);
    }
};

GenericMap.prototype.reduce = function (callback, basis, thisp) {
    return this.store.reduce(function (basis, item) {
        return callback.call(thisp, basis, item.value, item.key, this);
    }, basis, this);
};

GenericMap.prototype.reduceRight = function (callback, basis, thisp) {
    return this.store.reduceRight(function (basis, item) {
        return callback.call(thisp, basis, item.value, item.key, this);
    }, basis, this);
};

GenericMap.prototype.keysArray = function () {
    return this.map(function (value, key) {
        return key;
    });
};
GenericMap.prototype.keys = function () {
    return new Iterator(this.keysArray());
};

GenericMap.prototype.valuesArray = function () {
    return this.map(Function.identity);
};
GenericMap.prototype.values = function () {
    return new Iterator(this.valuesArray());
};

GenericMap.prototype.entriesArray = function () {
    return this.map(function (value, key) {
        return [key, value];
    });
};
GenericMap.prototype.entries = function () {
    return new Iterator(this.entriesArray());
};

// XXX deprecated
GenericMap.prototype.items = function () {
    return this.entriesArray();
};

GenericMap.prototype.equals = function (that, equals) {
    equals = equals || Object.equals;
    if (this === that) {
        return true;
    } else if (that && typeof that.every === "function") {
        return that.length === this.length && that.every(function (value, key) {
            return equals(this.get(key), value);
        }, this);
    } else {
        var keys = Object.keys(that);
        return keys.length === this.length && Object.keys(that).every(function (key) {
            return equals(this.get(key), that[key]);
        }, this);
    }
};

GenericMap.prototype.toJSON = function () {
    return this.entriesArray();
};


GenericMap.prototype.Item = Item;

function Item(key, value) {
    this.key = key;
    this.value = value;
}

Item.prototype.equals = function (that) {
    return Object.equals(this.key, that.key) && Object.equals(this.value, that.value);
};

Item.prototype.compare = function (that) {
    return Object.compare(this.key, that.key);
};

},{"./iterator":10,"./shim-object":17}],8:[function(require,module,exports){

var Object = require("./shim-object");

module.exports = GenericOrder;
function GenericOrder() {
    throw new Error("Can't construct. GenericOrder is a mixin.");
}

GenericOrder.prototype.equals = function (that, equals) {
    equals = equals || this.contentEquals || Object.equals;

    if (this === that) {
        return true;
    }
    if (!that) {
        return false;
    }

    var self = this;
    return (
        this.length === that.length &&
        this.zip(that).every(function (pair) {
            return equals(pair[0], pair[1]);
        })
    );
};

GenericOrder.prototype.compare = function (that, compare) {
    compare = compare || this.contentCompare || Object.compare;

    if (this === that) {
        return 0;
    }
    if (!that) {
        return 1;
    }

    var length = Math.min(this.length, that.length);
    var comparison = this.zip(that).reduce(function (comparison, pair, index) {
        if (comparison === 0) {
            if (index >= length) {
                return comparison;
            } else {
                return compare(pair[0], pair[1]);
            }
        } else {
            return comparison;
        }
    }, 0);
    if (comparison === 0) {
        return this.length - that.length;
    }
    return comparison;
};

GenericOrder.prototype.toJSON = function () {
    return this.toArray();
};

},{"./shim-object":17}],9:[function(require,module,exports){

module.exports = GenericSet;
function GenericSet() {
    throw new Error("Can't construct. GenericSet is a mixin.");
}

GenericSet.prototype.isSet = true;

GenericSet.prototype.union = function (that) {
    var union =  this.constructClone(this);
    union.addEach(that);
    return union;
};

GenericSet.prototype.intersection = function (that) {
    return this.constructClone(this.filter(function (value) {
        return that.has(value);
    }));
};

GenericSet.prototype.difference = function (that) {
    var union =  this.constructClone(this);
    union.deleteEach(that);
    return union;
};

GenericSet.prototype.symmetricDifference = function (that) {
    var union = this.union(that);
    var intersection = this.intersection(that);
    return union.difference(intersection);
};

GenericSet.prototype.deleteAll = function (value) {
    // deleteAll is equivalent to delete for sets since they guarantee that
    // only one value exists for an equivalence class, but deleteAll returns
    // the count of deleted values instead of whether a value was deleted.
    return +this["delete"](value);
};

GenericSet.prototype.equals = function (that, equals) {
    var self = this;
    return (
        that && typeof that.reduce === "function" &&
        this.length === that.length &&
        that.reduce(function (equal, value) {
            return equal && self.has(value, equals);
        }, true)
    );
};

GenericSet.prototype.forEach = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (undefined, value, key, object, depth) {
        //ECMASCRIPT Sets send value twice in callback to forEach
        callback.call(thisp, value, value, object, depth);
    }, undefined);
};


GenericSet.prototype.toJSON = function () {
    return this.toArray();
};

// W3C DOMTokenList API overlap (does not handle variadic arguments)

GenericSet.prototype.contains = function (value) {
    return this.has(value);
};

GenericSet.prototype.remove = function (value) {
    return this["delete"](value);
};

GenericSet.prototype.toggle = function (value) {
    if (this.has(value)) {
        this["delete"](value);
    } else {
        this.add(value);
    }
};

var _valuesArrayFunction = function(value,key) {return value;};
GenericSet.prototype.valuesArray = function() {
    return this.map(_valuesArrayFunction);
}
var _entriesArrayFunction = function(value,key) {return [key,value];};
GenericSet.prototype.entriesArray = function() {
    return this.map(_entriesArrayFunction);
}

},{}],10:[function(require,module,exports){
"use strict";

module.exports = Iterator;

var Object = require("./shim-object");
var GenericCollection = require("./generic-collection");

// upgrades an iterable to a Iterator
function Iterator(iterable) {

    var values = iterable && iterable.values && iterable.values();
    if(values && typeof values.next === "function" ) {
        return values;
    }

    if (!(this instanceof Iterator)) {
        return new Iterator(iterable);
    }

    if (Array.isArray(iterable) || typeof iterable === "string")
        return Iterator.iterate(iterable);

    iterable = Object(iterable);

    if (iterable instanceof Iterator) {
        return iterable;
    } else if (iterable.next) {
        this.next = function () {
            return iterable.next();
        };
    } else if (iterable.iterate) {
        var iterator = iterable.iterate();
        this.next = function () {
            return iterator.next();
        };
    } else if (Object.prototype.toString.call(iterable) === "[object Function]") {
        this.next = iterable;
    } else {
        throw new TypeError("Can't iterate " + iterable);
    }

}

Iterator.prototype.forEach = GenericCollection.prototype.forEach;
Iterator.prototype.map = GenericCollection.prototype.map;
Iterator.prototype.filter = GenericCollection.prototype.filter;
Iterator.prototype.every = GenericCollection.prototype.every;
Iterator.prototype.some = GenericCollection.prototype.some;
Iterator.prototype.any = GenericCollection.prototype.any;
Iterator.prototype.all = GenericCollection.prototype.all;
Iterator.prototype.min = GenericCollection.prototype.min;
Iterator.prototype.max = GenericCollection.prototype.max;
Iterator.prototype.sum = GenericCollection.prototype.sum;
Iterator.prototype.average = GenericCollection.prototype.average;
Iterator.prototype.flatten = GenericCollection.prototype.flatten;
Iterator.prototype.zip = GenericCollection.prototype.zip;
Iterator.prototype.enumerate = GenericCollection.prototype.enumerate;
Iterator.prototype.sorted = GenericCollection.prototype.sorted;
Iterator.prototype.group = GenericCollection.prototype.group;
Iterator.prototype.reversed = GenericCollection.prototype.reversed;
Iterator.prototype.toArray = GenericCollection.prototype.toArray;
Iterator.prototype.toObject = GenericCollection.prototype.toObject;
Iterator.prototype.iterator = GenericCollection.prototype.iterator;

Iterator.prototype.__iterationObject = null;
Object.defineProperty(Iterator.prototype,"_iterationObject", {
    get: function() {
        return this.__iterationObject || (this.__iterationObject = { done: false, value:void 0});
    }
});


// this is a bit of a cheat so flatten and such work with the generic
// reducible
Iterator.prototype.constructClone = function (values) {
    var clone = [];
    clone.addEach(values);
    return clone;
};

Iterator.prototype.mapIterator = function (callback /*, thisp*/) {
    var self = Iterator(this),
        thisp = arguments[1],
        i = 0;

    if (Object.prototype.toString.call(callback) != "[object Function]")
        throw new TypeError();

    return new self.constructor(function () {
        if(self._iterationObject.done !== true) {
            var callbackValue = callback.call(thisp, self.next().value, i++, self);
            self._iterationObject.value = callbackValue;
        }
        return self._iterationObject;
    });
};

Iterator.prototype.filterIterator = function (callback /*, thisp*/) {
    var self = Iterator(this),
        thisp = arguments[1],
        i = 0;

    if (Object.prototype.toString.call(callback) != "[object Function]")
        throw new TypeError();

    return new self.constructor(function () {
        var nextEntry;
        while (true) {
            nextEntry = self.next();
            if(nextEntry.done !== true) {
                if (callback.call(thisp, nextEntry.value, i++, self))
                    return nextEntry;
            }
            else {
                //done true and value undefined at this point
                return nextEntry;
            }
        }
    });
};

Iterator.prototype.reduce = function (callback /*, initial, thisp*/) {
    var self = Iterator(this),
        result = arguments[1],
        thisp = arguments[2],
        i = 0,
        nextEntry;

    if (Object.prototype.toString.call(callback) != "[object Function]")
        throw new TypeError();

    // first iteration unrolled
    nextEntry = self.next();
    if(nextEntry.done === true) {
        if (arguments.length > 1) {
            return arguments[1]; // initial
        } else {
            throw TypeError("cannot reduce a value from an empty iterator with no initial value");
        }
    }
    if (arguments.length > 1) {
        result = callback.call(thisp, result, nextEntry.value, i, self);
    } else {
        result = nextEntry.value;
    }
    i++;
    // remaining entries
    while (true) {
        nextEntry = self.next();
        if(nextEntry.done === true) {
            return result;
        }
        result = callback.call(thisp, result, nextEntry.value, i, self);
        i++;
    }

};

Iterator.prototype.concat = function () {
    return Iterator.concat(
        Array.prototype.concat.apply(this, arguments)
    );
};

Iterator.prototype.dropWhile = function (callback /*, thisp */) {
    var self = Iterator(this),
        thisp = arguments[1],
        stopped = false,
        stopValue,
        nextEntry,
        i = 0;

    if (Object.prototype.toString.call(callback) != "[object Function]")
        throw new TypeError();

    while (true) {
        nextEntry = self.next();
        if(nextEntry.done === true) {
            break;
        }
        if (!callback.call(thisp, nextEntry.value, i, self)) {
            stopped = true;
            stopValue = nextEntry.value;
            break;
        }
        i++;
    }

    if (stopped) {
        return self.constructor([stopValue]).concat(self);
    } else {
        return self.constructor([]);
    }
};

Iterator.prototype.takeWhile = function (callback /*, thisp*/) {
    var self = Iterator(this),
        thisp = arguments[1],
        nextEntry,
        i = 0;

    if (Object.prototype.toString.call(callback) != "[object Function]")
        throw new TypeError();

    return new self.constructor(function () {
        if(self._iterationObject.done !== true) {
            var value = self.next().value;
            if(callback.call(thisp, value, i++, self)) {
                self._iterationObject.value = value;
            }
            else {
                self._iterationObject.done = true;
                self._iterationObject.value = void 0;
            }
        }
        return self._iterationObject;
    });

};

Iterator.prototype.zipIterator = function () {
    return Iterator.unzip(
        Array.prototype.concat.apply(this, arguments)
    );
};

Iterator.prototype.enumerateIterator = function (start) {
    return Iterator.count(start).zipIterator(this);
};

// creates an iterator for Array and String
Iterator.iterate = function (iterable) {
    var start;
    start = 0;
    return new Iterator(function () {
        // advance to next owned entry
        if (typeof iterable === "object") {
            while (!(start in iterable)) {
                // deliberately late bound
                if (start >= iterable.length) {
                    this._iterationObject.done = true;
                    this._iterationObject.value = void 0;
                    break;
                }
                else start += 1;
            }
        } else if (start >= iterable.length) {
            this._iterationObject.done = true;
            this._iterationObject.value = void 0;
        }

        if(!this._iterationObject.done) {
            this._iterationObject.value = iterable[start];
            start += 1;
        }
        return this._iterationObject;
    });
};

Iterator.cycle = function (cycle, times) {
    var next;
    if (arguments.length < 2)
        times = Infinity;
    //cycle = Iterator(cycle).toArray();
    return new Iterator(function () {
        var iteration, nextEntry;

        if(next) {
            nextEntry = next();
        }

        if(!next || nextEntry.done === true) {
            if (times > 0) {
                times--;
                iteration = Iterator.iterate(cycle);
                nextEntry = (next = iteration.next.bind(iteration))();
            }
            else {
                this._iterationObject.done = true;
                nextEntry = this._iterationObject;            }
        }
        return nextEntry;
    });
};

Iterator.concat = function (iterators) {
    iterators = Iterator(iterators);
    var next;
    return new Iterator(function (){
        var iteration, nextEntry;
        if(next) nextEntry = next();
        if(!nextEntry || nextEntry.done === true) {
            nextEntry = iterators.next();
            if(nextEntry.done === false) {
                iteration = Iterator(nextEntry.value);
                next = iteration.next.bind(iteration);
                return next();
            }
            else {
                return nextEntry;
            }
        }
        else return nextEntry;
    });
};

Iterator.unzip = function (iterators) {
    iterators = Iterator(iterators).map(Iterator);
    if (iterators.length === 0)
        return new Iterator([]);
    return new Iterator(function () {
        var stopped, nextEntry;
        var result = iterators.map(function (iterator) {
            nextEntry = iterator.next();
            if (nextEntry.done === true ) {
                stopped = true;
            }
            return nextEntry.value;
        });
        if (stopped) {
            this._iterationObject.done = true;
            this._iterationObject.value = void 0;
        }
        else {
            this._iterationObject.value = result;
        }
        return this._iterationObject;
    });
};

Iterator.zip = function () {
    return Iterator.unzip(
        Array.prototype.slice.call(arguments)
    );
};

Iterator.chain = function () {
    return Iterator.concat(
        Array.prototype.slice.call(arguments)
    );
};

Iterator.range = function (start, stop, step) {
    if (arguments.length < 3) {
        step = 1;
    }
    if (arguments.length < 2) {
        stop = start;
        start = 0;
    }
    start = start || 0;
    step = step || 1;
    return new Iterator(function () {
        if (start >= stop) {
            this._iterationObject.done = true;
            this._iterationObject.value = void 0;
        }
        var result = start;
        start += step;
        this._iterationObject.value = result;

        return this._iterationObject;
    });
};

Iterator.count = function (start, step) {
    return Iterator.range(start, Infinity, step);
};

Iterator.repeat = function (value, times) {
    return new Iterator.range(times).mapIterator(function () {
        return value;
    });
};

},{"./generic-collection":6,"./shim-object":17}],11:[function(require,module,exports){
/*
    Copyright (c) 2016, Montage Studio Inc. All Rights Reserved.
    3-Clause BSD License
    https://github.com/montagejs/montage/blob/master/LICENSE.md
*/

var Map = require("../_map");

var ObjectChangeDescriptor = module.exports.ObjectChangeDescriptor = function ObjectChangeDescriptor(name) {
    this.name = name;
    this.isActive = false;
    this._willChangeListeners = null;
    this._changeListeners = null;
	return this;
}

Object.defineProperties(ObjectChangeDescriptor.prototype,{
    name: {
		value:null,
		writable: true
	},
    isActive: {
		value:false,
		writable: true
	},
	_willChangeListeners: {
		value:null,
		writable: true
	},
	willChangeListeners: {
		get: function() {
			return this._willChangeListeners || (this._willChangeListeners = new this.willChangeListenersRecordConstructor(this.name));
		}
	},
	_changeListeners: {
		value:null,
		writable: true
	},
    changeListeners: {
		get: function() {
			return this._changeListeners || (this._changeListeners = new this.changeListenersRecordConstructor(this.name));
		}
	},
    changeListenersRecordConstructor: {
        value:ChangeListenersRecord,
        writable: true
    },
    willChangeListenersRecordConstructor: {
        value:ChangeListenersRecord,
        writable: true
    }

});

var ListenerGhost = module.exports.ListenerGhost = Object.create(null);
var ChangeListenerSpecificHandlerMethodName = new Map();

 module.exports.ChangeListenersRecord = ChangeListenersRecord;
function ChangeListenersRecord(name) {
    var specificHandlerMethodName = ChangeListenerSpecificHandlerMethodName.get(name);
    if(!specificHandlerMethodName) {
        specificHandlerMethodName = "handle";
        specificHandlerMethodName += name;
        specificHandlerMethodName += "Change";
        ChangeListenerSpecificHandlerMethodName.set(name,specificHandlerMethodName);
    }
    this._current = null;
    this._current = null;
    this.specificHandlerMethodName = specificHandlerMethodName;
    return this;
}

Object.defineProperties(ChangeListenersRecord.prototype,{
    _current: {
		value: null,
		writable: true
	},
	current: {
		get: function() {
            // if(this._current) {
            //     console.log(this.constructor.name," with ",this._current.length," listeners: ", this._current);
            // }
            return this._current;
            //return this._current || (this._current = []);
		},
        set: function(value) {
            this._current = value;
        }
	},
    ListenerGhost: {
        value:ListenerGhost,
        writable: true
    },
    ghostCount: {
        value:0,
        writable: true
    },
    maxListenerGhostRatio: {
        value:0.3,
        writable: true
    },
    listenerGhostFilter: {
        value: function listenerGhostFilter(value) {
          return value !== this.ListenerGhost;
      }
    },
    removeCurrentGostListenersIfNeeded: {
        value: function() {
            if(this._current && this.ghostCount/this._current.length>this.maxListenerGhostRatio) {
                this.ghostCount = 0;
                this._current = this._current.filter(this.listenerGhostFilter,this);
            }
            return this._current;
        }
    },
    dispatchBeforeChange: {
        value: false,
        writable: true
    },
    genericHandlerMethodName: {
		value: "handlePropertyChange",
        writable: true
	}
});

module.exports.WillChangeListenersRecord = WillChangeListenersRecord;
var WillChangeListenerSpecificHandlerMethodName = new Map();
function WillChangeListenersRecord(name) {
    var specificHandlerMethodName = WillChangeListenerSpecificHandlerMethodName.get(name);
    if(!specificHandlerMethodName) {
        specificHandlerMethodName = "handle";
        specificHandlerMethodName += name;
        specificHandlerMethodName += "WillChange";
        WillChangeListenerSpecificHandlerMethodName.set(name,specificHandlerMethodName);
    }
    this.specificHandlerMethodName = specificHandlerMethodName;
	return this;
}
WillChangeListenersRecord.prototype = new ChangeListenersRecord();
WillChangeListenersRecord.prototype.constructor = WillChangeListenersRecord;
WillChangeListenersRecord.prototype.genericHandlerMethodName = "handlePropertyWillChange";

},{"../_map":4}],12:[function(require,module,exports){
"use strict";

var WeakMap = require("weak-map"),
    Map = require("../_map"),
    ChangeDescriptor = require("./change-descriptor"),
    ObjectChangeDescriptor = ChangeDescriptor.ObjectChangeDescriptor,
    ChangeListenersRecord = ChangeDescriptor.ChangeListenersRecord,
    ListenerGhost = ChangeDescriptor.ListenerGhost;

module.exports = MapChanges;
function MapChanges() {
    throw new Error("Can't construct. MapChanges is a mixin.");
}

var object_owns = Object.prototype.hasOwnProperty;

/*
    Object map change descriptors carry information necessary for adding,
    removing, dispatching, and shorting events to listeners for map changes
    for a particular key on a particular object.  These descriptors are used
    here for shallow map changes.

    {
        willChangeListeners:Array(Fgunction)
        changeListeners:Array(Function)
    }
*/

var mapChangeDescriptors = new WeakMap();

function MapChangeDescriptor(name) {
    this.name = name;
    this.isActive = false;
    this._willChangeListeners = null;
    this._changeListeners = null;
};

MapChangeDescriptor.prototype = new ObjectChangeDescriptor();
MapChangeDescriptor.prototype.constructor = MapChangeDescriptor;

MapChangeDescriptor.prototype.changeListenersRecordConstructor = MapChangeListenersRecord;
MapChangeDescriptor.prototype.willChangeListenersRecordConstructor = MapWillChangeListenersRecord;

var MapChangeListenersSpecificHandlerMethodName = new Map();

function MapChangeListenersRecord(name) {
    var specificHandlerMethodName = MapChangeListenersSpecificHandlerMethodName.get(name);
    if(!specificHandlerMethodName) {
        specificHandlerMethodName = "handle";
        specificHandlerMethodName += name.slice(0, 1).toUpperCase();
        specificHandlerMethodName += name.slice(1);
        specificHandlerMethodName += "MapChange";
        MapChangeListenersSpecificHandlerMethodName.set(name,specificHandlerMethodName);
    }
    this.specificHandlerMethodName = specificHandlerMethodName;
	return this;
}
MapChangeListenersRecord.prototype = new ChangeListenersRecord();
MapChangeListenersRecord.prototype.constructor = MapChangeListenersRecord;
MapChangeListenersRecord.prototype.genericHandlerMethodName = "handleMapChange";

var MapWillChangeListenersSpecificHandlerMethodName = new Map();

function MapWillChangeListenersRecord(name) {
    var specificHandlerMethodName = MapWillChangeListenersSpecificHandlerMethodName.get(name);
    if(!specificHandlerMethodName) {
        specificHandlerMethodName = "handle";
        specificHandlerMethodName += name.slice(0, 1).toUpperCase();
        specificHandlerMethodName += name.slice(1);
        specificHandlerMethodName += "MapWillChange";
        MapWillChangeListenersSpecificHandlerMethodName.set(name,specificHandlerMethodName);
    }
    this.specificHandlerMethodName = specificHandlerMethodName;
    return this;
}
MapWillChangeListenersRecord.prototype = new ChangeListenersRecord();
MapWillChangeListenersRecord.prototype.constructor = MapWillChangeListenersRecord;
MapWillChangeListenersRecord.prototype.genericHandlerMethodName = "handleMapWillChange";


MapChanges.prototype.getAllMapChangeDescriptors = function () {
    if (!mapChangeDescriptors.has(this)) {
        mapChangeDescriptors.set(this, new Map());
    }
    return mapChangeDescriptors.get(this);
};

MapChanges.prototype.getMapChangeDescriptor = function (token) {
    var tokenChangeDescriptors = this.getAllMapChangeDescriptors();
    token = token || "";
    if (!tokenChangeDescriptors.has(token)) {
        tokenChangeDescriptors.set(token, new MapChangeDescriptor(token));
    }
    return tokenChangeDescriptors.get(token);
};

var ObjectsDispatchesMapChanges = new WeakMap(),
    dispatchesMapChangesGetter = function() {
        return ObjectsDispatchesMapChanges.get(this);
    },
    dispatchesMapChangesSetter = function(value) {
        return ObjectsDispatchesMapChanges.set(this,value);
    },
    dispatchesChangesMethodName = "dispatchesMapChanges",
    dispatchesChangesPropertyDescriptor = {
        get: dispatchesMapChangesGetter,
        set: dispatchesMapChangesSetter,
        configurable: true,
        enumerable: false
    };

MapChanges.prototype.addMapChangeListener = function addMapChangeListener(listener, token, beforeChange) {
    //console.log("this:",this," addMapChangeListener(",listener,",",token,",",beforeChange);

    if (!this.isObservable && this.makeObservable) {
        // for Array
        this.makeObservable();
    }
    var descriptor = this.getMapChangeDescriptor(token);
    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    // console.log("addMapChangeListener()",listener, token);
    //console.log("this:",this," addMapChangeListener()  listeners._current is ",listeners._current);

    if(!listeners._current) {
        listeners._current = listener;
    }
    else if(!Array.isArray(listeners._current)) {
        listeners._current = [listeners._current,listener]
    }
    else {
        listeners._current.push(listener);
    }

    if(Object.getOwnPropertyDescriptor((this.__proto__||Object.getPrototypeOf(this)),dispatchesChangesMethodName) === void 0) {
        Object.defineProperty((this.__proto__||Object.getPrototypeOf(this)), dispatchesChangesMethodName, dispatchesChangesPropertyDescriptor);
    }
    this.dispatchesMapChanges = true;

    var self = this;
    return function cancelMapChangeListener() {
        if (!self) {
            // TODO throw new Error("Can't remove map change listener again");
            return;
        }
        self.removeMapChangeListener(listener, token, beforeChange);
        self = null;
    };
};

MapChanges.prototype.removeMapChangeListener = function (listener, token, beforeChange) {
    var descriptor = this.getMapChangeDescriptor(token);

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    if(listeners._current) {
        if(listeners._current === listener) {
            listeners._current = null;
        }
        else {
            var index = listeners._current.lastIndexOf(listener);
            if (index === -1) {
                throw new Error("Can't remove map change listener: does not exist: token " + JSON.stringify(token));
            }
            else {
                if(descriptor.isActive) {
                    listeners.ghostCount = listeners.ghostCount+1
                    listeners._current[index]=ListenerGhost
                }
                else {
                    listeners._current.spliceOne(index);
                }
            }
        }
    }


};

MapChanges.prototype.dispatchMapChange = function (key, value, beforeChange) {
    var descriptors = this.getAllMapChangeDescriptors(),
        Ghost = ListenerGhost;

    descriptors.forEach(function (descriptor, token) {

        if (descriptor.isActive) {
            return;
        }

        var listeners = beforeChange ? descriptor.willChangeListeners : descriptor.changeListeners;
        if(listeners && listeners._current) {

            var tokenName = listeners.specificHandlerMethodName;
            if(Array.isArray(listeners._current) && listeners._current.length) {

                //removeGostListenersIfNeeded returns listeners.current or a new filtered one when conditions are met
                var currentListeners = listeners.removeCurrentGostListenersIfNeeded(),
                    i, countI, listener;
                descriptor.isActive = true;

                try {
                    for(i=0, countI = currentListeners.length;i<countI;i++) {
                        // dispatch to each listener
                        if ((listener = currentListeners[i]) !== Ghost) {
                            if (listener[tokenName]) {
                                listener[tokenName](value, key, this);
                            } else if (listener.call) {
                                listener.call(listener, value, key, this);
                            } else {
                                throw new Error("Handler " + listener + " has no method " + tokenName + " and is not callable");
                            }
                        }
                    }
                } finally {
                    descriptor.isActive = false;
                }
            }
            else {
                descriptor.isActive = true;
                // dispatch each listener

                try {
                    listener = listeners._current;
                    if (listener[tokenName]) {
                        listener[tokenName](value, key, this);
                    } else if (listener.call) {
                        listener.call(listener, value, key, this);
                    } else {
                        throw new Error("Handler " + listener + " has no method " + tokenName + " and is not callable");
                    }
                } finally {
                    descriptor.isActive = false;
                }

            }
        }

    }, this);
};

MapChanges.prototype.addBeforeMapChangeListener = function (listener, token) {
    return this.addMapChangeListener(listener, token, true);
};

MapChanges.prototype.removeBeforeMapChangeListener = function (listener, token) {
    return this.removeMapChangeListener(listener, token, true);
};

MapChanges.prototype.dispatchBeforeMapChange = function (key, value) {
    return this.dispatchMapChange(key, value, true);
};

},{"../_map":4,"./change-descriptor":11,"weak-map":24}],13:[function(require,module,exports){
/*
    Based in part on observable arrays from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

/*
    This module is responsible for observing changes to owned properties of
    objects and changes to the content of arrays caused by method calls.
    The interface for observing array content changes establishes the methods
    necessary for any collection with observable content.
*/



// objectHasOwnProperty.call(myObject, key) will be used instead of
// myObject.hasOwnProperty(key) to allow myObject have defined
// a own property called "hasOwnProperty".

var objectHasOwnProperty = Object.prototype.hasOwnProperty;

// Object property descriptors carry information necessary for adding,
// removing, dispatching, and shorting events to listeners for property changes
// for a particular key on a particular object.  These descriptors are used
// here for shallow property changes.  The current listeners are the ones
// modified by add and remove own property change listener methods.  During
// property change dispatch, we capture a snapshot of the current listeners in
// the active change listeners array.  The descriptor also keeps a memo of the
// corresponding handler method names.
//
// {
//     willChangeListeners:{current, active:Array<Function>, ...method names}
//     changeListeners:{current, active:Array<Function>, ...method names}
// }

// Maybe remove entries from this table if the corresponding object no longer
// has any property change listeners for any key.  However, the cost of
// book-keeping is probably not warranted since it would be rare for an
// observed object to no longer be observed unless it was about to be disposed
// of or reused as an observable.  The only benefit would be in avoiding bulk
// calls to dispatchOwnPropertyChange events on objects that have no listeners.

//  To observe shallow property changes for a particular key of a particular
//  object, we install a property descriptor on the object that overrides the previous
//  descriptor.  The overridden descriptors are stored in this weak map.  The
//  weak map associates an object with another object that maps property names
//  to property descriptors.
//
//  object.__overriddenPropertyDescriptors__[key]
//
//  We retain the old descriptor for various purposes.  For one, if the property
//  is no longer being observed by anyone, we revert the property descriptor to
//  the original.  For "value" descriptors, we store the actual value of the
//  descriptor on the overridden descriptor, so when the property is reverted, it
//  retains the most recently set value.  For "get" and "set" descriptors,
//  we observe then forward "get" and "set" operations to the original descriptor.

module.exports = PropertyChanges;

function PropertyChanges() {
    throw new Error("This is an abstract interface. Mix it. Don't construct it");
}

require("../shim");
var Map = require("../_map");
var WeakMap = require("../weak-map");
var ChangeDescriptor = require("./change-descriptor"),
    ObjectChangeDescriptor = ChangeDescriptor.ObjectChangeDescriptor,
    ListenerGhost = ChangeDescriptor.ListenerGhost;

PropertyChanges.debug = true;

var ObjectsPropertyChangeListeners = new WeakMap();

var ObjectChangeDescriptorName = new Map();

PropertyChanges.ObjectChangeDescriptor = function() {

}

PropertyChanges.prototype.getOwnPropertyChangeDescriptor = function (key) {
    var objectPropertyChangeDescriptors = ObjectsPropertyChangeListeners.get(this), keyChangeDescriptor;
    if (!objectPropertyChangeDescriptors) {
        objectPropertyChangeDescriptors = Object.create(null);
        ObjectsPropertyChangeListeners.set(this,objectPropertyChangeDescriptors);
    }
    if ( (keyChangeDescriptor = objectPropertyChangeDescriptors[key]) === void 0) {
        var propertyName = ObjectChangeDescriptorName.get(key);
        if(!propertyName) {
            propertyName = String(key);
            propertyName = propertyName && propertyName[0].toUpperCase() + propertyName.slice(1);
            ObjectChangeDescriptorName.set(key,propertyName);
        }
        return objectPropertyChangeDescriptors[key] = new ObjectChangeDescriptor(propertyName);
    }
    return keyChangeDescriptor;
};

PropertyChanges.prototype.hasOwnPropertyChangeDescriptor = function (key) {
    var objectPropertyChangeDescriptors = ObjectsPropertyChangeListeners.get(this);
    if (!objectPropertyChangeDescriptors) {
        return false;
    }
    if (!key) {
        return true;
    }
    if (objectPropertyChangeDescriptors[key] === void 0) {
        return false;
    }
    return true;
};

PropertyChanges.prototype.addOwnPropertyChangeListener = function (key, listener, beforeChange) {
    if (this.makeObservable && !this.isObservable) {
        this.makeObservable(); // particularly for observable arrays, for
        // their length property
    }
    var descriptor = PropertyChanges.getOwnPropertyChangeDescriptor(this, key),
        listeners = beforeChange ? descriptor.willChangeListeners : descriptor.changeListeners;

    PropertyChanges.makePropertyObservable(this, key);

    if(!listeners._current) {
        listeners._current = listener;
    }
    else if(!Array.isArray(listeners._current)) {
        listeners._current = [listeners._current,listener]
    }
    else {
        listeners._current.push(listener);
    }

    var self = this;
    return function cancelOwnPropertyChangeListener() {
        PropertyChanges.removeOwnPropertyChangeListener(self, key, listener, beforeChange);
        self = null;
    };
};

PropertyChanges.prototype.addBeforeOwnPropertyChangeListener = function (key, listener) {
    return PropertyChanges.addOwnPropertyChangeListener(this, key, listener, true);
};

PropertyChanges.prototype.removeOwnPropertyChangeListener = function removeOwnPropertyChangeListener(key, listener, beforeChange) {
    var descriptor = PropertyChanges.getOwnPropertyChangeDescriptor(this, key);

    var listeners;
    if (beforeChange) {
        listeners = descriptor._willChangeListeners;
    } else {
        listeners = descriptor._changeListeners;
    }

    if(listeners) {
        if(listeners._current) {
            if(listeners._current === listener) {
                listeners._current = null;
            }
            else {

                var index = listeners._current.lastIndexOf(listener);
                if (index === -1) {
                    throw new Error("Can't remove property change listener: does not exist: property name" + JSON.stringify(key));
                }
                if(descriptor.isActive) {
                    listeners.ghostCount = listeners.ghostCount+1;
                    listeners._current[index]=removeOwnPropertyChangeListener.ListenerGhost;
                }
                else {
                    listeners._current.spliceOne(index);
                }
            }
        }
    }
};
PropertyChanges.prototype.removeOwnPropertyChangeListener.ListenerGhost = ListenerGhost;

PropertyChanges.prototype.removeBeforeOwnPropertyChangeListener = function (key, listener) {
    return PropertyChanges.removeOwnPropertyChangeListener(this, key, listener, true);
};

PropertyChanges.prototype.dispatchOwnPropertyChange = function dispatchOwnPropertyChange(key, value, beforeChange) {
    var descriptor = PropertyChanges.getOwnPropertyChangeDescriptor(this, key),
        listeners;

    if (!descriptor.isActive) {
        descriptor.isActive = true;
        listeners = beforeChange ? descriptor._willChangeListeners: descriptor._changeListeners;
        try {
            dispatchOwnPropertyChange.dispatchEach(listeners, key, value, this);
        } finally {
            descriptor.isActive = false;
        }
    }
};
PropertyChanges.prototype.dispatchOwnPropertyChange.dispatchEach = dispatchEach;

function dispatchEach(listeners, key, value, object) {
    if(listeners && listeners._current) {
        // copy snapshot of current listeners to active listeners
        var current,
            listener,
            i,
            countI,
            thisp,
            specificHandlerMethodName = listeners.specificHandlerMethodName,
            genericHandlerMethodName = listeners.genericHandlerMethodName,
            Ghost = ListenerGhost;

        if(Array.isArray(listeners._current)) {
            //removeGostListenersIfNeeded returns listeners.current or a new filtered one when conditions are met
            current = listeners.removeCurrentGostListenersIfNeeded();
            //We use a for to guarantee we won't dispatch to listeners that would be added after we started
            for(i=0, countI = current.length;i<countI;i++) {
                if ((thisp = current[i]) !== Ghost) {
                    //This is fixing the issue causing a regression in Montage's repetition
                    listener = (
                        thisp[specificHandlerMethodName] ||
                        thisp[genericHandlerMethodName] ||
                        thisp
                    );
                    if (!listener.call) {
                        throw new Error("No event listener for " + listeners.specificHandlerName + " or " + listeners.genericHandlerName + " or call on " + listener);
                    }
                    listener.call(thisp, value, key, object);
                }
            }
        }
        else {
            thisp = listeners._current;
            listener = (
                thisp[specificHandlerMethodName] ||
                thisp[genericHandlerMethodName] ||
                thisp
            );
            if (!listener.call) {
                throw new Error("No event listener for " + listeners.specificHandlerName + " or " + listeners.genericHandlerName + " or call on " + listener);
            }
            listener.call(thisp, value, key, object);
        }

    }
}

dispatchEach.ListenerGhost = ListenerGhost;


PropertyChanges.prototype.dispatchBeforeOwnPropertyChange = function (key, listener) {
    return PropertyChanges.dispatchOwnPropertyChange(this, key, listener, true);
};

var ObjectsOverriddenPropertyDescriptors = new WeakMap(),
    Objects__state__ = new WeakMap(),
    propertyListener = {
        get: void 0,
        set: void 0,
        configurable: true,
        enumerable: false
    };

PropertyChanges.prototype.makePropertyObservable = function (key) {
    // arrays are special.  we do not support direct setting of properties
    // on an array.  instead, call .set(index, value).  this is observable.
    // 'length' property is observable for all mutating methods because
    // our overrides explicitly dispatch that change.


    var overriddenPropertyDescriptors = ObjectsOverriddenPropertyDescriptors.get(this);
    if (overriddenPropertyDescriptors && overriddenPropertyDescriptors.get(key) !== void 0) {
        // if we have already recorded an overridden property descriptor,
        // we have already installed the observer, so short-here
        return;
    }

    // memoize overridden property descriptor table
    if (!overriddenPropertyDescriptors) {
        if (Array.isArray(this)) {
            return;
        }
        if (!Object.isExtensible(this)) {
            throw new Error("Can't make property " + JSON.stringify(key) + " observable on " + this + " because object is not extensible");
        }
        overriddenPropertyDescriptors = new Map();
        ObjectsOverriddenPropertyDescriptors.set(this,overriddenPropertyDescriptors);
    }

    // var state = Objects__state__.get(this);
    // if (typeof state !== "object") {
    //     Objects__state__.set(this,(state = {}));
    // }
    // state[key] = this[key];



    // walk up the prototype chain to find a property descriptor for
    // the property name
    var overriddenDescriptor;
    var attached = this;
    do {
        overriddenDescriptor = Object.getOwnPropertyDescriptor(attached, key);
        if (overriddenDescriptor) {
            break;
        }
        attached = Object.getPrototypeOf(attached);
    } while (attached);
    // or default to an undefined value
    if (!overriddenDescriptor) {
        overriddenDescriptor = {
            value: void 0,
            enumerable: true,
            writable: true,
            configurable: true
        };
    } else {
        if (!overriddenDescriptor.configurable) {
            return;
        }
        if (!overriddenDescriptor.writable && !overriddenDescriptor.set) {
            return;
        }
    }

    // memoize the descriptor so we know not to install another layer,
    // and so we can reuse the overridden descriptor when uninstalling
    overriddenPropertyDescriptors.set(key,overriddenDescriptor);


    // TODO reflect current value on a displayed property

    // in both of these new descriptor variants, we reuse the overridden
    // descriptor to either store the current value or apply getters
    // and setters.  this is handy since we can reuse the overridden
    // descriptor if we uninstall the observer.  We even preserve the
    // assignment semantics, where we get the value from up the
    // prototype chain, and set as an owned property.
    if ('value' in overriddenDescriptor) {
        propertyListener.get = function () {
            return overriddenDescriptor.value;
        };
        propertyListener.set = function dispatchingSetter(value) {
            var descriptor,
                isActive,
                overriddenDescriptor = dispatchingSetter.overriddenDescriptor;

            if (value !== overriddenDescriptor.value) {
                descriptor = dispatchingSetter.descriptor;
                if (!(isActive = descriptor.isActive)) {
                    descriptor.isActive = true;
                    try {
                        dispatchingSetter.dispatchEach(descriptor._willChangeListeners, key, overriddenDescriptor.value, this);
                    } finally {}
                }
                overriddenDescriptor.value = value;
                if (!isActive) {
                    try {
                        dispatchingSetter.dispatchEach(descriptor._changeListeners, key, value, this);
                    } finally {
                        descriptor.isActive = false;
                    }
                }
            }
        };
        propertyListener.set.dispatchEach = dispatchEach;
        propertyListener.set.overriddenDescriptor = overriddenDescriptor;
        propertyListener.set.descriptor = ObjectsPropertyChangeListeners.get(this)[key];

        propertyListener.enumerable = overriddenDescriptor.enumerable;

        propertyListener.configurable = true

    } else { // 'get' or 'set', but not necessarily both
            propertyListener.get = overriddenDescriptor.get;
            propertyListener.set = function dispatchingSetter() {
                var formerValue = dispatchingSetter.overriddenGetter.call(this),
                    descriptor,
                    isActive,
                    newValue;


                    if(arguments.length === 1) {
                        dispatchingSetter.overriddenSetter.call(this,arguments[0]);
                    }
                    else if(arguments.length === 2) {
                        dispatchingSetter.overriddenSetter.call(this,arguments[0],arguments[1]);
                    }
                    else {
                        dispatchingSetter.overriddenSetter.apply(this, arguments);
                    }

                if ((newValue = dispatchingSetter.overriddenGetter.call(this)) !== formerValue) {
                    descriptor = dispatchingSetter.descriptor;
                    if (!(isActive = descriptor.isActive)) {
                        descriptor.isActive = true;
                        try {
                            dispatchingSetter.dispatchEach(descriptor._willChangeListeners, key, formerValue, this);
                        } finally {}
                    }
                    if (!isActive) {
                        try {
                            dispatchingSetter.dispatchEach(descriptor._changeListeners, key, newValue, this);
                        } finally {
                            descriptor.isActive = false;
                        }
                    }
                }
            };
            propertyListener.enumerable = overriddenDescriptor.enumerable;
            propertyListener.configurable = true;
        propertyListener.set.dispatchEach = dispatchEach;
        propertyListener.set.overriddenSetter = overriddenDescriptor.set;
        propertyListener.set.overriddenGetter = overriddenDescriptor.get;
        propertyListener.set.descriptor = ObjectsPropertyChangeListeners.get(this)[key];
    }

    Object.defineProperty(this, key, propertyListener);
};

// constructor functions

PropertyChanges.getOwnPropertyChangeDescriptor = function (object, key) {
    if (object.getOwnPropertyChangeDescriptor) {
        return object.getOwnPropertyChangeDescriptor(key);
    } else {
        return PropertyChanges.prototype.getOwnPropertyChangeDescriptor.call(object, key);
    }
};

PropertyChanges.hasOwnPropertyChangeDescriptor = function (object, key) {
    if (object.hasOwnPropertyChangeDescriptor) {
        return object.hasOwnPropertyChangeDescriptor(key);
    } else {
        return PropertyChanges.prototype.hasOwnPropertyChangeDescriptor.call(object, key);
    }
};

PropertyChanges.addOwnPropertyChangeListener = function (object, key, listener, beforeChange) {
    if (Object.isObject(object)) {
        return object.addOwnPropertyChangeListener
            ? object.addOwnPropertyChangeListener(key, listener, beforeChange)
            : this.prototype.addOwnPropertyChangeListener.call(object, key, listener, beforeChange);
    }
};

PropertyChanges.removeOwnPropertyChangeListener = function (object, key, listener, beforeChange) {
    if (!Object.isObject(object)) {
    } else if (object.removeOwnPropertyChangeListener) {
        return object.removeOwnPropertyChangeListener(key, listener, beforeChange);
    } else {
        return PropertyChanges.prototype.removeOwnPropertyChangeListener.call(object, key, listener, beforeChange);
    }
};

PropertyChanges.dispatchOwnPropertyChange = function (object, key, value, beforeChange) {
    if (!Object.isObject(object)) {
    } else if (object.dispatchOwnPropertyChange) {
        return object.dispatchOwnPropertyChange(key, value, beforeChange);
    } else {
        return PropertyChanges.prototype.dispatchOwnPropertyChange.call(object, key, value, beforeChange);
    }
};

PropertyChanges.addBeforeOwnPropertyChangeListener = function (object, key, listener) {
    return PropertyChanges.addOwnPropertyChangeListener(object, key, listener, true);
};

PropertyChanges.removeBeforeOwnPropertyChangeListener = function (object, key, listener) {
    return PropertyChanges.removeOwnPropertyChangeListener(object, key, listener, true);
};

PropertyChanges.dispatchBeforeOwnPropertyChange = function (object, key, value) {
    return PropertyChanges.dispatchOwnPropertyChange(object, key, value, true);
};

PropertyChanges.makePropertyObservable = function (object, key) {
    if (object.makePropertyObservable) {
        return object.makePropertyObservable(key);
    } else {
        return PropertyChanges.prototype.makePropertyObservable.call(object, key);
    }
};

},{"../_map":4,"../shim":19,"../weak-map":23,"./change-descriptor":11}],14:[function(require,module,exports){
"use strict";

//TODO:
// Remove Dict and use native Map as much as possible here
//Use ObjectChangeDescriptor to avoid creating useless arrays and benefit from similar gains made in property-changes


var WeakMap = require("weak-map"),
    Map = require("../_map"),
    ChangeDescriptor = require("./change-descriptor"),
    ObjectChangeDescriptor = ChangeDescriptor.ObjectChangeDescriptor,
    ChangeListenersRecord = ChangeDescriptor.ChangeListenersRecord,
    ListenerGhost = ChangeDescriptor.ListenerGhost;

var rangeChangeDescriptors = new WeakMap(); // {isActive, willChangeListeners, changeListeners}


//
function RangeChangeDescriptor(name) {
    this.name = name;
    this.isActive = false;
    this._willChangeListeners = null;
    this._changeListeners = null;
};

RangeChangeDescriptor.prototype = new ObjectChangeDescriptor();
RangeChangeDescriptor.prototype.constructor = RangeChangeDescriptor;

RangeChangeDescriptor.prototype.changeListenersRecordConstructor = RangeChangeListenersRecord;
RangeChangeDescriptor.prototype.willChangeListenersRecordConstructor = RangeWillChangeListenersRecord;
Object.defineProperty(RangeChangeDescriptor.prototype,"active",{
    get: function() {
        return this._active || (this._active = this._current ? this._current.slice():[]);
    }
});


var RangeChangeListenersSpecificHandlerMethodName = new Map();

function RangeChangeListenersRecord(name) {
    var specificHandlerMethodName = RangeChangeListenersSpecificHandlerMethodName.get(name);
    if(!specificHandlerMethodName) {
        specificHandlerMethodName = "handle";
        specificHandlerMethodName += name.slice(0, 1).toUpperCase();
        specificHandlerMethodName += name.slice(1);
        specificHandlerMethodName += "RangeChange";
        RangeChangeListenersSpecificHandlerMethodName.set(name,specificHandlerMethodName);
    }
    this.specificHandlerMethodName = specificHandlerMethodName;
	return this;
}
RangeChangeListenersRecord.prototype = new ChangeListenersRecord();
RangeChangeListenersRecord.prototype.constructor = RangeChangeListenersRecord;

var RangeWillChangeListenersSpecificHandlerMethodName = new Map();

function RangeWillChangeListenersRecord(name) {
    var specificHandlerMethodName = RangeWillChangeListenersSpecificHandlerMethodName.get(name);
    if(!specificHandlerMethodName) {
        specificHandlerMethodName = "handle";
        specificHandlerMethodName += name.slice(0, 1).toUpperCase();
        specificHandlerMethodName += name.slice(1);
        specificHandlerMethodName += "RangeWillChange";
        RangeWillChangeListenersSpecificHandlerMethodName.set(name,specificHandlerMethodName);
    }
    this.specificHandlerMethodName = specificHandlerMethodName;
    return this;
}
RangeWillChangeListenersRecord.prototype = new ChangeListenersRecord();
RangeWillChangeListenersRecord.prototype.constructor = RangeWillChangeListenersRecord;

module.exports = RangeChanges;
function RangeChanges() {
    throw new Error("Can't construct. RangeChanges is a mixin.");
}

RangeChanges.prototype.getAllRangeChangeDescriptors = function () {
    if (!rangeChangeDescriptors.has(this)) {
        rangeChangeDescriptors.set(this, new Map());
    }
    return rangeChangeDescriptors.get(this);
};

RangeChanges.prototype.getRangeChangeDescriptor = function (token) {
    var tokenChangeDescriptors = this.getAllRangeChangeDescriptors();
    token = token || "";
    if (!tokenChangeDescriptors.has(token)) {
        tokenChangeDescriptors.set(token, new RangeChangeDescriptor(token));
    }
    return tokenChangeDescriptors.get(token);
};

var ObjectsDispatchesRangeChanges = new WeakMap(),
    dispatchesRangeChangesGetter = function() {
        return ObjectsDispatchesRangeChanges.get(this);
    },
    dispatchesRangeChangesSetter = function(value) {
        return ObjectsDispatchesRangeChanges.set(this,value);
    },
    dispatchesChangesMethodName = "dispatchesRangeChanges",
    dispatchesChangesPropertyDescriptor = {
        get: dispatchesRangeChangesGetter,
        set: dispatchesRangeChangesSetter,
        configurable: true,
        enumerable: false
    };

RangeChanges.prototype.addRangeChangeListener = function addRangeChangeListener(listener, token, beforeChange) {
    // a concession for objects like Array that are not inherently observable
    if (!this.isObservable && this.makeObservable) {
        this.makeObservable();
    }

    var descriptor = this.getRangeChangeDescriptor(token);

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    // even if already registered
    if(!listeners._current) {
        listeners._current = listener;
    }
    else if(!Array.isArray(listeners._current)) {
        listeners._current = [listeners._current,listener]
    }
    else {
        listeners._current.push(listener);
    }

    if(Object.getOwnPropertyDescriptor((this.__proto__||Object.getPrototypeOf(this)),dispatchesChangesMethodName) === void 0) {
        Object.defineProperty((this.__proto__||Object.getPrototypeOf(this)), dispatchesChangesMethodName, dispatchesChangesPropertyDescriptor);
    }
    this.dispatchesRangeChanges = true;

    var self = this;
    return function cancelRangeChangeListener() {
        if (!self) {
            // TODO throw new Error("Range change listener " + JSON.stringify(token) + " has already been canceled");
            return;
        }
        self.removeRangeChangeListener(listener, token, beforeChange);
        self = null;
    };
};


RangeChanges.prototype.removeRangeChangeListener = function (listener, token, beforeChange) {
    var descriptor = this.getRangeChangeDescriptor(token);

    var listeners;
    if (beforeChange) {
        listeners = descriptor._willChangeListeners;
    } else {
        listeners = descriptor._changeListeners;
    }

    if(listeners._current) {
        if(listeners._current === listener) {
            listeners._current = null;
        }
        else {
            var index = listeners._current.lastIndexOf(listener);
            if (index === -1) {
                throw new Error("Can't remove range change listener: does not exist: token " + JSON.stringify(token));
            }
            else {
                if(descriptor.isActive) {
                    listeners.ghostCount = listeners.ghostCount+1
                    listeners._current[index]=ListenerGhost
                }
                else {
                    listeners._current.spliceOne(index);
                }
            }
        }
    }

};

RangeChanges.prototype.dispatchRangeChange = function (plus, minus, index, beforeChange) {
    var descriptors = this.getAllRangeChangeDescriptors();
    descriptors.dispatchBeforeChange = beforeChange;
    descriptors.forEach(function (descriptor, token, descriptors) {

        if (descriptor.isActive) {
            return;
        }

        // before or after
        var listeners = beforeChange ? descriptor._willChangeListeners : descriptor._changeListeners;
        if(listeners && listeners._current) {
            var tokenName = listeners.specificHandlerMethodName;
            if(Array.isArray(listeners._current)) {
                if(listeners._current.length) {
                    // notably, defaults to "handleRangeChange" or "handleRangeWillChange"
                    // if token is "" (the default)

                    descriptor.isActive = true;
                    // dispatch each listener
                    try {
                        var i,
                            countI,
                            listener,
                            //removeGostListenersIfNeeded returns listeners.current or a new filtered one when conditions are met
                            currentListeners = listeners.removeCurrentGostListenersIfNeeded(),
                            Ghost = ListenerGhost;
                        for(i=0, countI = currentListeners.length;i<countI;i++) {
                            if ((listener = currentListeners[i]) !== Ghost) {
                                if (listener[tokenName]) {
                                    listener[tokenName](plus, minus, index, this, beforeChange);
                                } else if (listener.call) {
                                    listener.call(this, plus, minus, index, this, beforeChange);
                                } else {
                                    throw new Error("Handler " + listener + " has no method " + tokenName + " and is not callable");
                                }
                            }
                        }
                    } finally {
                        descriptor.isActive = false;
                    }
                }
            }
            else {
                descriptor.isActive = true;
                // dispatch each listener
                try {
                    listener = listeners._current;
                    if (listener[tokenName]) {
                        listener[tokenName](plus, minus, index, this, beforeChange);
                    } else if (listener.call) {
                        listener.call(this, plus, minus, index, this, beforeChange);
                    } else {
                        throw new Error("Handler " + listener + " has no method " + tokenName + " and is not callable");
                    }
                } finally {
                    descriptor.isActive = false;
                }

            }
        }

    }, this);
};

RangeChanges.prototype.addBeforeRangeChangeListener = function (listener, token) {
    return this.addRangeChangeListener(listener, token, true);
};

RangeChanges.prototype.removeBeforeRangeChangeListener = function (listener, token) {
    return this.removeRangeChangeListener(listener, token, true);
};

RangeChanges.prototype.dispatchBeforeRangeChange = function (plus, minus, index) {
    return this.dispatchRangeChange(plus, minus, index, true);
};

},{"../_map":4,"./change-descriptor":11,"weak-map":24}],15:[function(require,module,exports){
"use strict";

/*
    Based in part on extras from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

var Function = require("./shim-function");
var GenericCollection = require("./generic-collection");
var GenericOrder = require("./generic-order");
var WeakMap = require("weak-map");

module.exports = Array;

var array_splice = Array.prototype.splice;
var array_slice = Array.prototype.slice;

Array.empty = [];

if (Object.freeze) {
    Object.freeze(Array.empty);
}

Array.from = function (values) {
    var array = [];
    array.addEach(values);
    return array;
};

Array.unzip = function (table) {
    var transpose = [];
    var length = Infinity;
    // compute shortest row
    for (var i = 0; i < table.length; i++) {
        var row = table[i];
        table[i] = row.toArray();
        if (row.length < length) {
            length = row.length;
        }
    }
    for (var i = 0; i < table.length; i++) {
        var row = table[i];
        for (var j = 0; j < row.length; j++) {
            if (j < length && j in row) {
                transpose[j] = transpose[j] || [];
                transpose[j][i] = row[j];
            }
        }
    }
    return transpose;
};

function define(key, value) {
    Object.defineProperty(Array.prototype, key, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: false
    });
}

define("addEach", GenericCollection.prototype.addEach);
define("deleteEach", GenericCollection.prototype.deleteEach);
define("toArray", GenericCollection.prototype.toArray);
define("toObject", GenericCollection.prototype.toObject);
define("all", GenericCollection.prototype.all);
define("any", GenericCollection.prototype.any);
define("min", GenericCollection.prototype.min);
define("max", GenericCollection.prototype.max);
define("sum", GenericCollection.prototype.sum);
define("average", GenericCollection.prototype.average);
define("only", GenericCollection.prototype.only);
define("flatten", GenericCollection.prototype.flatten);
define("zip", GenericCollection.prototype.zip);
define("enumerate", GenericCollection.prototype.enumerate);
define("group", GenericCollection.prototype.group);
define("sorted", GenericCollection.prototype.sorted);
define("reversed", GenericCollection.prototype.reversed);

define("constructClone", function (values) {
    var clone = new this.constructor();
    clone.addEach(values);
    return clone;
});

define("has", function (value, equals) {
    return this.find(value, equals) !== -1;
});

define("get", function (index, defaultValue) {
    if (+index !== index)
        throw new Error("Indicies must be numbers");
    if (!index in this) {
        return defaultValue;
    } else {
        return this[index];
    }
});

define("set", function (index, value) {
    this[index] = value;
    return true;
});

define("add", function (value) {
    this.push(value);
    return true;
});

define("delete", function (value, equals) {
    var index = this.find(value, equals);
    if (index !== -1) {
        this.spliceOne(index);
        return true;
    }
    return false;
});

define("deleteAll", function (value, equals) {
    equals = equals || this.contentEquals || Object.equals;
    var count = 0;
    for (var index = 0; index < this.length;) {
        if (equals(value, this[index])) {
            this.swap(index, 1);
            count++;
        } else {
            index++;
        }
    }
    return count;
});

define("find", function (value, equals) {
    equals = equals || this.contentEquals || Object.equals;
    for (var index = 0; index < this.length; index++) {
        if (index in this && equals(value, this[index])) {
            return index;
        }
    }
    return -1;
});

define("findLast", function (value, equals) {
    equals = equals || this.contentEquals || Object.equals;
    var index = this.length;
    do {
        index--;
        if (index in this && equals(this[index], value)) {
            return index;
        }
    } while (index > 0);
    return -1;
});

define("swap", function (start, length, plus) {
    var args, plusLength, i, j, returnValue;
    if (start > this.length) {
        this.length = start;
    }
    if (typeof plus !== "undefined") {
        args = [start, length];
        if (!Array.isArray(plus)) {
            plus = array_slice.call(plus);
        }
        i = 0;
        plusLength = plus.length;
        // 1000 is a magic number, presumed to be smaller than the remaining
        // stack length. For swaps this small, we take the fast path and just
        // use the underlying Array splice. We could measure the exact size of
        // the remaining stack using a try/catch around an unbounded recursive
        // function, but this would defeat the purpose of short-circuiting in
        // the common case.
        if (plusLength < 1000) {
            for (i; i < plusLength; i++) {
                args[i+2] = plus[i];
            }
            return array_splice.apply(this, args);
        } else {
            // Avoid maximum call stack error.
            // First delete the desired entries.
            returnValue = array_splice.apply(this, args);
            // Second batch in 1000s.
            for (i; i < plusLength;) {
                args = [start+i, 0];
                for (j = 2; j < 1002 && i < plusLength; j++, i++) {
                    args[j] = plus[i];
                }
                array_splice.apply(this, args);
            }
            return returnValue;
        }
    // using call rather than apply to cut down on transient objects
    } else if (typeof length !== "undefined") {
        return array_splice.call(this, start, length);
    }  else if (typeof start !== "undefined") {
        return array_splice.call(this, start);
    } else {
        return [];
    }
});

define("peek", function () {
    return this[0];
});

define("poke", function (value) {
    if (this.length > 0) {
        this[0] = value;
    }
});

define("peekBack", function () {
    if (this.length > 0) {
        return this[this.length - 1];
    }
});

define("pokeBack", function (value) {
    if (this.length > 0) {
        this[this.length - 1] = value;
    }
});

define("one", function () {
    for (var i in this) {
        if (Object.owns(this, i)) {
            return this[i];
        }
    }
});

if (!Array.prototype.clear) {
    define("clear", function () {
        this.length = 0;
        return this;
    });
}

define("compare", function (that, compare) {
    compare = compare || Object.compare;
    var i;
    var length;
    var lhs;
    var rhs;
    var relative;

    if (this === that) {
        return 0;
    }

    if (!that || !Array.isArray(that)) {
        return GenericOrder.prototype.compare.call(this, that, compare);
    }

    length = (this.length < that.length) ? this.length : that.length;

    for (i = 0; i < length; i++) {
        if (i in this) {
            if (!(i in that)) {
                return -1;
            } else {
                lhs = this[i];
                rhs = that[i];
                relative = compare(lhs, rhs);
                if (relative) {
                    return relative;
                }
            }
        } else if (i in that) {
            return 1;
        }
    }

    return this.length - that.length;
});

define("equals", function (that, equals) {
    equals = equals || Object.equals;
    var i = 0;
    var length = this.length;
    var left;
    var right;

    if (this === that) {
        return true;
    }
    if (!that || !Array.isArray(that)) {
        return GenericOrder.prototype.equals.call(this, that);
    }

    if (length !== that.length) {
        return false;
    } else {
        for (; i < length; ++i) {
            if (i in this) {
                if (!(i in that)) {
                    return false;
                }
                left = this[i];
                right = that[i];
                if (!equals(left, right)) {
                    return false;
                }
            } else {
                if (i in that) {
                    return false;
                }
            }
        }
    }
    return true;
});

define("clone", function (depth, memo) {
    if (depth == null) {
        depth = Infinity;
    } else if (depth === 0) {
        return this;
    }
    memo = memo || new WeakMap();
    if (memo.has(this)) {
        return memo.get(this);
    }
    var clone = new Array(this.length);
    memo.set(this, clone);
    for (var i in this) {
        clone[i] = Object.clone(this[i], depth - 1, memo);
    };
    return clone;
});

define("iterate", function (start, end) {
    return new ArrayIterator(this, start, end);
});

if(Array.prototype.spliceOne === void 0) {
    define("spliceOne", function (index,itemToAdd) {
        var len=this.length;
        if (!len) { return }
        if(arguments.length === 1) {
            while (index<len) {
                this[index] = this[index+1];
                index++
            }
            this.length--;
        }
        else {
            this[index] = itemToAdd;
        }
    });
}

define("Iterator", ArrayIterator);

function ArrayIterator(array, start, end) {
    this.array = array;
    this.start = start == null ? 0 : start;
    this.end = end;
};
ArrayIterator.prototype.__iterationObject = null;
Object.defineProperty(ArrayIterator.prototype,"_iterationObject", {
    get: function() {
        return this.__iterationObject || (this.__iterationObject = { done: false, value:null});
    }
});

ArrayIterator.prototype.next = function () {
    if (this.start === (this.end == null ? this.array.length : this.end)) {
        this._iterationObject.done = true;
        this._iterationObject.value = void 0;
    } else {
        this._iterationObject.value = this.array[this.start++];
    }
    return this._iterationObject;
};

},{"./generic-collection":6,"./generic-order":8,"./shim-function":16,"weak-map":24}],16:[function(require,module,exports){

module.exports = Function;

/**
    A utility to reduce unnecessary allocations of <code>function () {}</code>
    in its many colorful variations.  It does nothing and returns
    <code>undefined</code> thus makes a suitable default in some circumstances.

    @function external:Function.noop
*/
Function.noop = function () {
};

/**
    A utility to reduce unnecessary allocations of <code>function (x) {return
    x}</code> in its many colorful but ultimately wasteful parameter name
    variations.

    @function external:Function.identity
    @param {Any} any value
    @returns {Any} that value
*/
Function.identity = function (value) {
    return value;
};

/**
    A utility for creating a comparator function for a particular aspect of a
    figurative class of objects.

    @function external:Function.by
    @param {Function} relation A function that accepts a value and returns a
    corresponding value to use as a representative when sorting that object.
    @param {Function} compare an alternate comparator for comparing the
    represented values.  The default is <code>Object.compare</code>, which
    does a deep, type-sensitive, polymorphic comparison.
    @returns {Function} a comparator that has been annotated with
    <code>by</code> and <code>compare</code> properties so
    <code>sorted</code> can perform a transform that reduces the need to call
    <code>by</code> on each sorted object to just once.
 */
Function.by = function (by , compare) {
    compare = compare || Object.compare;
    by = by || Function.identity;
    var compareBy = function (a, b) {
        return compare(by(a), by(b));
    };
    compareBy.compare = compare;
    compareBy.by = by;
    return compareBy;
};

// TODO document
Function.get = function (key) {
    return function (object) {
        return Object.get(object, key);
    };
};


},{}],17:[function(require,module,exports){
"use strict";

var WeakMap = require("weak-map");

module.exports = Object;

/*
    Based in part on extras from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

/**
    Defines extensions to intrinsic <code>Object</code>.
    @see [Object class]{@link external:Object}
*/

/**
    A utility object to avoid unnecessary allocations of an empty object
    <code>{}</code>.  This object is frozen so it is safe to share.

    @object external:Object.empty
*/
Object.empty = Object.freeze(Object.create(null));

/**
    Returns whether the given value is an object, as opposed to a value.
    Unboxed numbers, strings, true, false, undefined, and null are not
    objects.  Arrays are objects.

    @function external:Object.isObject
    @param {Any} value
    @returns {Boolean} whether the given value is an object
*/
Object.isObject = function (object) {
    return Object(object) === object;
};

/**
    Returns the value of an any value, particularly objects that
    implement <code>valueOf</code>.

    <p>Note that, unlike the precedent of methods like
    <code>Object.equals</code> and <code>Object.compare</code> would suggest,
    this method is named <code>Object.getValueOf</code> instead of
    <code>valueOf</code>.  This is a delicate issue, but the basis of this
    decision is that the JavaScript runtime would be far more likely to
    accidentally call this method with no arguments, assuming that it would
    return the value of <code>Object</code> itself in various situations,
    whereas <code>Object.equals(Object, null)</code> protects against this case
    by noting that <code>Object</code> owns the <code>equals</code> property
    and therefore does not delegate to it.

    @function external:Object.getValueOf
    @param {Any} value a value or object wrapping a value
    @returns {Any} the primitive value of that object, if one exists, or passes
    the value through
*/
Object.getValueOf = function (value) {
    if (value && typeof value.valueOf === "function") {
        value = value.valueOf();
    }
    return value;
};

var hashMap = new WeakMap();
Object.hash = function (object) {
    if (object && typeof object.hash === "function") {
        return "" + object.hash();
    } else if (Object(object) === object) {
        if (!hashMap.has(object)) {
            hashMap.set(object, Math.random().toString(36).slice(2));
        }
        return hashMap.get(object);
    } else {
        return "" + object;
    }
};

/**
    A shorthand for <code>Object.prototype.hasOwnProperty.call(object,
    key)</code>.  Returns whether the object owns a property for the given key.
    It does not consult the prototype chain and works for any string (including
    "hasOwnProperty") except "__proto__".

    @function external:Object.owns
    @param {Object} object
    @param {String} key
    @returns {Boolean} whether the object owns a property wfor the given key.
*/
var owns = Object.prototype.hasOwnProperty;
Object.owns = function (object, key) {
    return owns.call(object, key);
};

/**
    A utility that is like Object.owns but is also useful for finding
    properties on the prototype chain, provided that they do not refer to
    methods on the Object prototype.  Works for all strings except "__proto__".

    <p>Alternately, you could use the "in" operator as long as the object
    descends from "null" instead of the Object.prototype, as with
    <code>Object.create(null)</code>.  However,
    <code>Object.create(null)</code> only works in fully compliant EcmaScript 5
    JavaScript engines and cannot be faithfully shimmed.

    <p>If the given object is an instance of a type that implements a method
    named "has", this function defers to the collection, so this method can be
    used to generically handle objects, arrays, or other collections.  In that
    case, the domain of the key depends on the instance.

    @param {Object} object
    @param {String} key
    @returns {Boolean} whether the object, or any of its prototypes except
    <code>Object.prototype</code>
    @function external:Object.has
*/
Object.has = function (object, key) {
    if (typeof object !== "object") {
        throw new Error("Object.has can't accept non-object: " + typeof object);
    }
    // forward to mapped collections that implement "has"
    if (object && typeof object.has === "function") {
        return object.has(key);
    // otherwise report whether the key is on the prototype chain,
    // as long as it is not one of the methods on object.prototype
    } else if (typeof key === "string") {
        return key in object && object[key] !== Object.prototype[key];
    } else {
        throw new Error("Key must be a string for Object.has on plain objects");
    }
};

/**
    Gets the value for a corresponding key from an object.

    <p>Uses Object.has to determine whether there is a corresponding value for
    the given key.  As such, <code>Object.get</code> is capable of retriving
    values from the prototype chain as long as they are not from the
    <code>Object.prototype</code>.

    <p>If there is no corresponding value, returns the given default, which may
    be <code>undefined</code>.

    <p>If the given object is an instance of a type that implements a method
    named "get", this function defers to the collection, so this method can be
    used to generically handle objects, arrays, or other collections.  In that
    case, the domain of the key depends on the implementation.  For a `Map`,
    for example, the key might be any object.

    @param {Object} object
    @param {String} key
    @param {Any} value a default to return, <code>undefined</code> if omitted
    @returns {Any} value for key, or default value
    @function external:Object.get
*/
Object.get = function (object, key, value) {
    if (typeof object !== "object") {
        throw new Error("Object.get can't accept non-object: " + typeof object);
    }
    // forward to mapped collections that implement "get"
    if (object && typeof object.get === "function") {
        return object.get(key, value);
    } else if (Object.has(object, key)) {
        return object[key];
    } else {
        return value;
    }
};

/**
    Sets the value for a given key on an object.

    <p>If the given object is an instance of a type that implements a method
    named "set", this function defers to the collection, so this method can be
    used to generically handle objects, arrays, or other collections.  As such,
    the key domain varies by the object type.

    @param {Object} object
    @param {String} key
    @param {Any} value
    @returns <code>undefined</code>
    @function external:Object.set
*/
Object.set = function (object, key, value) {
    if (object && typeof object.set === "function") {
        object.set(key, value);
    } else {
        object[key] = value;
    }
};

Object.addEach = function (target, source, overrides) {
    var overridesExistingProperty = arguments.length === 3 ? overrides : true;
    if (!source) {
    } else if (typeof source.forEach === "function" && !source.hasOwnProperty("forEach")) {
        // copy map-alikes
        if (source.isMap === true) {
            source.forEach(function (value, key) {
                target[key] = value;
            });
        // iterate key value pairs of other iterables
        } else {
            source.forEach(function (pair) {
                target[pair[0]] = pair[1];
            });
        }
    } else if (typeof source.length === "number") {
        // arguments, strings
        for (var index = 0; index < source.length; index++) {
            target[index] = source[index];
        }
    } else {
        // copy other objects as map-alikes
        for(var keys = Object.keys(source), i = 0, key;(key = keys[i]); i++) {
            if(overridesExistingProperty || !Object.owns(target,key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
};


/*
var defineEach = function defineEach(target, prototype) {
    // console.log("Map defineEach: ",Object.keys(prototype));
    var proto = Map.prototype;
    for (var name in prototype) {
        if(!proto.hasOwnProperty(name)) {
            Object.defineProperty(proto, name, {
                value: prototype[name],
                writable: writable,
                configurable: configurable,
                enumerable: enumerable
            });
        }
    }
}
*/
Object.defineEach = function (target, source, overrides, configurable, enumerable, writable) {
    var overridesExistingProperty = arguments.length === 3 ? overrides : true;
    if (!source) {
    } else if (typeof source.forEach === "function" && !source.hasOwnProperty("forEach")) {
        // copy map-alikes
        if (source.isMap === true) {
            source.forEach(function (value, key) {
                Object.defineProperty(target, key, {
                    value: value,
                    writable: writable,
                    configurable: configurable,
                    enumerable: enumerable
                });
            });
        // iterate key value pairs of other iterables
        } else {
            source.forEach(function (pair) {
                Object.defineProperty(target, pair[0], {
                    value: pair[1],
                    writable: writable,
                    configurable: configurable,
                    enumerable: enumerable
                });

            });
        }
    } else if (typeof source.length === "number") {
        // arguments, strings
        for (var index = 0; index < source.length; index++) {
            Object.defineProperty(target, index, {
                value: source[index],
                writable: writable,
                configurable: configurable,
                enumerable: enumerable
            });

        }
    } else {
        // copy other objects as map-alikes
        for(var keys = Object.keys(source), i = 0, key;(key = keys[i]); i++) {
            if(overridesExistingProperty || !Object.owns(target,key)) {
                Object.defineProperty(target, key, {
                    value: source[key],
                    writable: writable,
                    configurable: configurable,
                    enumerable: enumerable
                });

            }
        }
    }
    return target;
};

/**
    Iterates over the owned properties of an object.

    @function external:Object.forEach
    @param {Object} object an object to iterate.
    @param {Function} callback a function to call for every key and value
    pair in the object.  Receives <code>value</code>, <code>key</code>,
    and <code>object</code> as arguments.
    @param {Object} thisp the <code>this</code> to pass through to the
    callback
*/
Object.forEach = function (object, callback, thisp) {

    var keys = Object.keys(object), i = 0, iKey;
    for(;(iKey = keys[i]);i++) {
        callback.call(thisp, object[iKey], iKey, object);
    }

};

/**
    Iterates over the owned properties of a map, constructing a new array of
    mapped values.

    @function external:Object.map
    @param {Object} object an object to iterate.
    @param {Function} callback a function to call for every key and value
    pair in the object.  Receives <code>value</code>, <code>key</code>,
    and <code>object</code> as arguments.
    @param {Object} thisp the <code>this</code> to pass through to the
    callback
    @returns {Array} the respective values returned by the callback for each
    item in the object.
*/
Object.map = function (object, callback, thisp) {
    var keys = Object.keys(object), i = 0, result = [], iKey;
    for(;(iKey = keys[i]);i++) {
        result.push(callback.call(thisp, object[iKey], iKey, object));
    }
    return result;
};

/**
    Returns the values for owned properties of an object.

    @function external:Object.map
    @param {Object} object
    @returns {Array} the respective value for each owned property of the
    object.
*/
Object.values = function (object) {
    return Object.map(object, Function.identity);
};

// TODO inline document concat
Object.concat = function () {
    var object = {};
    for (var i = 0; i < arguments.length; i++) {
        Object.addEach(object, arguments[i]);
    }
    return object;
};

Object.from = Object.concat;

/**
    Returns whether two values are identical.  Any value is identical to itself
    and only itself.  This is much more restictive than equivalence and subtly
    different than strict equality, <code>===</code> because of edge cases
    including negative zero and <code>NaN</code>.  Identity is useful for
    resolving collisions among keys in a mapping where the domain is any value.
    This method does not delgate to any method on an object and cannot be
    overridden.
    @see http://wiki.ecmascript.org/doku.php?id=harmony:egal
    @param {Any} this
    @param {Any} that
    @returns {Boolean} whether this and that are identical
    @function external:Object.is
*/
Object.is = function (x, y) {
    if (x === y) {
        // 0 === -0, but they are not identical
        return x !== 0 || 1 / x === 1 / y;
    }
    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN("foo") => true
    return x !== x && y !== y;
};

/**
    Performs a polymorphic, type-sensitive deep equivalence comparison of any
    two values.

    <p>As a basic principle, any value is equivalent to itself (as in
    identity), any boxed version of itself (as a <code>new Number(10)</code> is
    to 10), and any deep clone of itself.

    <p>Equivalence has the following properties:

    <ul>
        <li><strong>polymorphic:</strong>
            If the given object is an instance of a type that implements a
            methods named "equals", this function defers to the method.  So,
            this function can safely compare any values regardless of type,
            including undefined, null, numbers, strings, any pair of objects
            where either implements "equals", or object literals that may even
            contain an "equals" key.
        <li><strong>type-sensitive:</strong>
            Incomparable types are not equal.  No object is equivalent to any
            array.  No string is equal to any other number.
        <li><strong>deep:</strong>
            Collections with equivalent content are equivalent, recursively.
        <li><strong>equivalence:</strong>
            Identical values and objects are equivalent, but so are collections
            that contain equivalent content.  Whether order is important varies
            by type.  For Arrays and lists, order is important.  For Objects,
            maps, and sets, order is not important.  Boxed objects are mutally
            equivalent with their unboxed values, by virtue of the standard
            <code>valueOf</code> method.
    </ul>
    @param this
    @param that
    @returns {Boolean} whether the values are deeply equivalent
    @function external:Object.equals
*/
Object.equals = function (a, b, equals, memo) {
    equals = equals || Object.equals;
    //console.log("Object.equals: a:",a, "b:",b, "equals:",equals);
    // unbox objects, but do not confuse object literals
    a = Object.getValueOf(a);
    b = Object.getValueOf(b);
    if (a === b)
        return true;
    if (Object.isObject(a)) {
        memo = memo || new WeakMap();
        if (memo.has(a)) {
            return true;
        }
        memo.set(a, true);
    }
    if (Object.isObject(a) && typeof a.equals === "function") {
        return a.equals(b, equals, memo);
    }
    // commutative
    if (Object.isObject(b) && typeof b.equals === "function") {
        return b.equals(a, equals, memo);
    }
    if (Object.isObject(a) && Object.isObject(b)) {
        if (Object.getPrototypeOf(a) === Object.prototype && Object.getPrototypeOf(b) === Object.prototype) {
            for (var name in a) {
                if (!equals(a[name], b[name], equals, memo)) {
                    return false;
                }
            }
            for (var name in b) {
                if (!(name in a) || !equals(b[name], a[name], equals, memo)) {
                    return false;
                }
            }
            return true;
        }
    }
    // NaN !== NaN, but they are equal.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN("foo") => true
    // We have established that a !== b, but if a !== a && b !== b, they are
    // both NaN.
    if (a !== a && b !== b)
        return true;
    if (!a || !b)
        return a === b;
    return false;
};

// Because a return value of 0 from a `compare` function  may mean either
// "equals" or "is incomparable", `equals` cannot be defined in terms of
// `compare`.  However, `compare` *can* be defined in terms of `equals` and
// `lessThan`.  Again however, more often it would be desirable to implement
// all of the comparison functions in terms of compare rather than the other
// way around.

/**
    Determines the order in which any two objects should be sorted by returning
    a number that has an analogous relationship to zero as the left value to
    the right.  That is, if the left is "less than" the right, the returned
    value will be "less than" zero, where "less than" may be any other
    transitive relationship.

    <p>Arrays are compared by the first diverging values, or by length.

    <p>Any two values that are incomparable return zero.  As such,
    <code>equals</code> should not be implemented with <code>compare</code>
    since incomparability is indistinguishable from equality.

    <p>Sorts strings lexicographically.  This is not suitable for any
    particular international setting.  Different locales sort their phone books
    in very different ways, particularly regarding diacritics and ligatures.

    <p>If the given object is an instance of a type that implements a method
    named "compare", this function defers to the instance.  The method does not
    need to be an owned property to distinguish it from an object literal since
    object literals are incomparable.  Unlike <code>Object</code> however,
    <code>Array</code> implements <code>compare</code>.

    @param {Any} left
    @param {Any} right
    @returns {Number} a value having the same transitive relationship to zero
    as the left and right values.
    @function external:Object.compare
*/
Object.compare = function (a, b) {
    // unbox objects, but do not confuse object literals
    // mercifully handles the Date case
    a = Object.getValueOf(a);
    b = Object.getValueOf(b);
    if (a === b)
        return 0;
    var aType = typeof a;
    var bType = typeof b;
    if (aType === "number" && bType === "number")
        return a - b;
    if (aType === "string" && bType === "string")
        return a < b ? -Infinity : Infinity;
        // the possibility of equality elimiated above
    if (a && typeof a.compare === "function")
        return a.compare(b);
    // not commutative, the relationship is reversed
    if (b && typeof b.compare === "function")
        return -b.compare(a);
    return 0;
};

/**
    Creates a deep copy of any value.  Values, being immutable, are
    returned without alternation.  Forwards to <code>clone</code> on
    objects and arrays.

    @function external:Object.clone
    @param {Any} value a value to clone
    @param {Number} depth an optional traversal depth, defaults to infinity.
    A value of <code>0</code> means to make no clone and return the value
    directly.
    @param {Map} memo an optional memo of already visited objects to preserve
    reference cycles.  The cloned object will have the exact same shape as the
    original, but no identical objects.  Te map may be later used to associate
    all objects in the original object graph with their corresponding member of
    the cloned graph.
    @returns a copy of the value
*/
Object.clone = function (value, depth, memo) {
    value = Object.getValueOf(value);
    memo = memo || new WeakMap();
    if (depth === undefined) {
        depth = Infinity;
    } else if (depth === 0) {
        return value;
    }
    if (Object.isObject(value)) {
        if (!memo.has(value)) {
            if (value && typeof value.clone === "function") {
                memo.set(value, value.clone(depth, memo));
            } else {
                var prototype = Object.getPrototypeOf(value);
                if (prototype === null || prototype === Object.prototype) {
                    var clone = Object.create(prototype);
                    memo.set(value, clone);
                    for (var key in value) {
                        clone[key] = Object.clone(value[key], depth - 1, memo);
                    }
                } else {
                    throw new Error("Can't clone " + value);
                }
            }
        }
        return memo.get(value);
    }
    return value;
};

/**
    Removes all properties owned by this object making the object suitable for
    reuse.

    @function external:Object.clear
    @returns this
*/
Object.clear = function (object) {
    if (object && typeof object.clear === "function") {
        object.clear();
    } else {
        var keys = Object.keys(object),
            i = keys.length;
        while (i) {
            i--;
            delete object[keys[i]];
        }
    }
    return object;
};

},{"weak-map":24}],18:[function(require,module,exports){

/**
    accepts a string; returns the string with regex metacharacters escaped.
    the returned string can safely be used within a regex to match a literal
    string. escaped characters are [, ], {, }, (, ), -, *, +, ?, ., \, ^, $,
    |, #, [comma], and whitespace.
*/
if (!RegExp.escape) {
    var special = /[-[\]{}()*+?.\\^$|,#\s]/g;
    RegExp.escape = function (string) {
        return string.replace(special, "\\$&");
    };
}


},{}],19:[function(require,module,exports){

var Array = require("./shim-array");
var Object = require("./shim-object");
var Function = require("./shim-function");
var RegExp = require("./shim-regexp");


},{"./shim-array":15,"./shim-function":16,"./shim-object":17,"./shim-regexp":18}],20:[function(require,module,exports){
"use strict";

var Shim = require("./shim");
var SortedSet = require("./sorted-set");
var GenericCollection = require("./generic-collection");
var GenericMap = require("./generic-map");
var PropertyChanges = require("./listen/property-changes");
var MapChanges = require("./listen/map-changes");

module.exports = SortedMap;

function SortedMap(values, equals, compare, getDefault) {
    if (!(this instanceof SortedMap)) {
        return new SortedMap(values, equals, compare, getDefault);
    }
    equals = equals || Object.equals;
    compare = compare || Object.compare;
    getDefault = getDefault || Function.noop;
    this.contentEquals = equals;
    this.contentCompare = compare;
    this.getDefault = getDefault;
    this.store = new SortedSet(
        null,
        function keysEqual(a, b) {
            return equals(a.key, b.key);
        },
        function compareKeys(a, b) {
            return compare(a.key, b.key);
        }
    );
    this.length = 0;
    this.addEach(values);
}

// hack so require("sorted-map").SortedMap will work in MontageJS
SortedMap.SortedMap = SortedMap;

SortedMap.from = GenericCollection.from;

Object.addEach(SortedMap.prototype, GenericCollection.prototype);
Object.addEach(SortedMap.prototype, GenericMap.prototype);
Object.addEach(SortedMap.prototype, PropertyChanges.prototype);
Object.addEach(SortedMap.prototype, MapChanges.prototype);
Object.defineProperty(SortedMap.prototype,"size",GenericCollection._sizePropertyDescriptor);

SortedMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentCompare,
        this.getDefault
    );
};
SortedMap.prototype.iterate = function () {
    return this.store.iterate();
};

SortedMap.prototype.log = function (charmap, logNode, callback, thisp) {
    logNode = logNode || this.logNode
    this.store.log(charmap, function (node, log, logBefore) {
        logNode(node.value, log, logBefore);
    }, callback, thisp);
};

SortedMap.prototype.logNode = function (node, log) {
    log(" key: " + node.key);
    log(" value: " + node.value);
};

},{"./generic-collection":6,"./generic-map":7,"./listen/map-changes":12,"./listen/property-changes":13,"./shim":19,"./sorted-set":21}],21:[function(require,module,exports){
"use strict";

module.exports = SortedSet;

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericSet = require("./generic-set");
var PropertyChanges = require("./listen/property-changes");
var RangeChanges = require("./listen/range-changes");
var TreeLog = require("./tree-log");

function SortedSet(values, equals, compare, getDefault) {
    if (!(this instanceof SortedSet)) {
        return new SortedSet(values, equals, compare, getDefault);
    }
    this.contentEquals = equals || Object.equals;
    this.contentCompare = compare || Object.compare;
    this.getDefault = getDefault || Function.noop;
    this.root = null;
    this.length = 0;
    this.addEach(values);
}

// hack so require("sorted-set").SortedSet will work in MontageJS
SortedSet.SortedSet = SortedSet;

Object.addEach(SortedSet.prototype, GenericCollection.prototype);
Object.addEach(SortedSet.prototype, GenericSet.prototype);
Object.addEach(SortedSet.prototype, PropertyChanges.prototype);
Object.addEach(SortedSet.prototype, RangeChanges.prototype);
Object.defineProperty(SortedSet.prototype,"size",GenericCollection._sizePropertyDescriptor);
SortedSet.from = GenericCollection.from;

SortedSet.prototype.isSorted = true;

SortedSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentCompare,
        this.getDefault
    );
};

SortedSet.prototype.has = function (value, equals) {
    if (equals) {
        throw new Error("SortedSet#has does not support second argument: equals");
    }
    if (this.root) {
        this.splay(value);
        return this.contentEquals(value, this.root.value);
    } else {
        return false;
    }
};

SortedSet.prototype.get = function (value, equals) {
    if (equals) {
        throw new Error("SortedSet#get does not support second argument: equals");
    }
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            return this.root.value;
        }
    }
    return this.getDefault(value);
};

SortedSet.prototype.add = function (value) {
    var node = new this.Node(value);
    if (this.root) {
        this.splay(value);
        if (!this.contentEquals(value, this.root.value)) {
            var comparison = this.contentCompare(value, this.root.value);
            if (comparison === 0) {
                throw new Error("SortedSet cannot contain incomparable but inequal values: " + value + " and " + this.root.value);
            }
            if (this.dispatchesRangeChanges) {
                this.dispatchBeforeRangeChange([value], [], this.root.index);
            }
            if (comparison < 0) {
                // rotate right
                //   R        N
                //  / \  ->  / \
                // l   r    l   R
                // :   :    :    \
                //                r
                //                :
                node.right = this.root;
                node.left = this.root.left;
                this.root.left = null;
                this.root.touch();
            } else {
                // rotate left
                //   R        N
                //  / \  ->  / \
                // l   r    R   r
                // :   :   /    :
                //        l
                //        :
                node.left = this.root;
                node.right = this.root.right;
                this.root.right = null;
                this.root.touch();
            }
            node.touch();
            this.root = node;
            this.length++;
            if (this.dispatchesRangeChanges) {
                this.dispatchRangeChange([value], [], this.root.index);
            }
            return true;
        }
    } else {
        if (this.dispatchesRangeChanges) {
            this.dispatchBeforeRangeChange([value], [], 0);
        }
        this.root = node;
        this.length++;
        if (this.dispatchesRangeChanges) {
            this.dispatchRangeChange([value], [], 0);
        }
        return true;
    }
    return false;
};

SortedSet.prototype['delete'] = function (value, equals) {
    if (equals) {
        throw new Error("SortedSet#delete does not support second argument: equals");
    }
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            var index = this.root.index;
            if (this.dispatchesRangeChanges) {
                this.dispatchBeforeRangeChange([], [value], index);
            }
            if (!this.root.left) {
                this.root = this.root.right;
            } else {
                // remove the right side of the tree,
                var right = this.root.right;
                this.root = this.root.left;
                // the tree now only contains the left side of the tree, so all
                // values are less than the value deleted.
                // splay so that the root has an empty right child
                this.splay(value);
                // put the right side of the tree back
                this.root.right = right;
            }
            this.length--;
            if (this.root) {
                this.root.touch();
            }
            if (this.dispatchesRangeChanges) {
                this.dispatchRangeChange([], [value], index);
            }
            return true;
        }
    }
    return false;
};

SortedSet.prototype.indexOf = function (value, index) {
    if (index) {
        throw new Error("SortedSet#indexOf does not support second argument: startIndex");
    }
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            return this.root.index;
        }
    }
    return -1;
};

SortedSet.prototype.find = function (value, equals, index) {
    if (equals) {
        throw new Error("SortedSet#find does not support second argument: equals");
    }
    if (index) {
        // TODO contemplate using splayIndex to isolate a subtree in
        // which to search.
        throw new Error("SortedSet#find does not support third argument: index");
    }
    if (this.root) {
        this.splay(value);
        if (this.contentEquals(value, this.root.value)) {
            return this.root;
        }
    }
};

SortedSet.prototype.findGreatest = function (at) {
    if (this.root) {
        at = at || this.root;
        while (at.right) {
            at = at.right;
        }
        return at;
    }
};

SortedSet.prototype.findLeast = function (at) {
    if (this.root) {
        at = at || this.root;
        while (at.left) {
            at = at.left;
        }
        return at;
    }
};

SortedSet.prototype.findGreatestLessThanOrEqual = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentCompare(this.root.value, value) > 0) {
            return this.root.getPrevious();
        } else {
            return this.root;
        }
    }
};

SortedSet.prototype.findGreatestLessThan = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentCompare(this.root.value, value) >= 0) {
            return this.root.getPrevious();
        } else {
            return this.root;
        }
    }
};

SortedSet.prototype.findLeastGreaterThanOrEqual = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentCompare(this.root.value, value) >= 0) {
            return this.root;
        } else {
            return this.root.getNext();
        }
    }
};

SortedSet.prototype.findLeastGreaterThan = function (value) {
    if (this.root) {
        this.splay(value);
        if (this.contentCompare(this.root.value, value) <= 0) {
            return this.root.getNext();
        } else {
            return this.root;
        }
    }
};

SortedSet.prototype.pop = function () {
    if (this.root) {
        var found = this.findGreatest();
        this["delete"](found.value);
        return found.value;
    }
};

SortedSet.prototype.shift = function () {
    if (this.root) {
        var found = this.findLeast();
        this["delete"](found.value);
        return found.value;
    }
};

SortedSet.prototype.push = function () {
    this.addEach(arguments);
};

SortedSet.prototype.unshift = function () {
    this.addEach(arguments);
};

SortedSet.prototype.slice = function (start, end) {
    var temp;
    start = start || 0;
    end = end || this.length;
    if (start < 0) {
        start += this.length;
    }
    if (end < 0) {
        end += this.length;
    }
    var sliced = [];
    if (this.root) {
        this.splayIndex(start);
        while (this.root.index < end) {
            sliced.push(this.root.value);
            if (!this.root.right) {
                break;
            }
            this.splay(this.root.getNext().value);
        }
    }
    return sliced;
};

SortedSet.prototype.splice = function (at, length /*...plus*/) {
    return this.swap(at, length, Array.prototype.slice.call(arguments, 2));
};

SortedSet.prototype.swap = function (start, length, plus) {
    if (start === undefined && length === undefined) {
        return [];
    }
    start = start || 0;
    if (start < 0) {
        start += this.length;
    }
    if (length === undefined) {
        length = Infinity;
    }
    var swapped = [];

    if (this.root) {

        // start
        this.splayIndex(start);

        // minus length
        for (var i = 0; i < length; i++) {
            swapped.push(this.root.value);
            var next = this.root.getNext();
            this["delete"](this.root.value);
            if (!next) {
                break;
            }
            this.splay(next.value);
        }
    }

    // plus
    this.addEach(plus);

    return swapped;
};

// This is the simplified top-down splaying algorithm from: "Self-adjusting
// Binary Search Trees" by Sleator and Tarjan. Guarantees that root.value
// equals value if value exists. If value does not exist, then root will be
// the node whose value either immediately preceeds or immediately follows value.
// - as described in https://github.com/hij1nx/forest
SortedSet.prototype.splay = function (value) {
    var stub, left, right, temp, root, history;

    if (!this.root) {
        return;
    }

    // Create a stub node.  The use of the stub node is a bit
    // counter-intuitive: The right child of the stub node will hold the L tree
    // of the algorithm.  The left child of the stub node will hold the R tree
    // of the algorithm.  Using a stub node, left and right will always be
    // nodes and we avoid special cases.
    // - http://code.google.com/p/v8/source/browse/branches/bleeding_edge/src/splay-tree-inl.h
    stub = left = right = new this.Node();
    // The history is an upside down tree used to propagate new tree sizes back
    // up the left and right arms of a traversal.  The right children of the
    // transitive left side of the tree will be former roots while linking
    // left.  The left children of the transitive walk to the right side of the
    // history tree will all be previous roots from linking right.  The last
    // node of the left and right traversal will each become a child of the new
    // root.
    history = new this.Node();
    root = this.root;

    while (true) {
        var comparison = this.contentCompare(value, root.value);
        if (comparison < 0) {
            if (root.left) {
                if (this.contentCompare(value, root.left.value) < 0) {
                    // rotate right
                    //        Root         L(temp)
                    //      /     \       / \
                    //     L(temp) R    LL    Root
                    //    / \                /    \
                    //  LL   LR            LR      R
                    temp = root.left;
                    root.left = temp.right;
                    root.touch();
                    temp.right = root;
                    temp.touch();
                    root = temp;
                    if (!root.left) {
                        break;
                    }
                }
                // remember former root for repropagating length
                temp = new Node();
                temp.right = root;
                temp.left = history.left;
                history.left = temp;
                // link left
                right.left = root;
                right.touch();
                right = root;
                root = root.left;
            } else {
                break;
            }
        } else if (comparison > 0) {
            if (root.right) {
                if (this.contentCompare(value, root.right.value) > 0) {
                    // rotate left
                    //        Root         L(temp)
                    //      /     \       / \
                    //     L(temp) R    LL    Root
                    //    / \                /    \
                    //  LL   LR            LR      R
                    temp = root.right;
                    root.right = temp.left;
                    root.touch();
                    temp.left = root;
                    temp.touch();
                    root = temp;
                    if (!root.right) {
                        break;
                    }
                }
                // remember former root for repropagating length
                temp = new Node();
                temp.left = root;
                temp.right = history.right;
                history.right = temp;
                // link right
                left.right = root;
                left.touch();
                left = root;
                root = root.right;
            } else {
                break;
            }
        } else { // equal or incomparable
            break;
        }
    }

    // reassemble
    left.right = root.left;
    left.touch();
    right.left = root.right;
    right.touch();
    root.left = stub.right;
    root.right = stub.left;

    // propagate new lengths
    while (history.left) {
        history.left.right.touch();
        history.left = history.left.left;
    }
    while (history.right) {
        history.right.left.touch();
        history.right = history.right.right;
    }
    root.touch();

    this.root = root;
};

// an internal utility for splaying a node based on its index
SortedSet.prototype.splayIndex = function (index) {
    if (this.root) {
        var at = this.root;
        var atIndex = this.root.index;

        while (atIndex !== index) {
            if (atIndex > index && at.left) {
                at = at.left;
                atIndex -= 1 + (at.right ? at.right.length : 0);
            } else if (atIndex < index && at.right) {
                at = at.right;
                atIndex += 1 + (at.left ? at.left.length : 0);
            } else {
                break;
            }
        }

        this.splay(at.value);

        return this.root.index === index;
    }
    return false;
};

SortedSet.prototype.reduce = function (callback, basis, thisp) {
    if (this.root) {
        basis = this.root.reduce(callback, basis, 0, thisp, this);
    }
    return basis;
};

SortedSet.prototype.reduceRight = function (callback, basis, thisp) {
    if (this.root) {
        basis = this.root.reduceRight(callback, basis, this.length - 1, thisp, this);
    }
    return basis;
};

SortedSet.prototype.min = function (at) {
    var least = this.findLeast(at);
    if (least) {
        return least.value;
    }
};

SortedSet.prototype.max = function (at) {
    var greatest = this.findGreatest(at);
    if (greatest) {
        return greatest.value;
    }
};

SortedSet.prototype.one = function () {
    return this.min();
};

SortedSet.prototype.clear = function () {
    var minus;
    if (this.dispatchesRangeChanges) {
        minus = this.toArray();
        this.dispatchBeforeRangeChange([], minus, 0);
    }
    this.root = null;
    this.length = 0;
    if (this.dispatchesRangeChanges) {
        this.dispatchRangeChange([], minus, 0);
    }
};

SortedSet.prototype.iterate = function (start, end) {
    return new this.Iterator(this, start, end);
};

SortedSet.prototype.Iterator = Iterator;

SortedSet.prototype.summary = function () {
    if (this.root) {
        return this.root.summary();
    } else {
        return "()";
    }
};

SortedSet.prototype.log = function (charmap, logNode, callback, thisp) {
    charmap = charmap || TreeLog.unicodeRound;
    logNode = logNode || this.logNode;
    if (!callback) {
        callback = console.log;
        thisp = console;
    }
    callback = callback.bind(thisp);
    if (this.root) {
        this.root.log(charmap, logNode, callback, callback);
    }
};

SortedSet.prototype.logNode = function (node, log, logBefore) {
    log(" " + node.value);
};

SortedSet.logCharsets = TreeLog;

SortedSet.prototype.Node = Node;

function Node(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.length = 1;
}

// TODO case where no basis is provided for reduction

Node.prototype.reduce = function (callback, basis, index, thisp, tree, depth) {
    depth = depth || 0;
    if (this.left) {
        // prerecord length to be resistant to mutation
        var length = this.left.length;
        basis = this.left.reduce(callback, basis, index, thisp, tree, depth + 1);
        index += length;
    }
    basis = callback.call(thisp, basis, this.value, index, tree, this, depth);
    index += 1;
    if (this.right) {
        basis = this.right.reduce(callback, basis, index, thisp, tree, depth + 1);
    }
    return basis;
};

Node.prototype.reduceRight = function (callback, basis, index, thisp, tree, depth) {
    depth = depth || 0;
    if (this.right) {
        basis = this.right.reduce(callback, basis, index, thisp, tree, depth + 1);
        index -= this.right.length;
    }
    basis = callback.call(thisp, basis, this.value, this.value, tree, this, depth);
    index -= 1;
    if (this.left) {
        basis = this.left.reduce(callback, basis, index, thisp, tree, depth + 1);
    }
    return basis;
};

Node.prototype.touch = function () {
    this.length = 1 +
        (this.left ? this.left.length : 0) +
        (this.right ? this.right.length : 0);
    this.index = this.left ? this.left.length : 0;
};

Node.prototype.checkIntegrity = function () {
    var length = 1;
    length += this.left ? this.left.checkIntegrity() : 0;
    length += this.right ? this.right.checkIntegrity() : 0;
    if (this.length !== length)
        throw new Error("Integrity check failed: " + this.summary());
    return length;
}

// get the next node in this subtree
Node.prototype.getNext = function () {
    var node = this;
    if (node.right) {
        node = node.right;
        while (node.left) {
            node = node.left;
        }
        return node;
    }
};

// get the previous node in this subtree
Node.prototype.getPrevious = function () {
    var node = this;
    if (node.left) {
        node = node.left;
        while (node.right) {
            node = node.right;
        }
        return node;
    }
};

Node.prototype.summary = function () {
    var value = this.value || "-";
    value += " <" + this.length;
    if (!this.left && !this.right) {
        return "(" + value + ")";
    }
    return "(" + value + " " + (
        this.left ? this.left.summary() : "()"
    ) + ", " + (
        this.right ? this.right.summary() : "()"
    ) + ")";
};

Node.prototype.log = function (charmap, logNode, log, logAbove) {
    var self = this;

    var branch;
    if (this.left && this.right) {
        branch = charmap.intersection;
    } else if (this.left) {
        branch = charmap.branchUp;
    } else if (this.right) {
        branch = charmap.branchDown;
    } else {
        branch = charmap.through;
    }

    var loggedAbove;
    this.left && this.left.log(
        charmap,
        logNode,
        function innerWrite(line) {
            if (!loggedAbove) {
                loggedAbove = true;
                // leader
                logAbove(charmap.fromBelow + charmap.through + line);
            } else {
                // below
                logAbove(charmap.strafe + " " + line);
            }
        },
        function innerWriteAbove(line) {
            // above
            logAbove("  " + line);
        }
    );

    var loggedOn;
    logNode(
        this,
        function innerWrite(line) {
            if (!loggedOn) {
                loggedOn = true;
                log(branch + line);
            } else {
                log((self.right ? charmap.strafe : " ") + line);
            }
        },
        function innerWriteAbove(line) {
            logAbove((self.left ? charmap.strafe : " ") + line);
        }
    );

    var loggedBelow;
    this.right && this.right.log(
        charmap,
        logNode,
        function innerWrite(line) {
            if (!loggedBelow) {
                loggedBelow = true;
                log(charmap.fromAbove + charmap.through + line);
            } else {
                log("  " + line);
            }
        },
        function innerWriteAbove(line) {
            log(charmap.strafe + " " + line);
        }
    );
};

function Iterator(set, start, end) {
    this.set = set;
    this.prev = null;
    this.end = end;
    if (start) {
        var next = this.set.findLeastGreaterThanOrEqual(start);
        if (next) {
            this.set.splay(next.value);
            this.prev = next.getPrevious();
        }
    }
}
Iterator.prototype.__iterationObject = null;
Object.defineProperty(Iterator.prototype,"_iterationObject", {
    get: function() {
        return this.__iterationObject || (this.__iterationObject = { done: false, value:null});
    }
});

Iterator.prototype.next = function () {
    var next;
    if (this.prev) {
        next = this.set.findLeastGreaterThan(this.prev.value);
    } else {
        next = this.set.findLeast();
    }
    if (!next) {
        this._iterationObject.done = true;
        this._iterationObject.value = void 0;
    }
    else {
        if (
            this.end !== undefined &&
            this.set.contentCompare(next.value, this.end) >= 0
        ) {
            this._iterationObject.done = true;
            this._iterationObject.value = void 0;
        }
        else {
            this.prev = next;
            this._iterationObject.value =  next.value;
        }

    }
    return this._iterationObject;
};

},{"./generic-collection":6,"./generic-set":9,"./listen/property-changes":13,"./listen/range-changes":14,"./shim":19,"./tree-log":22}],22:[function(require,module,exports){
"use strict";

module.exports = TreeLog;

function TreeLog() {
}

TreeLog.ascii = {
    intersection: "+",
    through: "-",
    branchUp: "+",
    branchDown: "+",
    fromBelow: ".",
    fromAbove: "'",
    fromBoth: "+",
    strafe: "|"
};

TreeLog.unicodeRound = {
    intersection: "\u254b",
    through: "\u2501",
    branchUp: "\u253b",
    branchDown: "\u2533",
    fromBelow: "\u256d", // round corner
    fromAbove: "\u2570", // round corner
    fromBoth: "\u2523",
    strafe: "\u2503"
};

TreeLog.unicodeSharp = {
    intersection: "\u254b",
    through: "\u2501",
    branchUp: "\u253b",
    branchDown: "\u2533",
    fromBelow: "\u250f", // sharp corner
    fromAbove: "\u2517", // sharp corner
    fromBoth: "\u2523",
    strafe: "\u2503"
};


},{}],23:[function(require,module,exports){
(function (global){
module.exports = (global.WeakMap !== void 0) ? global.WeakMap : require("weak-map");

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"weak-map":24}],24:[function(require,module,exports){
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Install a leaky WeakMap emulation on platforms that
 * don't provide a built-in one.
 *
 * <p>Assumes that an ES5 platform where, if {@code WeakMap} is
 * already present, then it conforms to the anticipated ES6
 * specification. To run this file on an ES5 or almost ES5
 * implementation where the {@code WeakMap} specification does not
 * quite conform, run <code>repairES5.js</code> first.
 *
 * <p>Even though WeakMapModule is not global, the linter thinks it
 * is, which is why it is in the overrides list below.
 *
 * <p>NOTE: Before using this WeakMap emulation in a non-SES
 * environment, see the note below about hiddenRecord.
 *
 * @author Mark S. Miller
 * @requires crypto, ArrayBuffer, Uint8Array, navigator, console
 * @overrides WeakMap, ses, Proxy
 * @overrides WeakMapModule
 */

/**
 * This {@code WeakMap} emulation is observably equivalent to the
 * ES-Harmony WeakMap, but with leakier garbage collection properties.
 *
 * <p>As with true WeakMaps, in this emulation, a key does not
 * retain maps indexed by that key and (crucially) a map does not
 * retain the keys it indexes. A map by itself also does not retain
 * the values associated with that map.
 *
 * <p>However, the values associated with a key in some map are
 * retained so long as that key is retained and those associations are
 * not overridden. For example, when used to support membranes, all
 * values exported from a given membrane will live for the lifetime
 * they would have had in the absence of an interposed membrane. Even
 * when the membrane is revoked, all objects that would have been
 * reachable in the absence of revocation will still be reachable, as
 * far as the GC can tell, even though they will no longer be relevant
 * to ongoing computation.
 *
 * <p>The API implemented here is approximately the API as implemented
 * in FF6.0a1 and agreed to by MarkM, Andreas Gal, and Dave Herman,
 * rather than the offially approved proposal page. TODO(erights):
 * upgrade the ecmascript WeakMap proposal page to explain this API
 * change and present to EcmaScript committee for their approval.
 *
 * <p>The first difference between the emulation here and that in
 * FF6.0a1 is the presence of non enumerable {@code get___, has___,
 * set___, and delete___} methods on WeakMap instances to represent
 * what would be the hidden internal properties of a primitive
 * implementation. Whereas the FF6.0a1 WeakMap.prototype methods
 * require their {@code this} to be a genuine WeakMap instance (i.e.,
 * an object of {@code [[Class]]} "WeakMap}), since there is nothing
 * unforgeable about the pseudo-internal method names used here,
 * nothing prevents these emulated prototype methods from being
 * applied to non-WeakMaps with pseudo-internal methods of the same
 * names.
 *
 * <p>Another difference is that our emulated {@code
 * WeakMap.prototype} is not itself a WeakMap. A problem with the
 * current FF6.0a1 API is that WeakMap.prototype is itself a WeakMap
 * providing ambient mutability and an ambient communications
 * channel. Thus, if a WeakMap is already present and has this
 * problem, repairES5.js wraps it in a safe wrappper in order to
 * prevent access to this channel. (See
 * PATCH_MUTABLE_FROZEN_WEAKMAP_PROTO in repairES5.js).
 */

/**
 * If this is a full <a href=
 * "http://code.google.com/p/es-lab/wiki/SecureableES5"
 * >secureable ES5</a> platform and the ES-Harmony {@code WeakMap} is
 * absent, install an approximate emulation.
 *
 * <p>If WeakMap is present but cannot store some objects, use our approximate
 * emulation as a wrapper.
 *
 * <p>If this is almost a secureable ES5 platform, then WeakMap.js
 * should be run after repairES5.js.
 *
 * <p>See {@code WeakMap} for documentation of the garbage collection
 * properties of this WeakMap emulation.
 */
(function WeakMapModule() {
  "use strict";

  if (typeof ses !== 'undefined' && ses.ok && !ses.ok()) {
    // already too broken, so give up
    return;
  }

  /**
   * In some cases (current Firefox), we must make a choice betweeen a
   * WeakMap which is capable of using all varieties of host objects as
   * keys and one which is capable of safely using proxies as keys. See
   * comments below about HostWeakMap and DoubleWeakMap for details.
   *
   * This function (which is a global, not exposed to guests) marks a
   * WeakMap as permitted to do what is necessary to index all host
   * objects, at the cost of making it unsafe for proxies.
   *
   * Do not apply this function to anything which is not a genuine
   * fresh WeakMap.
   */
  function weakMapPermitHostObjects(map) {
    // identity of function used as a secret -- good enough and cheap
    if (map.permitHostObjects___) {
      map.permitHostObjects___(weakMapPermitHostObjects);
    }
  }
  if (typeof ses !== 'undefined') {
    ses.weakMapPermitHostObjects = weakMapPermitHostObjects;
  }

  // IE 11 has no Proxy but has a broken WeakMap such that we need to patch
  // it using DoubleWeakMap; this flag tells DoubleWeakMap so.
  var doubleWeakMapCheckSilentFailure = false;

  // Check if there is already a good-enough WeakMap implementation, and if so
  // exit without replacing it.
  if (typeof WeakMap === 'function') {
    var HostWeakMap = WeakMap;
    // There is a WeakMap -- is it good enough?
    if (typeof navigator !== 'undefined' &&
        /Firefox/.test(navigator.userAgent)) {
      // We're now *assuming not*, because as of this writing (2013-05-06)
      // Firefox's WeakMaps have a miscellany of objects they won't accept, and
      // we don't want to make an exhaustive list, and testing for just one
      // will be a problem if that one is fixed alone (as they did for Event).

      // If there is a platform that we *can* reliably test on, here's how to
      // do it:
      //  var problematic = ... ;
      //  var testHostMap = new HostWeakMap();
      //  try {
      //    testHostMap.set(problematic, 1);  // Firefox 20 will throw here
      //    if (testHostMap.get(problematic) === 1) {
      //      return;
      //    }
      //  } catch (e) {}

    } else {
      // IE 11 bug: WeakMaps silently fail to store frozen objects.
      var testMap = new HostWeakMap();
      var testObject = Object.freeze({});
      testMap.set(testObject, 1);
      if (testMap.get(testObject) !== 1) {
        doubleWeakMapCheckSilentFailure = true;
        // Fall through to installing our WeakMap.
      } else {
        module.exports = WeakMap;
        return;
      }
    }
  }

  var hop = Object.prototype.hasOwnProperty;
  var gopn = Object.getOwnPropertyNames;
  var defProp = Object.defineProperty;
  var isExtensible = Object.isExtensible;

  /**
   * Security depends on HIDDEN_NAME being both <i>unguessable</i> and
   * <i>undiscoverable</i> by untrusted code.
   *
   * <p>Given the known weaknesses of Math.random() on existing
   * browsers, it does not generate unguessability we can be confident
   * of.
   *
   * <p>It is the monkey patching logic in this file that is intended
   * to ensure undiscoverability. The basic idea is that there are
   * three fundamental means of discovering properties of an object:
   * The for/in loop, Object.keys(), and Object.getOwnPropertyNames(),
   * as well as some proposed ES6 extensions that appear on our
   * whitelist. The first two only discover enumerable properties, and
   * we only use HIDDEN_NAME to name a non-enumerable property, so the
   * only remaining threat should be getOwnPropertyNames and some
   * proposed ES6 extensions that appear on our whitelist. We monkey
   * patch them to remove HIDDEN_NAME from the list of properties they
   * returns.
   *
   * <p>TODO(erights): On a platform with built-in Proxies, proxies
   * could be used to trap and thereby discover the HIDDEN_NAME, so we
   * need to monkey patch Proxy.create, Proxy.createFunction, etc, in
   * order to wrap the provided handler with the real handler which
   * filters out all traps using HIDDEN_NAME.
   *
   * <p>TODO(erights): Revisit Mike Stay's suggestion that we use an
   * encapsulated function at a not-necessarily-secret name, which
   * uses the Stiegler shared-state rights amplification pattern to
   * reveal the associated value only to the WeakMap in which this key
   * is associated with that value. Since only the key retains the
   * function, the function can also remember the key without causing
   * leakage of the key, so this doesn't violate our general gc
   * goals. In addition, because the name need not be a guarded
   * secret, we could efficiently handle cross-frame frozen keys.
   */
  var HIDDEN_NAME_PREFIX = 'weakmap:';
  var HIDDEN_NAME = HIDDEN_NAME_PREFIX + 'ident:' + Math.random() + '___';

  if (typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function' &&
      typeof ArrayBuffer === 'function' &&
      typeof Uint8Array === 'function') {
    var ab = new ArrayBuffer(25);
    var u8s = new Uint8Array(ab);
    crypto.getRandomValues(u8s);
    HIDDEN_NAME = HIDDEN_NAME_PREFIX + 'rand:' +
      Array.prototype.map.call(u8s, function(u8) {
        return (u8 % 36).toString(36);
      }).join('') + '___';
  }

  function isNotHiddenName(name) {
    return !(
        name.substr(0, HIDDEN_NAME_PREFIX.length) == HIDDEN_NAME_PREFIX &&
        name.substr(name.length - 3) === '___');
  }

  /**
   * Monkey patch getOwnPropertyNames to avoid revealing the
   * HIDDEN_NAME.
   *
   * <p>The ES5.1 spec requires each name to appear only once, but as
   * of this writing, this requirement is controversial for ES6, so we
   * made this code robust against this case. If the resulting extra
   * search turns out to be expensive, we can probably relax this once
   * ES6 is adequately supported on all major browsers, iff no browser
   * versions we support at that time have relaxed this constraint
   * without providing built-in ES6 WeakMaps.
   */
  defProp(Object, 'getOwnPropertyNames', {
    value: function fakeGetOwnPropertyNames(obj) {
      return gopn(obj).filter(isNotHiddenName);
    }
  });

  /**
   * getPropertyNames is not in ES5 but it is proposed for ES6 and
   * does appear in our whitelist, so we need to clean it too.
   */
  if ('getPropertyNames' in Object) {
    var originalGetPropertyNames = Object.getPropertyNames;
    defProp(Object, 'getPropertyNames', {
      value: function fakeGetPropertyNames(obj) {
        return originalGetPropertyNames(obj).filter(isNotHiddenName);
      }
    });
  }

  /**
   * <p>To treat objects as identity-keys with reasonable efficiency
   * on ES5 by itself (i.e., without any object-keyed collections), we
   * need to add a hidden property to such key objects when we
   * can. This raises several issues:
   * <ul>
   * <li>Arranging to add this property to objects before we lose the
   *     chance, and
   * <li>Hiding the existence of this new property from most
   *     JavaScript code.
   * <li>Preventing <i>certification theft</i>, where one object is
   *     created falsely claiming to be the key of an association
   *     actually keyed by another object.
   * <li>Preventing <i>value theft</i>, where untrusted code with
   *     access to a key object but not a weak map nevertheless
   *     obtains access to the value associated with that key in that
   *     weak map.
   * </ul>
   * We do so by
   * <ul>
   * <li>Making the name of the hidden property unguessable, so "[]"
   *     indexing, which we cannot intercept, cannot be used to access
   *     a property without knowing the name.
   * <li>Making the hidden property non-enumerable, so we need not
   *     worry about for-in loops or {@code Object.keys},
   * <li>monkey patching those reflective methods that would
   *     prevent extensions, to add this hidden property first,
   * <li>monkey patching those methods that would reveal this
   *     hidden property.
   * </ul>
   * Unfortunately, because of same-origin iframes, we cannot reliably
   * add this hidden property before an object becomes
   * non-extensible. Instead, if we encounter a non-extensible object
   * without a hidden record that we can detect (whether or not it has
   * a hidden record stored under a name secret to us), then we just
   * use the key object itself to represent its identity in a brute
   * force leaky map stored in the weak map, losing all the advantages
   * of weakness for these.
   */
  function getHiddenRecord(key) {
    if (key !== Object(key)) {
      throw new TypeError('Not an object: ' + key);
    }
    var hiddenRecord = key[HIDDEN_NAME];
    if (hiddenRecord && hiddenRecord.key === key) { return hiddenRecord; }
    if (!isExtensible(key)) {
      // Weak map must brute force, as explained in doc-comment above.
      return void 0;
    }

    // The hiddenRecord and the key point directly at each other, via
    // the "key" and HIDDEN_NAME properties respectively. The key
    // field is for quickly verifying that this hidden record is an
    // own property, not a hidden record from up the prototype chain.
    //
    // NOTE: Because this WeakMap emulation is meant only for systems like
    // SES where Object.prototype is frozen without any numeric
    // properties, it is ok to use an object literal for the hiddenRecord.
    // This has two advantages:
    // * It is much faster in a performance critical place
    // * It avoids relying on Object.create(null), which had been
    //   problematic on Chrome 28.0.1480.0. See
    //   https://code.google.com/p/google-caja/issues/detail?id=1687
    hiddenRecord = { key: key };

    // When using this WeakMap emulation on platforms where
    // Object.prototype might not be frozen and Object.create(null) is
    // reliable, use the following two commented out lines instead.
    // hiddenRecord = Object.create(null);
    // hiddenRecord.key = key;

    // Please contact us if you need this to work on platforms where
    // Object.prototype might not be frozen and
    // Object.create(null) might not be reliable.

    try {
      defProp(key, HIDDEN_NAME, {
        value: hiddenRecord,
        writable: false,
        enumerable: false,
        configurable: false
      });
      return hiddenRecord;
    } catch (error) {
      // Under some circumstances, isExtensible seems to misreport whether
      // the HIDDEN_NAME can be defined.
      // The circumstances have not been isolated, but at least affect
      // Node.js v0.10.26 on TravisCI / Linux, but not the same version of
      // Node.js on OS X.
      return void 0;
    }
  }

  /**
   * Monkey patch operations that would make their argument
   * non-extensible.
   *
   * <p>The monkey patched versions throw a TypeError if their
   * argument is not an object, so it should only be done to functions
   * that should throw a TypeError anyway if their argument is not an
   * object.
   */
  (function(){
    var oldFreeze = Object.freeze;
    defProp(Object, 'freeze', {
      value: function identifyingFreeze(obj) {
        getHiddenRecord(obj);
        return oldFreeze(obj);
      }
    });
    var oldSeal = Object.seal;
    defProp(Object, 'seal', {
      value: function identifyingSeal(obj) {
        getHiddenRecord(obj);
        return oldSeal(obj);
      }
    });
    var oldPreventExtensions = Object.preventExtensions;
    defProp(Object, 'preventExtensions', {
      value: function identifyingPreventExtensions(obj) {
        getHiddenRecord(obj);
        return oldPreventExtensions(obj);
      }
    });
  })();

  function constFunc(func) {
    func.prototype = null;
    return Object.freeze(func);
  }

  var calledAsFunctionWarningDone = false;
  function calledAsFunctionWarning() {
    // Future ES6 WeakMap is currently (2013-09-10) expected to reject WeakMap()
    // but we used to permit it and do it ourselves, so warn only.
    if (!calledAsFunctionWarningDone && typeof console !== 'undefined') {
      calledAsFunctionWarningDone = true;
      console.warn('WeakMap should be invoked as new WeakMap(), not ' +
          'WeakMap(). This will be an error in the future.');
    }
  }

  var nextId = 0;

  var OurWeakMap = function() {
    if (!(this instanceof OurWeakMap)) {  // approximate test for new ...()
      calledAsFunctionWarning();
    }

    // We are currently (12/25/2012) never encountering any prematurely
    // non-extensible keys.
    var keys = []; // brute force for prematurely non-extensible keys.
    var values = []; // brute force for corresponding values.
    var id = nextId++;

    function get___(key, opt_default) {
      var index;
      var hiddenRecord = getHiddenRecord(key);
      if (hiddenRecord) {
        return id in hiddenRecord ? hiddenRecord[id] : opt_default;
      } else {
        index = keys.indexOf(key);
        return index >= 0 ? values[index] : opt_default;
      }
    }

    function has___(key) {
      var hiddenRecord = getHiddenRecord(key);
      if (hiddenRecord) {
        return id in hiddenRecord;
      } else {
        return keys.indexOf(key) >= 0;
      }
    }

    function set___(key, value) {
      var index;
      var hiddenRecord = getHiddenRecord(key);
      if (hiddenRecord) {
        hiddenRecord[id] = value;
      } else {
        index = keys.indexOf(key);
        if (index >= 0) {
          values[index] = value;
        } else {
          // Since some browsers preemptively terminate slow turns but
          // then continue computing with presumably corrupted heap
          // state, we here defensively get keys.length first and then
          // use it to update both the values and keys arrays, keeping
          // them in sync.
          index = keys.length;
          values[index] = value;
          // If we crash here, values will be one longer than keys.
          keys[index] = key;
        }
      }
      return this;
    }

    function delete___(key) {
      var hiddenRecord = getHiddenRecord(key);
      var index, lastIndex;
      if (hiddenRecord) {
        return id in hiddenRecord && delete hiddenRecord[id];
      } else {
        index = keys.indexOf(key);
        if (index < 0) {
          return false;
        }
        // Since some browsers preemptively terminate slow turns but
        // then continue computing with potentially corrupted heap
        // state, we here defensively get keys.length first and then use
        // it to update both the keys and the values array, keeping
        // them in sync. We update the two with an order of assignments,
        // such that any prefix of these assignments will preserve the
        // key/value correspondence, either before or after the delete.
        // Note that this needs to work correctly when index === lastIndex.
        lastIndex = keys.length - 1;
        keys[index] = void 0;
        // If we crash here, there's a void 0 in the keys array, but
        // no operation will cause a "keys.indexOf(void 0)", since
        // getHiddenRecord(void 0) will always throw an error first.
        values[index] = values[lastIndex];
        // If we crash here, values[index] cannot be found here,
        // because keys[index] is void 0.
        keys[index] = keys[lastIndex];
        // If index === lastIndex and we crash here, then keys[index]
        // is still void 0, since the aliasing killed the previous key.
        keys.length = lastIndex;
        // If we crash here, keys will be one shorter than values.
        values.length = lastIndex;
        return true;
      }
    }

    return Object.create(OurWeakMap.prototype, {
      get___:    { value: constFunc(get___) },
      has___:    { value: constFunc(has___) },
      set___:    { value: constFunc(set___) },
      delete___: { value: constFunc(delete___) }
    });
  };

  OurWeakMap.prototype = Object.create(Object.prototype, {
    get: {
      /**
       * Return the value most recently associated with key, or
       * opt_default if none.
       */
      value: function get(key, opt_default) {
        return this.get___(key, opt_default);
      },
      writable: true,
      configurable: true
    },

    has: {
      /**
       * Is there a value associated with key in this WeakMap?
       */
      value: function has(key) {
        return this.has___(key);
      },
      writable: true,
      configurable: true
    },

    set: {
      /**
       * Associate value with key in this WeakMap, overwriting any
       * previous association if present.
       */
      value: function set(key, value) {
        return this.set___(key, value);
      },
      writable: true,
      configurable: true
    },

    'delete': {
      /**
       * Remove any association for key in this WeakMap, returning
       * whether there was one.
       *
       * <p>Note that the boolean return here does not work like the
       * {@code delete} operator. The {@code delete} operator returns
       * whether the deletion succeeds at bringing about a state in
       * which the deleted property is absent. The {@code delete}
       * operator therefore returns true if the property was already
       * absent, whereas this {@code delete} method returns false if
       * the association was already absent.
       */
      value: function remove(key) {
        return this.delete___(key);
      },
      writable: true,
      configurable: true
    }
  });

  if (typeof HostWeakMap === 'function') {
    (function() {
      // If we got here, then the platform has a WeakMap but we are concerned
      // that it may refuse to store some key types. Therefore, make a map
      // implementation which makes use of both as possible.

      // In this mode we are always using double maps, so we are not proxy-safe.
      // This combination does not occur in any known browser, but we had best
      // be safe.
      if (doubleWeakMapCheckSilentFailure && typeof Proxy !== 'undefined') {
        Proxy = undefined;
      }

      function DoubleWeakMap() {
        if (!(this instanceof OurWeakMap)) {  // approximate test for new ...()
          calledAsFunctionWarning();
        }

        // Preferable, truly weak map.
        var hmap = new HostWeakMap();

        // Our hidden-property-based pseudo-weak-map. Lazily initialized in the
        // 'set' implementation; thus we can avoid performing extra lookups if
        // we know all entries actually stored are entered in 'hmap'.
        var omap = undefined;

        // Hidden-property maps are not compatible with proxies because proxies
        // can observe the hidden name and either accidentally expose it or fail
        // to allow the hidden property to be set. Therefore, we do not allow
        // arbitrary WeakMaps to switch to using hidden properties, but only
        // those which need the ability, and unprivileged code is not allowed
        // to set the flag.
        //
        // (Except in doubleWeakMapCheckSilentFailure mode in which case we
        // disable proxies.)
        var enableSwitching = false;

        function dget(key, opt_default) {
          if (omap) {
            return hmap.has(key) ? hmap.get(key)
                : omap.get___(key, opt_default);
          } else {
            return hmap.get(key, opt_default);
          }
        }

        function dhas(key) {
          return hmap.has(key) || (omap ? omap.has___(key) : false);
        }

        var dset;
        if (doubleWeakMapCheckSilentFailure) {
          dset = function(key, value) {
            hmap.set(key, value);
            if (!hmap.has(key)) {
              if (!omap) { omap = new OurWeakMap(); }
              omap.set(key, value);
            }
            return this;
          };
        } else {
          dset = function(key, value) {
            if (enableSwitching) {
              try {
                hmap.set(key, value);
              } catch (e) {
                if (!omap) { omap = new OurWeakMap(); }
                omap.set___(key, value);
              }
            } else {
              hmap.set(key, value);
            }
            return this;
          };
        }

        function ddelete(key) {
          var result = !!hmap['delete'](key);
          if (omap) { return omap.delete___(key) || result; }
          return result;
        }

        return Object.create(OurWeakMap.prototype, {
          get___:    { value: constFunc(dget) },
          has___:    { value: constFunc(dhas) },
          set___:    { value: constFunc(dset) },
          delete___: { value: constFunc(ddelete) },
          permitHostObjects___: { value: constFunc(function(token) {
            if (token === weakMapPermitHostObjects) {
              enableSwitching = true;
            } else {
              throw new Error('bogus call to permitHostObjects___');
            }
          })}
        });
      }
      DoubleWeakMap.prototype = OurWeakMap.prototype;
      module.exports = DoubleWeakMap;

      // define .constructor to hide OurWeakMap ctor
      Object.defineProperty(WeakMap.prototype, 'constructor', {
        value: WeakMap,
        enumerable: false,  // as default .constructor is
        configurable: true,
        writable: true
      });
    })();
  } else {
    // There is no host WeakMap, so we must use the emulation.

    // Emulated WeakMaps are incompatible with native proxies (because proxies
    // can observe the hidden name), so we must disable Proxy usage (in
    // ArrayLike and Domado, currently).
    if (typeof Proxy !== 'undefined') {
      Proxy = undefined;
    }

    module.exports = OurWeakMap;
  }
})();

},{}],25:[function(require,module,exports){
module.exports = function (cytoscape, $) {
    
    // Needed because parent nodes cannot be moved!
    function moveTopDown(node, dx, dy) {
        var nodes = node.union(node.descendants());

        nodes.positions(function (i, node) {
            var pos = node.position();
            return {
                x: pos.x + dx,
                y: pos.y + dy
            };
        });
    }

    function getTopMostNodes(nodes) {
        var nodesMap = {};
        for (var i = 0; i < nodes.length; i++) {
            nodesMap[nodes[i].id()] = true;
        }
        var roots = nodes.filter(function (i, ele) {
            var parent = ele.parent()[0];
            while(parent != null){
                if(nodesMap[parent.id()]){
                    return false;
                }
                parent = parent.parent()[0];
            }
            return true;
        });

        return roots;
    }


    cytoscape( "collection", "align", function (horizontal, vertical, alignTo) {

        var eles = getTopMostNodes(this.nodes(":visible"));

        var modelNode = alignTo ? alignTo : eles[0];

        eles = eles.not(modelNode);

        horizontal = horizontal ? horizontal : "none";
        vertical = vertical ? vertical : "none";


        // 0 for center
        var xFactor = 0;
        var yFactor = 0;

        if (vertical == "left")
            xFactor = -1;
        else if (vertical == "right")
            xFactor = 1;

        if (horizontal == "top")
            yFactor = -1;
        else if (horizontal == "bottom")
            yFactor = 1;


        for (var i = 0; i < eles.length; i++) {
            var node = eles[i];
            var oldPos = $.extend({}, node.position());
            var newPos = $.extend({}, node.position());

            if (vertical != "none")
                newPos.x = modelNode.position("x") + xFactor * (modelNode.width() - node.width()) / 2;


            if (horizontal != "none")
                newPos.y = modelNode.position("y") + yFactor * (modelNode.height() - node.height()) / 2;

            moveTopDown(node, newPos.x - oldPos.x, newPos.y - oldPos.y);
        }

        return this;
    });

    if (cy.undoRedo) {
        function getNodePositions() {
            var positionsAndSizes = {};
            var nodes = cy.nodes();

            for (var i = 0; i < nodes.length; i++) {
                var ele = nodes[i];
                positionsAndSizes[ele.id()] = {
                    x: ele.position("x"),
                    y: ele.position("y")
                };
            }

            return positionsAndSizes;
        }

        function returnToPositions(nodesData) {
            var currentPositions = {};
            cy.nodes().positions(function (i, ele) {
                currentPositions[ele.id()] = {
                    x: ele.position("x"),
                    y: ele.position("y")
                };
                var data = nodesData[ele.id()];
                return {
                    x: data.x,
                    y: data.y
                };
            });

            return currentPositions
        }

        var ur = cy.undoRedo();

        ur.action("align", function (args) {

            var nodesData;
            if (args.firstTime){
                nodesData = getNodePositions();
                args.nodes.align(args.horizontal, args.vertical, args.alignTo);
            }
            else
                nodesData = returnToPositions(args);

            return nodesData;

        }, function (nodesData) {
            return returnToPositions(nodesData);
        });

    }



};
},{}],26:[function(require,module,exports){

var debounce = (function(){
    /**
     * lodash 3.1.1 (Custom Build) <https://lodash.com/>
     * Build: `lodash modern modularize exports="npm" -o ./`
     * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     * Available under MIT license <https://lodash.com/license>
     */
    /** Used as the `TypeError` message for "Functions" methods. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /* Native method references for those with the same name as other `lodash` methods. */
    var nativeMax = Math.max,
        nativeNow = Date.now;

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Date
     * @example
     *
     * _.defer(function(stamp) {
     *   console.log(_.now() - stamp);
     * }, _.now());
     * // => logs the number of milliseconds it took for the deferred function to be invoked
     */
    var now = nativeNow || function() {
            return new Date().getTime();
        };

    /**
     * Creates a debounced function that delays invoking `func` until after `wait`
     * milliseconds have elapsed since the last time the debounced function was
     * invoked. The debounced function comes with a `cancel` method to cancel
     * delayed invocations. Provide an options object to indicate that `func`
     * should be invoked on the leading and/or trailing edge of the `wait` timeout.
     * Subsequent calls to the debounced function return the result of the last
     * `func` invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
     * for details over the differences between `_.debounce` and `_.throttle`.
     *
     * @static
     * @memberOf _
     * @category Function
     * @param {Function} func The function to debounce.
     * @param {number} [wait=0] The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify invoking on the leading
     *  edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be
     *  delayed before it's invoked.
     * @param {boolean} [options.trailing=true] Specify invoking on the trailing
     *  edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
     *
     * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * }));
     *
     * // ensure `batchLog` is invoked once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * jQuery(source).on('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }));
     *
     * // cancel a debounced call
     * var todoChanges = _.debounce(batchLog, 1000);
     * Object.observe(models.todo, todoChanges);
     *
     * Object.observe(models, function(changes) {
     *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
     *     todoChanges.cancel();
     *   }
     * }, ['delete']);
     *
     * // ...at some point `models.todo` is changed
     * models.todo.completed = true;
     *
     * // ...before 1 second has passed `models.todo` is deleted
     * // which cancels the debounced `todoChanges` call
     * delete models.todo;
     */
    function debounce(func, wait, options) {
        var args,
            maxTimeoutId,
            result,
            stamp,
            thisArg,
            timeoutId,
            trailingCall,
            lastCalled = 0,
            maxWait = false,
            trailing = true;

        if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
        }
        wait = wait < 0 ? 0 : (+wait || 0);
        if (options === true) {
            var leading = true;
            trailing = false;
        } else if (isObject(options)) {
            leading = !!options.leading;
            maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
            trailing = 'trailing' in options ? !!options.trailing : trailing;
        }

        function cancel() {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (maxTimeoutId) {
                clearTimeout(maxTimeoutId);
            }
            lastCalled = 0;
            maxTimeoutId = timeoutId = trailingCall = undefined;
        }

        function complete(isCalled, id) {
            if (id) {
                clearTimeout(id);
            }
            maxTimeoutId = timeoutId = trailingCall = undefined;
            if (isCalled) {
                lastCalled = now();
                result = func.apply(thisArg, args);
                if (!timeoutId && !maxTimeoutId) {
                    args = thisArg = undefined;
                }
            }
        }

        function delayed() {
            var remaining = wait - (now() - stamp);
            if (remaining <= 0 || remaining > wait) {
                complete(trailingCall, maxTimeoutId);
            } else {
                timeoutId = setTimeout(delayed, remaining);
            }
        }

        function maxDelayed() {
            complete(trailing, timeoutId);
        }

        function debounced() {
            args = arguments;
            stamp = now();
            thisArg = this;
            trailingCall = trailing && (timeoutId || !leading);

            if (maxWait === false) {
                var leadingCall = leading && !timeoutId;
            } else {
                if (!maxTimeoutId && !leading) {
                    lastCalled = stamp;
                }
                var remaining = maxWait - (stamp - lastCalled),
                    isCalled = remaining <= 0 || remaining > maxWait;

                if (isCalled) {
                    if (maxTimeoutId) {
                        maxTimeoutId = clearTimeout(maxTimeoutId);
                    }
                    lastCalled = stamp;
                    result = func.apply(thisArg, args);
                }
                else if (!maxTimeoutId) {
                    maxTimeoutId = setTimeout(maxDelayed, remaining);
                }
            }
            if (isCalled && timeoutId) {
                timeoutId = clearTimeout(timeoutId);
            }
            else if (!timeoutId && wait !== maxWait) {
                timeoutId = setTimeout(delayed, wait);
            }
            if (leadingCall) {
                isCalled = true;
                result = func.apply(thisArg, args);
            }
            if (isCalled && !timeoutId && !maxTimeoutId) {
                args = thisArg = undefined;
            }
            return result;
        }
        debounced.cancel = cancel;
        return debounced;
    }

    /**
     * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return !!value && (type == 'object' || type == 'function');
    }

    return debounce;

})();

module.exports = debounce;
},{}],27:[function(require,module,exports){
module.exports = function (cy, snap) {

    var discreteDrag = {};

    var attachedNode;
    var draggedNodes;

    var startPos;
    var endPos;


    discreteDrag.onTapStartNode = function (e) {
        if (e.cyTarget.selected())
            draggedNodes = e.cy.$(":selected");
        else
            draggedNodes = e.cyTarget;

        startPos = e.cyPosition;

        attachedNode = e.cyTarget;
        attachedNode.lock();
        attachedNode.trigger("grab");
        cy.on("tapdrag", onTapDrag);
        cy.on("tapend", onTapEndNode);

    };

    var onTapEndNode = function (e) {
        //attachedNode.trigger("free");
        cy.off("tapdrag", onTapDrag);
        cy.off("tapend", onTapEndNode);
        attachedNode.unlock();
        e.preventDefault();
    };

    var getDist = function () {
        return {
            x: endPos.x - startPos.x,
            y: endPos.y - startPos.y
        }
    };

    function getTopMostNodes(nodes) {
        var nodesMap = {};

        for (var i = 0; i < nodes.length; i++) {
            nodesMap[nodes[i].id()] = true;
        }

        var roots = nodes.filter(function (i, ele) {
            var parent = ele.parent()[0];
            while (parent != null) {
                if (nodesMap[parent.id()]) {
                    return false;
                }
                parent = parent.parent()[0];
            }
            return true;
        });

        return roots;
    }

    var moveNodesTopDown = function (nodes, dx, dy) {

/*
        console.log(nodes.map(function (e) {
            return e.id();
        }));
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var pos = node.position();

            if (!node.isParent()) {
                node.position({
                    x: pos.x + dx,
                    y: pos.y + dy
                });
                console.log(node.id() + " " + dx + " " + dy);
            }

            moveNodesTopDown(nodes.children(), dx, dy);
        }
*/
    };

    var onTapDrag = function (e) {

        var nodePos = attachedNode.position();
        endPos = e.cyPosition;
        endPos = snap.snapPos(endPos);
        var dist = getDist();
        if (dist.x != 0 || dist.y != 0) {
            attachedNode.unlock();
            //var topMostNodes = getTopMostNodes(draggedNodes);
            var nodes = draggedNodes.union(draggedNodes.descendants());

            nodes.positions(function (i, node) {
                var pos = node.position();
                return snap.snapPos({
                    x: pos.x + dist.x,
                    y: pos.y + dist.y
                });
            });

            startPos = endPos;
            attachedNode.lock();
            attachedNode.trigger("drag");
        }

    };

    return discreteDrag;


};
},{}],28:[function(require,module,exports){
module.exports = function (opts, cy, $, debounce) {

    var options = opts;

    var changeOptions = function (opts) {
      options = opts;
    };


    var $canvas = $( '<canvas></canvas>' );
    var $container = $( cy.container() );
    var ctx = $canvas[ 0 ].getContext( '2d' );
    $container.append( $canvas );

    var drawGrid = function() {
        clearDrawing();

        var zoom = cy.zoom();
        var canvasWidth = $container.width();
        var canvasHeight = $container.height();
        var increment = options.gridSpacing*zoom;
        var pan = cy.pan();
        var initialValueX = pan.x%increment;
        var initialValueY = pan.y%increment;

        ctx.strokeStyle = options.strokeStyle;
        ctx.lineWidth = options.lineWidth;

        if(options.zoomDash) {
            var zoomedDash = options.lineDash.slice();

            for(var i = 0; i < zoomedDash.length; i++) {
                zoomedDash[ i ] = options.lineDash[ i ]*zoom;
            }
            ctx.setLineDash( zoomedDash );
        } else {
            ctx.setLineDash( options.lineDash );
        }

        if(options.panGrid) {
            ctx.lineDashOffset = -pan.y;
        } else {
            ctx.lineDashOffset = 0;
        }

        for(var i = initialValueX; i < canvasWidth; i += increment) {
            ctx.beginPath();
            ctx.moveTo( i, 0 );
            ctx.lineTo( i, canvasHeight );
            ctx.stroke();
        }

        if(options.panGrid) {
            ctx.lineDashOffset = -pan.x;
        } else {
            ctx.lineDashOffset = 0;
        }

        for(var i = initialValueY; i < canvasHeight; i += increment) {
            ctx.beginPath();
            ctx.moveTo( 0, i );
            ctx.lineTo( canvasWidth, i );
            ctx.stroke();
        }
    };
    var clearDrawing = function() {
        var width = $container.width();
        var height = $container.height();

        ctx.clearRect( 0, 0, width, height );
    };

    var resizeCanvas = debounce(function() {
            $canvas
                .attr( 'height', $container.height() )
                .attr( 'width', $container.width() )
                .css( {
                    'position': 'absolute',
                    'top': 0,
                    'left': 0,
                    'z-index': options.gridStackOrder
                } );

            setTimeout( function() {
                var canvasBb = $canvas.offset();
                var containerBb = $container.offset();

                $canvas
                    .attr( 'height', $container.height() )
                    .attr( 'width', $container.width() )
                    .css( {
                        'top': -( canvasBb.top - containerBb.top ),
                        'left': -( canvasBb.left - containerBb.left )
                    } );
                drawGrid();
            }, 0 );

    }, 250);




    return {
        initCanvas: resizeCanvas,
        resizeCanvas: resizeCanvas,
        clearCanvas: clearDrawing,
        drawGrid: drawGrid,
        changeOptions: changeOptions,
        sizeCanvas: drawGrid
    };
};
},{}],29:[function(require,module,exports){
module.exports = function (cy, snap, resize, discreteDrag, drawGrid, guidelines, parentPadding, $) {

    var feature = function (func) {
        return function (enable) {
            func(enable);
        };
    };

    var controller = {
        discreteDrag: new feature(setDiscreteDrag),
        resize: new feature(setResize),
        snapToGrid: new feature(setSnapToGrid),
        drawGrid: new feature(setDrawGrid),
        guidelines: new feature(setGuidelines),
        parentPadding: new feature(setParentPadding)
    };

    function applyToCyTarget(func, allowParent) {
        return function (e) {
            if (!e.cyTarget.is(":parent") || allowParent)
                func(e.cyTarget);
        }
    }

    function applyToActiveNodes(func, allowParent) {
        return function (e) {
            if (!e.cyTarget.is(":parent") || allowParent)
                if (e.cyTarget.selected())
                    func(e.cyTarget, e.cy.$(":selected"));
                else
                    func(e.cyTarget, e.cyTarget);
        }
    }

    function applyToAllNodesButNoParent(func) {
        return function () {
            cy.nodes().not(":parent").each(function (i, ele) {
                func(ele);
            });
        };
    }
    function applyToAllNodes(func) {
        return function () {
            cy.nodes().each(function (i, ele) {
                func(ele);
            });
        };
    }

    function eventStatus(enable) {
        return enable ? "on" : "off";
    }


    // Discrete Drag
    function setDiscreteDrag(enable) {
        cy[eventStatus(enable)]("tapstart", "node", discreteDrag.onTapStartNode);
    }

    // Resize
    var resizeAllNodes = applyToAllNodesButNoParent(resize.resizeNode);
    var resizeNode = applyToCyTarget(resize.resizeNode);
    var recoverAllNodeDimensions = applyToAllNodesButNoParent(resize.recoverNodeDimensions);

    function setResize(enable) {
        cy[eventStatus(enable)]("ready", resizeAllNodes);
      //  cy[eventStatus(enable)]("style", "node", resizeNode);
        enable ? resizeAllNodes() : recoverAllNodeDimensions();
    }

    // Snap To Grid
    var snapAllNodes = applyToAllNodes(snap.snapNodesTopDown);
    var recoverSnapAllNodes = applyToAllNodes(snap.recoverSnapNode);
    var snapCyTarget = applyToCyTarget(snap.snapNode, true);

    function setSnapToGrid(enable) {
        cy[eventStatus(enable)]("add", "node", snapCyTarget);
        cy[eventStatus(enable)]("ready", snapAllNodes);

        cy[eventStatus(enable)]("free", "node", snap.onFreeNode);

        if (enable) {
            snapAllNodes();
        } else {
            recoverSnapAllNodes();
        }
    }

    // Draw Grid
    var drawGridOnZoom = function () {
        if (currentOptions.zoomDash) drawGrid.drawGrid()
    };
    var drawGridOnPan = function () {
        if (currentOptions.panGrid) drawGrid.drawGrid()
    };

    function setDrawGrid(enable) {
        cy[eventStatus(enable)]('zoom', drawGridOnZoom);
        cy[eventStatus(enable)]('pan', drawGridOnPan);
        cy[eventStatus(enable)]('ready', drawGrid.resizeCanvas);

        if (enable) {
            drawGrid.initCanvas();
            $(window).on('resize', drawGrid.resizeCanvas);
        } else {
            drawGrid.clearCanvas();
            $(window).off('resize', drawGrid.resizeCanvas);
        }
    }

    // Guidelines

    function setGuidelines(enable) {
        cy[eventStatus(enable)]('zoom', guidelines.onZoom);
        cy[eventStatus(enable)]('drag', "node", guidelines.onDragNode);
        cy[eventStatus(enable)]('grab', "node", guidelines.onGrabNode);
        cy[eventStatus(enable)]('free', "node", guidelines.onFreeNode);

    }

    // Parent Padding
    var setAllParentPaddings = function (enable) {
        parentPadding.setPaddingOfParent(cy.nodes(":parent"), enable);
    };
    var enableParentPadding = function (node) {
        parentPadding.setPaddingOfParent(node, true);
    };


    function setParentPadding(enable) {

        setAllParentPaddings(enable);

        cy[eventStatus(enable)]('ready', setAllParentPaddings);
        cy[eventStatus(enable)]("add", "node:parent", applyToCyTarget(enableParentPadding, true));
    }

    // Sync with options: Enables/disables changed via options.
    var latestOptions = {};
    var currentOptions;

    var specialOpts = {
        drawGrid: ["gridSpacing", "zoomDash", "panGrid", "gridStackOrder", "strokeStyle", "lineWidth", "lineDash"],
        guidelines: ["gridSpacing", "guidelinesStackOrder", "guidelinesTolerance", "guidelinesStyle"],
        resize: ["gridSpacing"],
        parentPadding: ["gridSpacing", "parentSpacing"],
        snapToGrid: ["gridSpacing"]
    };

    function syncWithOptions(options) {
        currentOptions = $.extend(true, {}, options);
        for (var key in options)
            if (latestOptions[key] != options[key])
                if (controller.hasOwnProperty(key)) {
                    controller[key](options[key]);
                } else {
                    for (var optsKey in specialOpts) {
                        var opts = specialOpts[optsKey];
                        if (opts.indexOf(key) >= 0) {
                            if(optsKey == "drawGrid") {
                                drawGrid.changeOptions(options);
                                if (options.drawGrid)
                                    drawGrid.resizeCanvas();
                            }

                            if (optsKey == "snapToGrid"){
                                snap.changeOptions(options);
                                if (options.snapToGrid)
                                    snapAllNodes();
                            }

                            if(optsKey == "guidelines")
                                guidelines.changeOptions(options);

                            if (optsKey == "resize") {
                                resize.changeOptions(options);
                                if (options.resize)
                                    resizeAllNodes();
                            }

                            if (optsKey == "parentPadding")
                                parentPadding.changeOptions(options);

                                
                        }
                    }
                }
        latestOptions = $.extend(true, latestOptions, options);
    }

    return {
        init: syncWithOptions,
        syncWithOptions: syncWithOptions
    };

};
},{}],30:[function(require,module,exports){
module.exports = function (opts, cy, $, debounce) {


    var SortedMap = require("collections/sorted-map");

    var options = opts;

    var changeOptions = function (opts) {
        options = opts;
    };

    function calcDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
    
    function getExtraDim(node, paddingDim) {

    }

    var dims = function (node) {

        var pos = node.renderedPosition();
        var width = node.renderedWidth();
        var height = node.renderedHeight();
        var padding = {
            left: Number(node.renderedStyle("padding-left").replace("px", "")),
            right: Number(node.renderedStyle("padding-right").replace("px", "")),
            top: Number(node.renderedStyle("padding-top").replace("px", "")),
            bottom: Number(node.renderedStyle("padding-bottom").replace("px", ""))
        };

        this.horizontal = {
            center: pos.x,
            left: pos.x - (padding.left + width / 2),
            right: pos.x + (padding.right + width / 2)
        };

        this.vertical = {
            center: pos.y,
            top: pos.y - (padding.top + height / 2),
            bottom: pos.y + (padding.bottom + height / 2)
        };

        return this;
    };

    var $canvas = $('<canvas></canvas>');
    var $container = $(cy.container());
    var ctx = $canvas[0].getContext('2d');
    $container.append($canvas);

    $canvas
        .attr('height', $container.height())
        .attr('width', $container.width())
        .css({
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': options.guidelinesStackOrder
        });

    var canvasBb = $canvas.offset();
    var containerBb = $container.offset();

    $canvas
        .attr( 'height', $container.height() )
        .attr( 'width', $container.width() )
        .css( {
            'top': -( canvasBb.top - containerBb.top ),
            'left': -( canvasBb.left - containerBb.left )
        } );
    var clearDrawing = function () {
        var width = $container.width();
        var height = $container.height();

        ctx.clearRect(0, 0, width, height);
    };


    var pickedNode;

    function onGrabNode(e) {
        pickedNode = e.cyTarget;
        onDragNode(e);
    }

    var onDragNode = debounce(function(e) {
        if (pickedNode) {
            var node = pickedNode;

            var mainDims = new dims(node);

            var cy = e.cy;
            var nearests = {
                horizontal: {
                    distance: Number.MAX_VALUE
                },
                vertical: {
                    distance: Number.MAX_VALUE
                }
            };

            cy.nodes(":visible").not(node.ancestors()).not(node.descendants()).not(node).each(function (i, ele) {
                var nodeDims = new dims(ele);


                for (var dim in mainDims) {
                    var mainDim = mainDims[dim];
                    var nodeDim = nodeDims[dim];
                    var otherDim = dim == "horizontal" ? "y" : "x";
                    var eitherDim = otherDim == "x" ? "y" : "x";
                    for (var key in mainDim) {
                        for (var key2 in nodeDim) {
                            if (Math.abs(mainDim[key] - nodeDim[key2]) < options.guidelinesTolerance) {
                                var distance = calcDistance(node.renderedPosition(), ele.renderedPosition());
                                if (nearests[dim].distance > distance) {

                                    nearests[dim] = {
                                        to: ele.id(),
                                        toPos: {},
                                        from: node.id(),
                                        fromPos: {},
                                        distance: distance
                                    };
                                    nearests[dim].fromPos[eitherDim] = mainDim[key];
                                    nearests[dim].fromPos[otherDim] = node.renderedPosition(otherDim);
                                    nearests[dim].toPos[eitherDim] = nodeDim[key2];
                                    nearests[dim].toPos[otherDim] = ele.renderedPosition(otherDim);
                                }
                            }
                            // console.log(key + " of " + node.id() + " -> " + key2 + " of " + ele.id())
                        }
                    }
                }
            });

            clearDrawing();
            for (var key in nearests) {
                var item = nearests[key];
                if (item.from) {
                    ctx.beginPath();
                    ctx.moveTo(item.fromPos.x, item.fromPos.y);
                    ctx.lineTo(item.toPos.x, item.toPos.y);

                    ctx.setLineDash(options.guidelinesStyle.lineDash);
                    for (var styleKey in options.guidelinesStyle)
                        ctx[styleKey] = options.guidelinesStyle[styleKey];

                    ctx.stroke();
                }
            }

        }
    }, 0, true);

    function onFreeNode() {
        pickedNode = undefined;
        clearDrawing();
    }

    return {
        onDragNode: onDragNode,
        onZoom: onDragNode,
        onGrabNode: onGrabNode,
        onFreeNode: onFreeNode,
        changeOptions: changeOptions
    }

};
},{"collections/sorted-map":20}],31:[function(require,module,exports){
;(function(){ 'use strict';

    // registers the extension on a cytoscape lib ref
    var register = function( cytoscape ){

        if( !cytoscape ){ return; } // can't register if cytoscape unspecified


        var options = {
            // On/Off Modules
            snapToGrid: true, // Snap to grid functionality
            discreteDrag: true, // Discrete Drag
            guidelines: true, // Guidelines on dragging nodes
            resize: true, // Adjust node sizes to cell sizes
            parentPadding: true, // Adjust parent sizes to cell sizes by padding
            drawGrid: true, // Draw grid background

            // Other settings

            // General
            gridSpacing: 20, // Distance between the lines of the grid.

            // Draw Grid
            zoomDash: true, // Determines whether the size of the dashes should change when the drawing is zoomed in and out if grid is drawn.
            panGrid: true, // Determines whether the grid should move then the user moves the graph if grid is drawn.
            gridStackOrder: -1, // Namely z-index
            strokeStyle: '#dedede', // Color of grid lines
            lineWidth: 1.0, // Width of grid lines
            lineDash: [2.5, 4], // Defines style of dash. Read: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setLineDash

            // Guidelines
            guidelinesStackOrder: 4, // z-index of guidelines
            guidelinesTolerance: 2.00, // Tolerance distance for rendered positions of nodes' interaction.
            guidelinesStyle: { // Set ctx properties of line. Properties are here:
                strokeStyle: "#8b7d6b",
                lineDash: [3, 5]
            },

            // Parent Padding
            parentSpacing: -1 // -1 to set paddings of parents to gridSpacing
        };

        var _snap = require("./snap");
        var _discreteDrag = require("./discrete_drag");
        var _drawGrid = require("./draw_grid");
        var _resize = require("./resize");
        var _eventsController = require("./events_controller");
        var _guidelines = require("./guidelines");
        var _parentPadding = require("./parentPadding");
        var _alignment = require("./alignment");
        var debounce = require("./debounce");
        var snap, resize, discreteDrag, drawGrid, eventsController, guidelines, parentPadding, alignment;

        function getScratch() {
            if (!cy.scratch("_gridGuide")) {
                cy.scratch("_gridGuide", { });

            }
            return cy.scratch("_gridGuide");
        }

        cytoscape( 'core', 'gridGuide', function(opts){
            var cy = this;
            $.extend(true, options, opts);

            if (!getScratch().initialized) {
                snap = _snap(options.gridSpacing);
                resize = _resize(options.gridSpacing);
                discreteDrag = _discreteDrag(cy, snap);
                drawGrid = _drawGrid(options, cy, $, debounce);
                guidelines = _guidelines(options, cy, $, debounce);
                parentPadding = _parentPadding(options, cy);

                eventsController = _eventsController(cy, snap, resize, discreteDrag, drawGrid, guidelines, parentPadding, $);

                alignment = _alignment(cytoscape, $);

                eventsController.init(options);
                getScratch().initialized = true;
            } else
                eventsController.syncWithOptions(options);


            return this; // chainability
        } ) ;


    };

    if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
        module.exports = register;
    }

    if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
        define('cytoscape-grid-guide', function(){
            return register;
        });
    }

    if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
        register( cytoscape );
    }

})();

},{"./alignment":25,"./debounce":26,"./discrete_drag":27,"./draw_grid":28,"./events_controller":29,"./guidelines":30,"./parentPadding":32,"./resize":33,"./snap":34}],32:[function(require,module,exports){
module.exports = function (opts, cy) {

    var options = opts;
    var ppClass = "_gridParentPadding";

    function initPadding() {
        var padding = options.parentSpacing < 0 ? options.gridSpacing : options.parentSpacing;
        cy.style()
            .selector('.' + ppClass)
            .style("compound-sizing-wrt-labels", "exclude")
            .style("padding-left", padding)
            .style("padding-right", padding)
            .style("padding-top", padding)
            .style("padding-bottom", padding)
            .update();

    }

    function changeOptions(opts) {
        options = opts;
        padding = options.parentSpacing < 0 ? options.gridSpacing : options.parentSpacing;
        initPadding();
    }

    function setPaddingOfParent(node, enable) {
        if (enable)
            node.addClass(ppClass);
        else
            node.removeClass(ppClass);
    }

    return {
        changeOptions: changeOptions,
        setPaddingOfParent: setPaddingOfParent
    };
};
},{}],33:[function(require,module,exports){
module.exports = function (gridSpacing) {


    var changeOptions = function (opts) {
        gridSpacing = Number(opts.gridSpacing);
    };

    var getScratch = function (node) {
        if (!node.scratch("_gridGuide"))
            node.scratch("_gridGuide", {});

        return node.scratch("_gridGuide");
    };

    function resizeNode(node) {
        var width = node.width();
        var height = node.height();

        var newWidth = Math.round((width - gridSpacing) / (gridSpacing * 2)) * (gridSpacing * 2);
        var newHeight = Math.round((height - gridSpacing) / (gridSpacing * 2)) * (gridSpacing * 2);
        newWidth = newWidth > 0 ? newWidth + gridSpacing : gridSpacing;
        newHeight = newHeight > 0 ? newHeight + gridSpacing : gridSpacing;

        if (width != newWidth || height != newHeight) {
            node.style({
                "width": newWidth,
                "height": newHeight
            });
            getScratch(node).resize = {
                oldWidth: width,
                oldHeight: height
            };
        }
    }

    function recoverNodeDimensions(node) {
        var oldSizes = getScratch(node).resize;
        if (oldSizes) 
            node.style({
                "width": oldSizes.oldWidth,
                "height": oldSizes.oldHeight
            });


    }


    return {
        resizeNode: resizeNode,
        recoverNodeDimensions: recoverNodeDimensions,
        changeOptions: changeOptions
    };

};
},{}],34:[function(require,module,exports){
module.exports = function (gridSpacing) {

    var snap = { };

    snap.changeOptions = function (opts) {
        gridSpacing = opts.gridSpacing;
    };

    var getScratch = function (node) {
        if (!node.scratch("_gridGuide"))
            node.scratch("_gridGuide", {});

        return node.scratch("_gridGuide");
    };


    function getTopMostNodes(nodes) {
        var nodesMap = {};

        for (var i = 0; i < nodes.length; i++) {
            nodesMap[nodes[i].id()] = true;
        }

        var roots = nodes.filter(function (i, ele) {
            var parent = ele.parent()[0];
            while(parent != null){
                if(nodesMap[parent.id()]){
                    return false;
                }
                parent = parent.parent()[0];
            }
            return true;
        });

        return roots;
    }

    snap.snapPos = function (pos) {
        var newPos = {
            x: (Math.floor(pos.x / gridSpacing) + 0.5) * gridSpacing,
            y: (Math.floor(pos.y / gridSpacing) + 0.5) * gridSpacing
        };

        return newPos;
    };

    snap.snapNode = function (node) {

        var pos = node.position();
        var newPos = snap.snapPos(pos);

        node.position(newPos);
    };

    function snapTopDown(nodes) {

        nodes.union(nodes.descendants()).positions(function (i, node) {
            var pos = node.position();
            return snap.snapPos(pos);
        });
        /*
        for (var i = 0; i < nodes.length; i++) {

            if (!nodes[i].isParent())
                snap.snapNode(nodes[i]);

            snapTopDown(nodes.children());
        }*/

    }

    snap.snapNodesTopDown = function (nodes) {
        // getTOpMostNodes -> nodes
        cy.startBatch();
        nodes.union(nodes.descendants()).positions(function (i, node) {
            var pos = node.position();
            return snap.snapPos(pos);
        });
        cy.endBatch();
    };

    snap.onFreeNode = function (e) {
        var nodes;
        if (e.cyTarget.selected())
            nodes = e.cy.$(":selected");
        else
            nodes = e.cyTarget;

        snap.snapNodesTopDown(nodes);

    };


    snap.recoverSnapNode = function (node) {
        var snapScratch = getScratch(node).snap;
        if (snapScratch) {
            node.position(snapScratch.oldPos);
        }
    };

    return snap;





};
},{}]},{},[31]);