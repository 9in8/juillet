'use strict';

const sizeof = require('object-sizeof')

// Acquire the application settings
const params = require('./params.js');
const settings = params.settings();

// Create and set the API server
const express = require('express');
const app = express();
const compression = require('compression');

app.use(compression());

const engines = {
  'indesign':  require('./adobe/indesign.js'),
  // 'photoshop':  require('./adobe/photoshop.js'),
  // 'illustrator':  require('./adobe/illustrator.js'),
}

/*******************************************************************************
 * API routes
 ******************************************************************************/

const transfer = require('./routes/file.js');
transfer.upload(app, settings, function(fileName) {
  console.log('The "%s" was extracted and is ready to process!', fileName);
});

transfer.assets(app, settings, function(fileName) {
  console.log('Requested asset file from "%s"', fileName);
});

const parser = require('./routes/parser.js');
parser.inspect(app, settings, function(engine, fileName, args, callback) {

  console.log('The "%s" is inspecting the file "%s"...', engine, fileName);
  let start = Date.now();

  engines[engine].inspect(fileName, args, function(data) {
    let duration = (Date.now() - start) / 1000;
    let length = sizeof(data.result);
    console.log('Inspection of "%s" completed: %d bytes, %d seconds', fileName, length, duration);
    callback(data);
  });
});

// Start server
const host = settings['server']['host'];
const port = settings['server']['port'];
app.listen(port, host, function () {
  console.log('Server running and listening at %s:%d...', host, port);
});