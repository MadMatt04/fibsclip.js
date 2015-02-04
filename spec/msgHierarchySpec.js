describe("fibsclip Message Hierarchy Specs", function () {

    function ar2uinta(array) {
        var uinta = new Uint8Array(array.length);
        array.forEach(function (e, index) {
            uinta[index] = e;
        });

        return uinta;
    }

    it("Clip Message Hierarchy Test", function () {
        var cm = new fibs.ClipMessage('a name', 4, "Hello");
        expect(cm).toBeTruthy();
        expect(cm.name).toBe("a name");
        expect(cm.type).toBe("CLIP");
        expect(Object.getPrototypeOf(Object.getPrototypeOf(cm))).toBe(fibs.Message.prototype);
    });

    it("IAC Message Hierarchy Test", function () {
        var seq = [4, 3, 1];
        var im = new fibs.IacMessage(seq);
        expect(im).toBeTruthy();
        expect(im.name).toBeUndefined();
        expect(im.type).toBe("IAC");
        expect(im.sequence).toBe(seq);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(im))).toBe(fibs.Message.prototype);
    });

    it("toJSON() - Message", function () {
        var m = new fibs.Message("test");
        var json = m.toJSON();
        expect(Object.keys(json).length).toBe(1);
        expect(json.type).toBe("test");
    });

    it("toJSON() - Clip Message", function () {
        var m = new fibs.ClipMessage("CLIP TST MSG", 90, "a b    c");
        var json = m.toJSON();
        expect(Object.keys(json).length).toBe(5);
        expect(json.type).toBe("CLIP");
        expect(json.name).toBe("CLIP TST MSG");
        expect(json.id).toBe(90);
        expect(json.text).toBe("a b    c");
        expect(json.trueClip).toBe(false);
    });

    it("toJSON() - IAC Message", function () {
        var sequence = ar2uinta([255, 252, 1]);
        var m = new fibs.IacMessage(sequence);
        var json = m.toJSON();
        expect(Object.keys(json).length).toBe(2);
        expect(json.type).toBe("IAC");
        expect(json.sequence).toBe(sequence);
    });

    it("Clip Message Tokenize", function () {
        var m = new fibs.ClipMessage("CLIP WELCOME", 1, "1 myself 1041253132  192.168.1.308");
        var tokens = m.tokenize();
        expect(tokens.length).toBe(4);
        expect(tokens[0]).toBe("1");
        expect(tokens[1]).toBe("myself");
        expect(tokens[2]).toBe("1041253132");
        expect(tokens[3]).toBe("192.168.1.308");
    });

    it("Clip Message Ad-Hoc Subclass", function () {
        function CustomClipMessage() {
            fibs.ClipMessage.call(this, "CLIP CUSTOM", -555, "-555/Custom/response");
        }

        CustomClipMessage.prototype = Object.create(fibs.ClipMessage.prototype);
        CustomClipMessage.prototype.tokenize = function () {
            return this.text.split("/");
        };

        var m = new CustomClipMessage();
        expect(m.name).toBe("CLIP CUSTOM");
        expect(m.id).toBe(-555);
        expect(m.text).toBe("-555/Custom/response");
        expect(m.type).toBe("CLIP");
        var tokens = m.tokenize();
        expect(tokens.length).toBe(3);
        expect(tokens[0]).toBe("-555");
        expect(tokens[1]).toBe("Custom");
        expect(tokens[2]).toBe("response");

    });
});