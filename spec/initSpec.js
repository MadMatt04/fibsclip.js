describe("fibsclip Init Specs", function () {

    it("Init Namespace", function () {
        expect(window.fibs).toBeTruthy();
    });

    it("Clip Message Insantiate Test", function () {
        var cm = new fibs.ClipMessage('a name');
        //cm.name = "Clip Hello Message";
        expect(cm).toBeTruthy();
        expect(cm.name).toBe("a name");
    });
});