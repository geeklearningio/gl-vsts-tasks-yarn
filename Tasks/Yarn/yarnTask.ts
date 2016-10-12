import path = require('path');
import fs = require('fs-extra');
import tl = require('vsts-task-lib/task');

var yarnPath = "yarn"; //path.join(__dirname, 'node_modules/.bin/yarn')
var args = tl.getInput("Arguments");

async function yarnExec(){
    try {
        var yarn = tl.tool(yarnPath);
        yarn.arg(args);

        var result = await yarn.exec();

        tl.setResult(tl.TaskResult.Succeeded, "Yarn executed successfully");

    } catch (err) {
        console.error(String(err));
        tl.setResult(tl.TaskResult.Failed, String(err));
    }
}

yarnExec();
