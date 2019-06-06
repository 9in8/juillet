'use strict';

const path = require('path');
const glob = require('fast-glob');
const fs = require('fs-extra');
var hash = require('object-hash');

function applyKeys(data, dict) {
    let s = typeof data === 'string' ? data : JSON.stringify(data);
    Object.keys(dict).forEach(function(key) {
        s = s.replace(new RegExp('\{' + key + '\}', 'gi'), dict[key]);
    })
    return JSON.parse(s);
}

exports.inspect = function(app, settings, callback) {

    // To each engine, we can handle a custom group of params
    const customRoutes = {
        'indesign': '/:units',
        'photoshop': '',
        'illustrator': '',
    }

    /**
     * Generic function to process inspections.
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} type 
     * @param {*} engine 
     */
    const processInspection = function(request, response, type, engine) {

        let md5 = hash.MD5(request.params);
        let uuid = request.params['uuid'];
        delete request.params['uuid'];

        let storage = path.resolve(settings['file']['storage']['folder'], uuid);
        let assetsFolder = path.resolve(storage, 'assets');
        let cacheFolder = path.resolve(assetsFolder, 'cache');
        let cacheFile = path.resolve(cacheFolder, 'inspection.' + md5 + '.json');

        let replaceDict = {
            hostname: request.protocol + '://' + request.headers.host,
        }

        // Function used to process the inspection from engine
        let fromEngine = function() {

            let files = glob.sync(storage + '/**/*.' + type);
            let fileName = files[0];
            if (files.length > 1) {
                for (let i in files) {
                    if (files[i].indexOf('.INSPECTED.') != -1) {
                        fileName = files[i];
                        break;
                    }
                }
            }

            let params = request.params
            params['assets'] = assetsFolder;
            callback(engine, fileName, params, function(result) {
                if (!result.success) {
                    response.status(404).send(result);
                } else {
                    fs.writeJson(cacheFile, result, function(err) {
                        if (err) console.error(err);
                        response.send(applyKeys(result, replaceDict));
                        console.info('Caching inspection from "%s"!', uuid);
                    });
                }
            });        
        }

        // Function used to get the inspection from cache
        let fromCache = function() {
            fs.readJSON(cacheFile, function(err, data) {
                if (err) {
                    console.log(err);
                    fromEngine()
                } else {
                    response.send(applyKeys(data, replaceDict));
                    console.info('Reading inspection for "%s" from cache!', uuid);
                }
            });
        }

        // Checks the assets folder
        fs.ensureDir(cacheFolder)
            .then(function() {
                // Check if the file cache exists
                fs.pathExists(cacheFile)
                    .then(exists => {
                        exists ? fromCache() : fromEngine()
                    })
                    .catch(err => {
                        console.log(err);
                    });
            })
            .catch(err => {
                console.error(err);
            });
    }

    // Enable inspection routes
    settings['engines'].forEach(engine => {
        let route = '/api/v1/' + engine['tool'] + '/inspect/:uuid' + customRoutes[engine['tool']];
        let ext = engine['ext']
        app.get(route, (req, res) => processInspection(req, res, ext, engine['tool']));
        console.info('Adding route "%s" to "%s" inspection', route, engine['tool']);
    });
}