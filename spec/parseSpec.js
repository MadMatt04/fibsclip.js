describe("fibsclip Parsing Specs", function () {

    function ar2uinta(array) {
        var uinta = new Uint8Array(array.length);
        array.forEach(function (e, index) {
            uinta[index] = e;
        });

        return uinta;
    }

    it("String to inta", function () {
        var jb = "Johnny Bravo";
        var int8a = fibs.str2int8a(jb);
        var int16a = fibs.str2int16a(jb);
        expect(int8a.length).toBe(12);
        expect(int16a.length).toBe(12);
        var s1 = fibs.int8a2str(int8a);
        var s2 = fibs.int16a2str(int16a);
        expect(s1).toBe(s2);

        jb = "Matija Kejžar";
        int8a = fibs.str2int8a(jb);
        int16a = fibs.str2int16a(jb);
        s1 = fibs.int8a2str(int8a);
        s2 = fibs.int16a2str(int16a);
        expect(int8a.length).toBe(13);
        expect(int16a.length).toBe(13);
        expect(s1).toBe("Matija Kej~ar");
        expect(s2).toBe("Matija Kejžar");
    });

    it("Parse IAC", function () {
        var sequence = ar2uinta([255, 252, 1, 13, 10, 108, 111, 103, 105, 110, 58, 32]);
        var options = {
            buffer: new Uint8Array(0),
            parseIac: true
        };
        var msg = fibs.parse(sequence, new Uint8Array(0), options);
        expect(msg.length).toBe(3);
        expect(msg[0].type).toBe("IAC");
        expect(msg[1].type).toBe("NEWLINE");
        expect(msg[2].type).toBe("CLIP");
        expect(msg[2].id).toBe(-1);
        expect(msg[2].text).toBe("login: ");
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

        var line = "2 myself 1 1 0 0 0 0 1 1 2396 0 1 0 1 3457.85 0 0 0 0 0 Australia/Melbourne\r\n";
        var msg = fibs.parse(line);
        expect(msg.length).toBe(2);
        var m = msg[0];
        expect(m.name).toBe("CLIP Own Info");
        expect(m.type).toBe("CLIP");
        expect(m.id).toBe(2);
        expect(m.trueClip).toBeTruthy();
        expect(m.text).toBe("2 myself 1 1 0 0 0 0 1 1 2396 0 1 0 1 3457.85 0 0 0 0 0 Australia/Melbourne");
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

    it("Parse Mixed", function () {
        var sequence = ar2uinta([255, 252, 1, 108, 111, 103, 105, 110, 255, 252, 1, 108, 111, 103, 105]);
        var options = {
            parseIac: true
        };
        var buffer = new Uint8Array(0);
        var msg = fibs.parse(sequence, buffer, options);
        console.log("MSG", msg, options);
        expect(msg.length).toBe(4);
        expect(msg[0].type).toBe("IAC");
        expect(msg[1].type).toBe("CLIP");
        expect(msg[1].id).toBe(fibs.CLIP_UNRECOGNIZED);
        expect(msg[1].text).toBe("login");
        expect(msg[2].type).toBe("IAC");
        expect(msg[3].type).toBe("BUFFER");
        expect(fibs.int8a2str(msg[3].buffer)).toBe("logi");

        sequence = ar2uinta([100, 100, 101, 119, 13, 10]);
        msg = fibs.parse(sequence, msg[3].buffer, options);
        expect(msg.length).toBe(2);
        expect(msg[0].type).toBe("CLIP");
        expect(msg[0].id).toBe(fibs.CLIP_UNRECOGNIZED);
        expect(msg[0].text).toBe("logiddew");

        buffer = ar2uinta([108, 111, 103, 105, 110]);
        msg = fibs.parse(ar2uinta([255, 252, 1]), buffer, options);
        expect(msg.length).toBe(2);
        expect(msg[0].type).toBe("CLIP");
        expect(msg[0].id).toBe(fibs.CLIP_UNRECOGNIZED);
        expect(msg[0].text).toBe("login");
        expect(msg[1].type).toBe("IAC");
    });

    it("Parse multiline MOTD", function () {
        var motd = "3\r\nThis is line 1.\r\nLine 2.\r\nline3\r\nFourth line.\r\n4\r\n";
        var options = {
            parseIac: false
        };
        var msg = fibs.parse(motd, null, options);
        expect(msg.length).toBe(3);
        expect(msg[0].id).toBe(3);
        expect(msg[0].text).toBe("3\r\nThis is line 1.\r\nLine 2.\r\nline3\r\nFourth line.\r\n");
        expect(msg[1].id).toBe(4);
        expect(msg[1].text).toBe("4");
        expect(msg[2].type).toBe("NEWLINE");
        var lines = msg[0].lines();
        expect(lines.length).toBe(5);
        expect(lines[0]).toBe("3");
        expect(lines[1]).toBe("This is line 1.");
        expect(lines[2]).toBe("Line 2.");
        expect(lines[3]).toBe("line3");
        expect(lines[4]).toBe("Fourth line.");
    });

    it("Parse 7 CLIP Login", function() {
        var l = "7 memaw memaw logs in.\r\n";
        var msg = fibs.parse(l);
        expect(msg.length).toBe(2);
        expect(msg[0].id).toBe(7);
        expect(msg[0].name).toBe("CLIP Login");
        expect(msg[0].userName).toBe("memaw");
        expect(msg[0].message).toBe("memaw logs in.");
        expect(msg[0].text).toBe("7 memaw memaw logs in.");
        expect(msg[1].type).toBe("NEWLINE");
    });

    it("Parse 8 CLIP Login", function() {
        var l = "8 oyvoyvoy oyvoyvoy drops connection.\r\n";
        var msg = fibs.parse(l);
        expect(msg.length).toBe(2);
        expect(msg[0].id).toBe(8);
        expect(msg[0].name).toBe("CLIP Logout");
        expect(msg[0].userName).toBe("oyvoyvoy");
        expect(msg[0].message).toBe("oyvoyvoy drops connection.");
        expect(msg[0].text).toBe("8 oyvoyvoy oyvoyvoy drops connection.");
        expect(msg[1].type).toBe("NEWLINE");
    });


});