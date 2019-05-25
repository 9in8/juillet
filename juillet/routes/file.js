'use strict';

const fs = require('fs');
const multer = require('multer');
const path = require('path');

exports.upload = function(app, settings, callback) {

    const uuidv4 = require('uuid/v4');
    const glob = require('fast-glob');

    // Upload settings
    const upload = multer({ 
        dest: settings['file']['upload']['tempFolder'],
      })

    // Compressed files extractors
    const unzip = require('unzip');
    const unrar = require('node-unrar-js');            
    const extractor = {
        '.zip': (fileName, targetDir) => fs.createReadStream(fileName).pipe(unzip.Extract({path: targetDir})),
        '.rar': (fileName, targetDir) => unrar.createExtractorFromFile(fileName, targetDir).extractAll(),
    }

    /**
     * Generic function to process upload.
     * 
     * @param {*} req API request
     * @param {*} res API response
     * @param {string} type Route type
     */
    const process_upload = function(req, res, type) {
        let file = req.file;
        if (!file) {
            return res.status(400).send({message: 'No files uploaded!'});
        }
    
        // Check file type
        let ext = path.extname(file.originalname);
        if ((settings['file']['upload']['allowedExtensions']).indexOf(ext) == -1) {
            return res.status(400).send({message: 'Invalid file type!'});
        }
  
        // Check file size
        if (file.size > (settings['file']['upload']['maxSize']) * 1024 * 1024) {
            return res.status(400).send({message: 'The file is too big!'});
        }
  
        let uuid = uuidv4();

        // Uncompress uploaded file
        let storage = settings['file']['storage']['folder'] + '/' + uuid
        try {
            extractor[ext](file.path, storage);
        } catch (e) {
            console.exception(e);
            return res.status(400).send({message: 'Decompress error!'});
        } finally {
            // Remove after use it
            fs.unlinkSync(file.path);
            console.debug('Cleaning package %s', file.path);
        }

        // Look for right file type
        let found = glob.sync(storage + '/**/*.' + type);
        if (found.length != 0) {
            require('fs-extra').remove(storage);
            console.warn('The package "%s" does not include a "%s" file or more than one were found! Removing it!', file.originalname, type);
            return res.status(400).send({message: 'Cannot find a valid .' + type + ' file inside the uploaded package!'});
        }

        res.send({id: uuid});        
        callback(uuid, type);
    }

    // Enable upload routes
    settings['engines'].forEach(engine => {
        let route = '/api/v1/' + engine['tool'] + '/upload';
        let ext = engine['ext']
        app.post(route, upload.single(ext + '_file'), (req, res) => process_upload(req, res, ext));
        console.info('Adding route "%s" to "%s" upload (only ".%s" files)', route, engine['tool'], ext);
    });
}

exports.assets = function(app, settings, callback) {
    app.get('/:uuid/assets/:type/:file', (req, res) => {
        let uuid = req.params['uuid'];
        let type = req.params['type'];
        let file = req.params['file'];

        if ([uuid, type, file].indexOf('..') != -1) {
            return res.status(404).send({message: 'Wrong file reference!'});
        }

        let filePath = path.resolve(settings['file']['storage']['folder'], uuid, 'assets', type, file);
        res.sendFile(filePath);
        callback(filePath);
    });
}