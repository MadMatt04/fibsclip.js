module.exports = function (config) {
    config.set({

        basePath: './',

        files: [
            'lib/fibsclip.js',
            'spec/initSpec.js'
        ],

        autoWatch: true,

        colors: true,

        frameworks: ['jasmine'],

        browsers: ['Chrome'],

        plugins: [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-jasmine'
        ],

        junitReporter: {
            outputFile: 'test_out/unit.xml',
            suite: 'unit'
        },

        captureTimeout: 120000,

        singleRun: false

    });
};
