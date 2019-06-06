/**
 * indesign.js
 * 
 * Ivoke Adobe InDesign routines using a custom JSX script.
 */

const util = require('../util.js')
const path = require('path');

// ID mapper to the application by platform
const applicationId = {
  darwin: 'com.adobe.indesign',
  win32: 'InDesign.Application',
}

// JSX file to be called
const outputFilePath = path.resolve(__dirname + '/../', 'jsx', 'indesign.jsx');

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

  const child = spawn(command, args, options);
  let stdout = '';
  let stderr = [];

  // The result is cought in the stdout
  child.stdout.on('data', (data) => {
    stdout += data;
  });

  // Capture the strerr to handle errors in the script
  child.stderr.on('data', (data) => {
    stderr.push(data.toString());
  });

  // Exit happens when the script finish
  child.on('exit', (code) => {
    let result = (code == 0) ? JSON.parse(stdout) : stderr;
    if ('exception' in result) {
      code = 99;
    }
    let output = {
      success: (code == 0),
      action: actionName,
      result: result,
    }

    if (callback) {
      callback(output);
    } else {
      console.log(output);
    }
  });
}

/**
 * Inspect the Indesign file content
 */
exports.inspect = function(fileName, args, callback) {
  let units = args['units'];
  let assets = args['assets'];
  call('inspect', [fileName, units, assets], callback);
}