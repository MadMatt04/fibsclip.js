describe("fibsclip Message Hierarchy Specs", function () {

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
});