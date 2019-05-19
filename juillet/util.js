exports.callScript = function(applicationId, scriptFile, scriptArgs) {

  if (scriptArgs instanceof Array) {
    scriptArgs = scriptArgs.join('","')
  }

  const hostCommand = {
      darwin: {
          command: 'osascript',
          args: [
              '-e',
              `tell application id "${applicationId}" to do script "${scriptFile}" with arguments {"${scriptArgs}"} language javascript`,
          ],
          options: {}
      },
      win32: {
          command: 'powershell',
          args: [
              '-command',
              `"$app = new-object -comobject ${applicationId}; $app.DoScript('${scriptFile}', 1246973031)"`
          ],
          options: { shell: true }
      }
  };

  if (typeof hostCommand[process.platform] == undefined) {
      throw new Error('This platform is not supported');
  }

  return hostCommand[process.platform];
}
