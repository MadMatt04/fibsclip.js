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
});