describe("fibsclip Parsing Specs", function () {

    function ar2uinta(array) {
        var uinta = new Uint8Array(array.length);
        array.forEach(function (e, index) {
            uinta[index] = e;
        });

        return uinta;
    }

    it("Parse IAC", function () {
        var sequence = ar2uinta([255, 252, 1, 13, 10, 108, 111, 103, 105, 110, 58, 32]);
        fibs.parse(sequence);
    });

    it("Parse 1 - CLIP Welcome", function() {

        var line = "1 myself 1041253132 192.168.1.308\r\n";
        var msg = fibs.parse(line);
        console.log("msg", msg);
        expect(msg.length).toBe(1);
        var m = msg[0];
        expect(m.name).toBe("CLIP Welcome");
        expect(m.type).toBe("CLIP");
        expect(m.id).toBe(1);
        expect(m.trueClip).toBeTruthy();
        expect(m.text).toBe("1 myself 1041253132 192.168.1.308");
        expect(m.loginName).toBe("myself");
        expect(m.lastLogin).toBe(1041253132);
        expect(m.lastLoginDate.getTime()).toBe(new Date(1041253132000).getTime());
        var t = m.tokenize();
        expect(t[0]).toBe("1");
        expect(t[1]).toBe("myself");
        expect(t[2]).toBe("1041253132");
        expect(t[3]).toBe("192.168.1.308");

    });
});