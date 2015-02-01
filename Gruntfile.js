module.exports = function (grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),


        clean: {
            test: ['test-out']
        },

        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        },

        bump: {
            options: {
                files: ['package.json', 'doc/version.md', 'src/app/thinkehr-f4-namespace.js'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json', 'doc/version.md', 'src/app/thinkehr-f4-namespace.js'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: true,
                pushTo: 'origin'
            }
        }
    });

    // Loading of tasks and registering tasks will be written here
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-bump');


    grunt.registerTask('default', ['dev']);

    grunt.registerTask('dev', ['clean:test', 'karma']);

};
