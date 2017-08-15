import * as path from 'path';
import * as fs from 'fs-extra';
import * as tl from 'vsts-task-lib/task';
import * as tr from 'vsts-task-lib/toolrunner';
import * as q from 'q';
import * as util from './util';
import { INpmRegistry, NpmRegistry } from './npmregistry';
import { RegistryLocation } from './constants';

var targz = require('yog-tar.gz');

var yarnPath = tl.which("yarn"); //path.join(__dirname, 'node_modules/.bin/yarn')
var args = tl.getInput("Arguments");
var projectPath = tl.getPathInput("ProjectDirectory")
var customRegistry = tl.getInput("customRegistry")
var customFeed = tl.getInput("customFeed")
var customEndpoint = tl.getInput("customEndpoint")

function projectNpmrc(): string {
    return path.join(projectPath, '.npmrc');
}

function projectYarnrc(): string {
    return path.join(projectPath, '.yarnrc');
}

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

function saveProjectNpmrc(overrideProjectNpmrc: boolean): void {

    if (overrideProjectNpmrc) {

        tl.debug('OverridingProjectNpmrc: ' + projectNpmrc());

        util.saveFile(projectNpmrc());
        //util.saveFile(projectYarnrc());

        tl.rmRF(projectNpmrc());
        //tl.rmRF(projectYarnrc());

    }

}

function restoreProjectNpmrc(overrideProjectNpmrc: boolean): void {

    if (overrideProjectNpmrc) {

        tl.debug('RestoringProjectNpmrc');

        util.restoreFile(projectNpmrc());
        //util.restoreFile(projectYarnrc());
    }
}

async function yarnExec() {
    try {

        if (!yarnPath) {
            var yarnDest = path.join(tl.getVariable("AGENT_WORKFOLDER"), 'yarn');
            await detar(path.join(__dirname, 'yarn-latest.tar.gz'), yarnDest);
            yarnPath = path.join(yarnDest, 'dist/bin/yarn' + (process.platform === 'win32' ? '.cmd' : ''));
            tl.debug(yarnDest);
            tl.debug(JSON.stringify(fs.readdirSync(yarnDest)));
        }

        tl.debug(yarnPath);

        let npmrc = util.getTempNpmrcPath();
        let yarnrc = util.getTempYarnrcPath();
        let npmRegistries: INpmRegistry[] = await util.getLocalNpmRegistries(projectPath);
        let overrideNpmrc = false;
        let registryLocation = customRegistry;

        switch (registryLocation) {
            case RegistryLocation.Feed:
                tl.debug("Using internal feed");
                overrideNpmrc = true;
                let feedId = tl.getInput("customFeed", true);
                npmRegistries.push(await NpmRegistry.FromFeedId(feedId));
                break;
            case RegistryLocation.Npmrc:
                tl.debug("Using registries in .npmrc");
                let endpointIds = tl.getDelimitedInput(customEndpoint, ',');
                if (endpointIds && endpointIds.length > 0) {
                    let endpointRegistries = endpointIds.map(e => NpmRegistry.FromServiceEndpoint(e, true));
                    npmRegistries = npmRegistries.concat(endpointRegistries);
                }
                break;
        }
        
        for (let registry of npmRegistries) {
            if (registry.authOnly === false) {
                tl.debug("Using registry: " + registry.url);
                util.appendToNpmrc(npmrc, `registry=${registry.url}\n`);
                //util.appendToYarnrc(yarnrc, `registry=${registry.url}\n`);
            }
            tl.debug("Adding auth for registry: " + registry.url);
            util.appendToNpmrc(npmrc, `${registry.auth}\n`);
            //util.appendToYarnrc(yarnrc, `${registry.auth}\n`);
        }

        var yarn = tl.tool(yarnPath);

        if (tl.getBoolInput('ProductionMode')) {
            yarn.arg('--production');
        }

        yarn.line(args);

        let options: tr.IExecOptions = {
            cwd: projectPath,
            env: <any>process.env,
            silent: false,
            failOnStdErr: false,
            ignoreReturnCode: false,
            outStream: undefined,
            errStream: undefined,
            windowsVerbatimArguments: undefined
        }
        saveProjectNpmrc(overrideNpmrc);

        if (overrideNpmrc && npmrc) {
            tl.debug('using custom npmrc');
            if (fs.existsSync(npmrc)) {
                tl.debug(fs.readFileSync(npmrc, { encoding: "utf8" }));
            } else {
                tl.warning("generated npmrc is empty");
            }
            // tl.debug('using custom yarnrc');
            // if (fs.existsSync(yarnrc)) {
            //     tl.debug(fs.readFileSync(yarnrc, { encoding: "utf8" }));
            // } else {
            //     tl.warning("generated yarnrc is empty");
            // }
            fs.copySync(npmrc, projectNpmrc());
            // fs.copySync(yarnrc, projectYarnrc());
        }

        var result = await yarn.exec(options);

        if (overrideNpmrc && npmrc) {
            tl.rmRF(projectNpmrc());
        }

        restoreProjectNpmrc(overrideNpmrc);

        tl.setResult(tl.TaskResult.Succeeded, "Yarn executed successfully");
        tl.rmRF(npmrc);

    } catch (err) {
        console.error(String(err));
        if(err.stack){
            tl.debug(err.stack);
        }
        tl.setResult(tl.TaskResult.Failed, String(err));
    } finally {
        tl.rmRF(util.getTempPath());
    }
}

yarnExec();
