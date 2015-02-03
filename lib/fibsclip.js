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

    function int8a2str(int8a) {
        return String.fromCharCode.apply(null, int8a);
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

    function ClipMessage(name, id, text, tokens) {

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
            "tokens": {
                value: tokens,
                writable: false,
                enumerable: true
            }
        });

        this.isTrueClip = function () {
            var t = this.id;
            return isInteger(t) && t > 0 && t <= 19;
        };
    }

    ClipMessage.prototype = Object.create(Message.prototype);

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
                        sequences.push(regularSequence(int8a.subarray(lastIacSeq, index)));
                    }

                    lastIacSeq = Math.min(index + 3, int8a.length);
                    skip = lastIacSeq - index - 1;
                    sequences.push(iacSequence(int8a.subarray(index, lastIacSeq)));
                }
            }

            if (lastIacSeq < int8a.length) {
                sequences.push(regularSequence(int8a.subarray(lastIacSeq, int8a.length)));
            }
        } else {
            sequences.push(regularSequence(int8a));
        }

        console.log("sequences", sequences);
        return sequences;

    }

    function regularSequence(data) {
        var str = int8a2str(data);
        console.log("Sequence data R:", str);

        return str;
    }

    function iacSequence(data) {
        console.log("Sequence data IAC:", data);

        var iacMsg = new IacMessage(data);
        Object.freeze(iacMsg);

        return iacMsg;
    }

    fibs.Message = Message;
    fibs.ClipMessage = ClipMessage;
    fibs.IacMessage = IacMessage;
    fibs.parse = parse;



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