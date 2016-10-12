import path = require('path');
import fs = require('fs-extra');
import tl = require('vsts-task-lib/task');
import q = require('q');

var targz = require('yog-tar.gz');

var yarnPath = tl.which("yarn"); //path.join(__dirname, 'node_modules/.bin/yarn')
var args = tl.getInput("Arguments");
var projectPath = tl.getPathInput("ProjectDirectory")

function detar(source: string, dest: string): q.Promise<any> {
    var deferral = q.defer<any>();

    new targz().extract(source, dest, (err: any) => {
        if (err) {
            deferral.reject(err);
        } else {
            deferral.resolve();
        }
    });

    return deferral.promise;
}

async function yarnExec() {
    try {

        if (!yarnPath) {
            var yarnDest = path.join(tl.getVariable("AGENT_WORKFOLDER"), 'yarn');
            await detar(path.join(__dirname, 'yarn-v0.15.0.tar.gz'), yarnDest);
            yarnPath = path.join(yarnDest, 'dist/bin/yarn');
            tl.debug(yarnDest);
            tl.debug(JSON.stringify(fs.readdirSync(yarnDest)));
        }
        
        tl.debug(yarnPath);

        var yarn = tl.tool(yarnPath);
        
        yarn.arg(args);

        var result = await yarn.exec({
            cwd: projectPath,
            env: <any>process.env,
            silent: false,
            failOnStdErr: undefined,
            ignoreReturnCode: undefined,
            outStream: undefined,
            errStream: undefined
        });

        tl.setResult(tl.TaskResult.Succeeded, "Yarn executed successfully");

    } catch (err) {
        console.error(String(err));
        tl.setResult(tl.TaskResult.Failed, String(err));
    }
}

yarnExec();
