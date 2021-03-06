/*jshint eqnull:true*/
(function (root) {
    "use strict";

    var GLOBAL_KEY = "fibs";
    var IAC = 255;
    var CLIP_VERSION = "1008";

    var fibs = {};


    function isInteger(o) {
        return o === parseInt(o, 10);
    }

    function isString(o) {
        return Object.prototype.toString.call(o) == '[object String]';
    }

    function isArray(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    }

    function ab2int8a(buf) {
        return new Uint8Array(buf);
    }

    function int8a2str(int8a) {
        return String.fromCharCode.apply(null, int8a);
    }

    function int16a2str(int16a) {
        return String.fromCharCode.apply(null, int16a);
    }


    function str2int16a(str) {
        var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        var bufView = new Uint16Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return bufView;
    }

    function str2int8a(str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i); // This will cast down the character if not an ASCII code
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
                writable: true,
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
    ClipMessage.prototype.lines = function() {
        var a = this.text != null ? this.text.split(/\r\n/) : [];
        if (a.length > 0 && a[a.length - 1] === "") {
            a.splice(a.length - 1, 1);
        }

        return a;
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

    function NewLineMessage(newLine) {
        Message.call(this, "NEWLINE");

        Object.defineProperty(this, "sequence", {
            value: newLine,
            writable: false,
            enumerable: true
        });
    }

    NewLineMessage.prototype = Object.create(Message.prototype);
    var NEW_LINE_MESSAGE = new NewLineMessage("\r\n");
    Object.freeze(NEW_LINE_MESSAGE);

    function BufferMessage(buffer) {
        Message.call(this, "BUFFER");

        Object.defineProperty(this, "buffer", {
            value: buffer,
            writable: false,
            enumerable: true
        });
    }

    BufferMessage.prototype = Object.create(Message.prototype);

    function parse(inputData, buffer, options) {

        var parseIac = !options || options.parseIac !== false;

        var intArray;

        if (inputData instanceof ArrayBuffer) {
            intArray = ab2int8a(inputData);
        } else if (inputData instanceof Uint8Array) {
            intArray = inputData;
        } else if (isString(inputData)) {
            intArray = str2int8a(inputData);
        } else if (inputData instanceof BufferMessage) {
            intArray = ab2int8a(inputData.buffer);
        } else {
            throw new TypeError("Cannot CLIP-parse data:", inputData);
        }

        if (buffer && buffer.length > 0) {
            var concatArray = new Uint8Array(buffer.length + intArray.length);
            concatArray.set(buffer, 0);
            concatArray.set(intArray, buffer.length);
            intArray = concatArray;
        }

        var sequences = [];

        if (parseIac) {
            var skip = 0;
            var lastIacSeq = 0;
            for (var index = 0; index < intArray.length; index++) {
                var b = intArray[index];
                if (skip > 0) {
                    skip--;
                }
                else if (b === IAC) {
                    var nonIac = index - lastIacSeq;
                    if (nonIac > 0) {
                        Array.prototype.push.apply(sequences, regularSequence(intArray.subarray(lastIacSeq, index), null));
                    }

                    lastIacSeq = Math.min(index + 3, intArray.length);
                    skip = lastIacSeq - index - 1;
                    sequences.push(iacSequence(intArray.subarray(index, lastIacSeq)));
                }
            }

            if (lastIacSeq < intArray.length) {
                Array.prototype.push.apply(sequences, regularSequence(intArray.subarray(lastIacSeq, intArray.length), buffer));
            }
        } else {
            Array.prototype.push.apply(sequences, regularSequence(intArray, buffer));
        }

        return sequences;
    }

    function genericTrueClipParser(id, rest, line) {
        return new ClipMessage("CLIP Message", id, line);
    }

    function trueClipParser(id) {
        return trueClipParsers[id] || genericTrueClipParser;
    }

    function fauxClipParse(line) {
        var fwParse = firstWordPtn.exec(line);
        var message;
        if (fwParse) {
            var fw = fwParse[1];
            var parser = fauxClipParsers.byFirstWord[fw];
            if (parser) {
                message = parser.call(null, fw, line);
            }
        }

        if (!message) {
            message = unknownClipMessage(line);
        }

        return message;
    }

    function unknownClipMessage(line) {
        return new ClipMessage("UNRECOGNIZED", fibs.CLIP_UNRECOGNIZED, line);
    }

    function emptyClipMessage(name, id, text, multilineStart, multilineEnd) {
        var m = new ClipMessage(name, id, text);

        Object.defineProperty(m, "multilineStart", {
            value: multilineStart === true,
            writable: false,
            enumerable: true
        });

        Object.defineProperty(m, "multilineEnd", {
            value: multilineEnd === true,
            writable: false,
            enumerable: true
        });

        return m;
    }

    function loginLogoutMessage(name, id, rest, line) {
        var p = /^(\S+)\s+(.+)$/.exec(rest);
        if (p) {
            var m = new ClipMessage(name, id, line);
            Object.defineProperties(m, {
                userName: {
                    value: p[1],
                    writable: false,
                    enumerable: true
                },
                message: {
                    value: p[2],
                    writable: false,
                    enumerable: true
                }
            });

            return m;
        } else {
            return unknownClipMessage(line);
        }
    }


    var trueClipPtn = /^([1-9]|1[0-9])\s*(.*)$/;
    var firstWordPtn = /^\s*(\S+).*$/;
    var trueClipParsers = {
        generic: genericTrueClipParser,
        1: function (id, rest, line) {
            var m = new ClipMessage("CLIP Welcome", id, line);
            var loginData = rest.split(/\s+/);
            var lastLoginTs = parseInt(parseInt(loginData[1]));
            Object.defineProperties(m, {
                loginName: {
                    value: loginData[0],
                    writable: false,
                    enumerable: true
                },
                lastLogin: {
                    value: lastLoginTs,
                    writable: false,
                    enumerable: true
                },
                lastLoginDate: {
                    value: new Date(lastLoginTs * 1000),
                    writable: false,
                    enumerable: true
                },
                lastHost: {
                    value: loginData[2],
                    writable: false,
                    enumerable: true
                }
            });

            return m;
        },
        2: function (id, rest, line) {
            var m = new ClipMessage("CLIP Own Info", id, line);
            var _settings = rest.split(/\s+/);
            if (_settings.length !== 21) {
                return unknownClipMessage(line);
            }
            var settings = {
                name: _settings[0],
                allowpip: _settings[1] === "1",
                autoboard: _settings[2] === "1",
                autodouble: _settings[3] === "1",
                automove: _settings[4] === "1",
                away: _settings[5] === "1",
                bell: _settings[6] === "1",
                crawford: _settings[7] === "1",
                double: _settings[8] === "1",
                experience: parseInt(_settings[9]),
                greedy: _settings[10] === "1",
                moreboards: _settings[11] === "1",
                moves: _settings[12] === "1",
                notify: _settings[13] === "1",
                rating: parseFloat(_settings[14]),
                ratings: _settings[15] === "1",
                ready: _settings[16] === "1",
                redoubles: _settings[17] === "unlimited" ? _settings[17] : parseInt(_settings[17]),
                report: _settings[18] === "1",
                silent: _settings[19] === "1",
                timezone: _settings[20]
            };
            Object.defineProperty(m, "settings", {
                value: settings,
                writable: false,
                enumerable: true
            });

            return m;
        },
        3: function (id, rest, line) {
            return emptyClipMessage("CLIP MOTD", 3, line + "\r\n" , true, false);
        },
        4: function (id, rest, line) {
            return emptyClipMessage("CLIP MOTD End", 4, line, false, true);
        },
        5: function (id, rest, line) {
            var m = new ClipMessage("CLIP Who Info", id, line);
            var _status = rest.split(/\s+/);
            if (_status.length !== 12) {
                return unknownClipMessage(line);
            }
            var status = {
                name: _status[0],
                opponent: _status[1] === "-" ? null : _status[1],
                watching: _status[2] === "-" ? null : _status[2],
                ready: _status[3] === "1",
                away: _status[4] === "1",
                rating: parseFloat(_status[5]),
                experience: parseInt(_status[6]),
                idle: parseInt(_status[7]),
                login: parseInt(_status[8]),
                hostname: _status[9],
                client: _status[10] === "-" ? null : _status[10],
                email: _status[11] === "-" ? null : _status[11]
            };

            Object.defineProperty(status, "loginDate", {
                get: function() {
                    return new Date(this.login * 1000);
                },
                enumerable: true
            });

            Object.defineProperty(m, "status", {
                value: status,
                writable: false,
                enumerable: true
            });

            return m;
        },
        6: function(id, rest, line) {
            return emptyClipMessage("Clip Who Info End", id, line, false, false);
        },
        7: function(id, rest, line) {
            return loginLogoutMessage("CLIP Login", id, rest, line);
        },
        8: function(id, rest, line) {
            return loginLogoutMessage("CLIP Logout", id, rest, line);
        }
    };
    var fauxClipParsers = {
        generic: unknownClipMessage,
        byFirstWord: {
            "login:": function (firstWord, line) {
                if (firstWord === "login:" && line.length > 6 && line.charCodeAt(6) === 32) {
                    return new ClipMessage("Login Prompt", -1, line);
                }

                return null;
            }
        }
    };

    function regularSequence(data, buffer) {
        var msg = [];
        var str = isString(data) ? data : int8a2str(data);
        var doBuffer = buffer != null;
        var bf = buffer;
        var multiMessage = null;

        str.split(/\r\n/).forEach(function (line, index, array) {
            console.log("line:", line, line.length);
            if (doBuffer && index + 1 === array.length && str.length > 1 &&
                str.substring(str.length - 2, str.length) !== "\r\n" && !isNewLineSpecialCase(line)) {
                var buf = new Uint8Array(bf.length + line.length);
                buf.set(bf, 0);
                buf.set(str2int8a(line), bf.length);
                bf = buf;
            } else {
                try {
                    var result = trueClipPtn.exec(line);
                    if (result) {
                        var id = parseInt(result[1]);
                        var parser = trueClipParser(id);
                        var m = parser.call(null, id, result[2], result.input);
                        if (multiMessage && !m.multilineEnd) {
                            multiMessage.text = multiMessage.text + line + "\r\n";
                        } else {
                            msg.push(m);
                        }

                        if (m.multilineStart && !multiMessage) {
                            multiMessage = m;
                        } else if (m.multilineEnd && multiMessage) {
                            multiMessage = null;
                        }
                    } else if (multiMessage) {
                        multiMessage.text = multiMessage.text + line + "\r\n";
                    } else if (line.length > 0) {
                        msg.push(fauxClipParse(line));
                    } else {
                        msg.push(NEW_LINE_MESSAGE);
                    }
                } finally {
                    bf = new Uint8Array(0);
                }
            }
        });

        if (bf && bf.length > 0) {
            msg.push(new BufferMessage(bf));
        }

        return msg;
    }

    function iacSequence(data) {

        var iacMsg = new IacMessage(data);
        Object.freeze(iacMsg);

        return iacMsg;
    }

    function isNewLineSpecialCase(line) {
        return line === "login: ";
    }

    fibs.CLIP_VERSION = CLIP_VERSION;
    fibs.Message = Message;
    fibs.ClipMessage = ClipMessage;
    fibs.IacMessage = IacMessage;
    fibs.parse = parse;
    fibs.trueClipParsers = trueClipParsers;
    fibs.NEW_LINE_MESSAGE = NEW_LINE_MESSAGE;
    fibs.ab2int8a = ab2int8a;
    fibs.int8a2str = int8a2str;
    fibs.int16a2str = int16a2str;
    fibs.str2int16a = str2int16a;
    fibs.str2int8a = str2int8a;

    // Message ids
    fibs.CLIP_LOGIN_PROMPT = -1;
    fibs.CLIP_WELCOME = 1;
    fibs.CLIP_OWN_INFO = 2;
    fibs.CLIP_MOTD = 3;
    fibs.CLIP_MOTD_END = 4;
    fibs.CLIP_WHO_INFO = 5;
    fibs.CLIP_WHO_INFO_END = 6;
    fibs.CLIP_LOGIN = 7;
    fibs.CLIP_LOGOUT = 8;
    fibs.CLIP_UNRECOGNIZED = -99999;


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