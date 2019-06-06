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
const parser = require('./routes/parser.js');

// Package upload
transfer.upload(app, settings, function(fileName) {
  console.log('The "%s" was extracted and is ready to process!', fileName);
});

// Retrieve assets
transfer.assets(app, settings, function(fileName) {
  console.log('Requested asset file from "%s"', fileName);
});

// Inspect a file
parser.inspect(app, settings, function(engine, fileName, args, callback) {
  console.log('The "%s" is inspecting the file "%s"...', engine, fileName);
  let start = Date.now();
  engines[engine].inspect(fileName, args, function(data) {
    let duration = (Date.now() - start) / 1000;
    let length = sizeof(data.result);
    let result = data.success ? 'SUCCESSFULLY' : 'with FAILURE'
    console.log(
      'Inspection of "%s" completed %s: %d bytes, %d seconds', fileName, result, length, duration
    );
    if (!data.success)
      console.error(data.result.constructor == 'Array' ? data.result.join('\n') : data.result);
    callback(data);
  });
});

// Start server
const host = settings['server']['host'];
const port = settings['server']['port'];
app.listen(port, host, function () {
  console.log('Server running and listening at %s:%d...', host, port);
});