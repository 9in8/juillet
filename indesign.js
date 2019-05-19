/**
 * indesign.js
 * 
 * Ivoke Adobe InDesign routines using a custom JSX script.
 */

const util = require('./util.js')
const path = require('path');

// ID mapper to the application by platform
const applicationId = {
  darwin: 'com.adobe.indesign',
  win32: 'InDesign.Application',
}

// JSX file to be called
const outputFilePath = path.resolve(__dirname, 'jsx', 'indesign.jsx');

/**
 * Calls a indesign JSX passing arguments and handling the callback.
 * 
 * @param {string} actionName The action to call
 * @param {Array} scriptArgs  The arguments to pass thru the call
 * @param {Function} callback The callback to catch results
 */
function call(actionName, scriptArgs, callback) {

  scriptArgs = [actionName].concat(scriptArgs);

  const { spawn } = require('child_process');
  const { command, args, options } = util.callScript(
    applicationId[process.platform], outputFilePath, scriptArgs
  );

  var child = spawn(command, args, options);
  var output = null;

  // The result is cought in the stdout
  child.stdout.on('data', (data) => {
    output = JSON.parse(data);
  });

  // Capture the strerr to handle errors in the script
  child.stderr.on('data', (data) => {
    if (!output) {
      output = [];
    }
    output.push(data.toString());
  });

  // Exit happens when the script finish
  child.on('exit', (code) => {
    result = {
      success: (code == 0),
      action: actionName,
      result: output,
    }

    if (callback) {
      callback(result);
    } else {
      console.log(result);
    }
  });
}

/**
 * Inspect the Indesign file content
 */
exports.inspect = function(fileName, callback) {
  call('inspect', [fileName, 'pt'], callback);
}

/**
 * Exports the InDesing file to a specific format
 */
exports.exportAs = function(fileName, callback) {
  call('exportAs', [fileName], callback);
}
