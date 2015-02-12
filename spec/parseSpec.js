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
        expect(msg.length).toBe(2);
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
        expect(msg[1]).toBe(fibs.NEW_LINE_MESSAGE);
    });

    it("Parse -1 - Login Prompt", function() {
        var line = "login: ";
        var msg = fibs.parse(line);
        expect(msg.length).toBe(1);
        var m = msg[0];
        expect(m.name).toBe("Login Prompt");
        expect(m.type).toBe("CLIP");
        expect(m.id).toBe(-1);
        expect(m.trueClip).toBeFalsy();
        expect(m.text).toBe("login: ");
        var t = m.tokenize();
        expect(t[0]).toBe("login:");
    });

    it("Parse 2 - CLIP Own Info", function () {

        var line = "2 myself 1 1 0 0 0 0 1 1 2396 0 1 0 1 3457.85 0 0 0 0 0 Australia/Melbourne";
        var msg = fibs.parse(line);
        expect(msg.length).toBe(1);
        var m = msg[0];
        expect(m.name).toBe("CLIP Own Info");
        expect(m.type).toBe("CLIP");
        expect(m.id).toBe(2);
        expect(m.trueClip).toBeTruthy();
        expect(m.text).toBe(line);
        expect(m.settings).toBeTruthy();
        expect(m.settings.name).toBe("myself");
        expect(m.settings.allowpip).toBe(true);
        expect(m.settings.autoboard).toBe(true);
        expect(m.settings.autodouble).toBe(false);
        expect(m.settings.automove).toBe(false);
        expect(m.settings.away).toBe(false);
        expect(m.settings.bell).toBe(false);
        expect(m.settings.crawford).toBe(true);
        expect(m.settings.double).toBe(true);
        expect(m.settings.experience).toBe(2396);
        expect(m.settings.greedy).toBe(false);
        expect(m.settings.moreboards).toBe(true);
        expect(m.settings.moves).toBe(false);
        expect(m.settings.notify).toBe(true);
        expect(m.settings.rating).toBe(3457.85);
        expect(m.settings.ratings).toBe(false);
        expect(m.settings.ready).toBe(false);
        expect(m.settings.redoubles).toBe(0);
        expect(m.settings.report).toBe(false);
        expect(m.settings.silent).toBe(false);
        expect(m.settings.timezone).toBe("Australia/Melbourne");

        m.settings.experience = 3000;
        expect(m.settings.experience).toBe(3000);
        m.settings.report = true;
        expect(m.settings.report).toBe(true);

    });
});