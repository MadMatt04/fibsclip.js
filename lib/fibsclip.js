/*jshint eqnull:true*/
(function (root) {
    "use strict";

    var GLOBAL_KEY = "fibs";
    var IAC = 255;

    var fibs = {};

    function isInteger(o) {
        return o === parseInt(o, 10);
    }

    function isString(o) {
        return Object.prototype.toString.call(o) == '[object String]';
    }

    function ab2int8a(buf) {
        return new Uint8Array(buf);
    }

    function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    function int8a2str(int8a) {
        return String.fromCharCode.apply(null, int8a);
    }

    function str2int8a(str) {
        var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return bufView;
    }

    function Message(type) {
        this._type = type;
    }

    Object.defineProperty(Message.prototype, "type", {
        get: function() {
            return this._type;
        },
        enumerable: true
    });

    Message.prototype.toJSON = function () {
        var obj = {};

        Object.keys(this).forEach(function (property) {
            if (property.substr(0, 1) != "_") {
                obj[property] = this[property];
            }
        }, this);

        obj.type = this.type;

        return obj;
    };

    function ClipMessage(name, id, text) {

        Message.call(this, "CLIP");

        Object.defineProperties(this, {
            "name": {
                value: name,
                writable: false,
                enumerable: true
            },
            "id": {
                value: id,
                writable: false,
                enumerable: true
            },
            "text": {
                value: text,
                writable: false,
                enumerable: true
            },
            "trueClip": {
                get: function () {
                    var t = this.id;
                    return isInteger(t) && t > 0 && t <= 19;
                },
                enumerable: true
            }
        });
    }

    ClipMessage.prototype = Object.create(Message.prototype);
    ClipMessage.prototype.tokenize = function () {
        if (!this._tokens) {
            this._tokens = this.text.split(/\s+/);
        }

        return this._tokens;
    };

    function IacMessage(iacArray) {
        Message.call(this, "IAC");

        Object.defineProperty(this, "sequence", {
            value: iacArray,
            writable: false,
            enumerable: true
        });
    }

    IacMessage.prototype = Object.create(Message.prototype);

    function parse(inputData, options) {

        var int8a;
        if (inputData instanceof ArrayBuffer) {
            int8a = ab2int8a(inputData);
        } else if (inputData instanceof Uint8Array) {
            int8a = inputData;
        } else if (isString(inputData)) {
            int8a = str2int8a(inputData);
        } else {
            throw new TypeError("Cannot CLIP-parse data:", inputData);
        }


        var parseIac = !options || options.parseIac !== false;

        var sequences = [];

        if (parseIac) {
            var skip = 0;
            var lastIacSeq = 0;
            for (var index = 0; index < int8a.length; index++) {
                var b = int8a[index];
                if (skip > 0) {
                    skip--;
                }
                else if (b === IAC) {
                    var nonIac = index - lastIacSeq;
                    if (nonIac > 0) {
                        Array.prototype.push.apply(sequences, regularSequence(int8a.subarray(lastIacSeq, index)));
                    }

                    lastIacSeq = Math.min(index + 3, int8a.length);
                    skip = lastIacSeq - index - 1;
                    sequences.push(iacSequence(int8a.subarray(index, lastIacSeq)));
                }
            }

            if (lastIacSeq < int8a.length) {
                Array.prototype.push.apply(sequences, regularSequence(int8a.subarray(lastIacSeq, int8a.length)));
            }
        } else {
            Array.prototype.push.apply(sequences, regularSequence(int8a));
        }

        console.log("sequences", sequences);
        return sequences;

    }

    function genericTrueClipParser(id, rest, line) {
        return new ClipMessage("CLIP Message", id, line);
    }

    function trueClipParser(id) {
        return trueClipParsers[id] || genericTrueClipParser;
    }

    function welcomeClipParser(id, rest, line) {
        var m = new ClipMessage("CLIP Welcome", id, line);
        var loginData = rest.split(/\s+/);
        var lastLoginTs = parseInt(parseInt(loginData[1]));
        Object.defineProperties(m, {
            loginName : {
                value: loginData[0],
                writable: false,
                enumerable: true
            },
            lastLogin : {
                value: lastLoginTs,
                writable: false,
                enumerable: true
            },
            lastLoginDate : {
                value: new Date(lastLoginTs * 1000),
                writable: false,
                enumerable: true
            },
            lastHost : {
                value: loginData[2],
                writable: false,
                enumerable: true
            }
        });

        return m;
    }

    var trueClipPtn = /^([1-9]|1[0-9])\s+(.+)$/;
    var trueClipParsers = {
        "generic": genericTrueClipParser,
        1: welcomeClipParser
    };

    function regularSequence(data) {
        var str = int8a2str(data);
        var msg = [];

        str.split(/\r\n/).forEach(function (line, index, array) {
            var result = trueClipPtn.exec(line);
            if (result) {
                var id = parseInt(result[1]);
                var parser = trueClipParser(id);
                var m = parser.call(null, id, result[2], result.input);
                msg.push(m);
            }
        });

        return msg;
    }

    function iacSequence(data) {

        var iacMsg = new IacMessage(data);
        Object.freeze(iacMsg);

        return iacMsg;
    }

    fibs.Message = Message;
    fibs.ClipMessage = ClipMessage;
    fibs.IacMessage = IacMessage;
    fibs.parse = parse;
    fibs.trueClipParsers = trueClipParsers;


    if (typeof define === "function" && define.amd) {
        define(function () {
            return fibs;
        });
    } else if (typeof module !== "undefined" && typeof require === "function") {
        module.exports = fibs;
    } else {
        (function () {
            var oldGlobal = root[GLOBAL_KEY];
            fibs.noConflict = function () {
                root[GLOBAL_KEY] = oldGlobal;
                return this;
            };
        }());
        root[GLOBAL_KEY] = fibs;
    }
}(this));