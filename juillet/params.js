'use strict';
const minimist = require('minimist');

/**
 * Application argument settings.
 */
exports.settings = function() {

    // Options to run the application
    let args = minimist(process.argv.slice(2), {  
        alias: {
            h: 'help',
            v: 'version',
            s: 'settings',
        }
    });
    
    // Basic arguments and helper
    if ('help' in args) {
        const pjson = require('./package.json');
        console.log("Juillet Server - V." + pjson.version);
        console.log(pjson.description + "\n");
        console.log("  -h, --help    \tPrint this help");
        console.log("  -v, --version \tPrint the application version");
        console.log("  -s, --settings\tPath to the settings file");
        return process.exit(1);
    } else if ('version' in args) {
        // Print only the application version
        const pjson = require('./package.json');
        console.log(pjson.version);
        return process.exit(2);
    } else if ('settings' in args) {
        // Read and return the settings
        return require(args['settings']);
    }
    return process.exit(3);
}
  