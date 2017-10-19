import * as path from "path";
import * as fs from "fs-extra";
import * as tl from "vsts-task-lib/task";
import * as tr from "vsts-task-lib/toolrunner";
import * as q from "q";
import * as util from "npm-common/util";
import { INpmRegistry, NpmRegistry } from "npm-common/npmregistry";

import { RegistryLocation } from "./constants";

tl.setResourcePath(path.join(__dirname, "task.json"));

let targz = require("yog-tar.gz");

let yarnPath = tl.which("yarn");
let args = tl.getInput("Arguments");
let projectPath = tl.getPathInput("ProjectDirectory");
let customRegistry = tl.getInput("customRegistry");
let customFeed = tl.getInput("customFeed");
let customEndpoint = tl.getInput("customEndpoint");

function projectNpmrc(): string {
    return path.join(projectPath, ".npmrc");
}

function detar(source: string, dest: string): q.Promise<any> {
    let deferral = q.defer<any>();

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

        tl.debug("OverridingProjectNpmrc: " + projectNpmrc());

        util.saveFile(projectNpmrc());

        tl.rmRF(projectNpmrc());
    }

}

function restoreProjectNpmrc(overrideProjectNpmrc: boolean): void {

    if (overrideProjectNpmrc) {
        tl.debug("RestoringProjectNpmrc");

        util.restoreFile(projectNpmrc());
    }
}

async function yarnExec() {
    try {

        if (!yarnPath) {
            throw new Error("couldn't locate Yarn");
            // var yarnDest = path.join(tl.getVariable("AGENT_WORKFOLDER"), 'yarn');
            // await detar(path.join(__dirname, 'yarn-latest.tar.gz'), yarnDest);
            // yarnPath = path.join(yarnDest, 'dist/bin/yarn' + (process.platform === 'win32' ? '.cmd' : ''));
        }

        tl.debug(yarnPath);

        let npmrc = util.getTempNpmrcPath();
        fs.ensureFileSync(npmrc);
        let npmRegistries: INpmRegistry[] = await util.getLocalNpmRegistries(projectPath);
        let overrideNpmrc = fs.existsSync(projectNpmrc());
        let registryLocation = customRegistry;

        switch (registryLocation) {
            case RegistryLocation.Feed:
                tl.debug("Using internal feed");
                let feedId = tl.getInput("customFeed", true);
                npmRegistries.push(await NpmRegistry.FromFeedId(feedId));
                break;
            case RegistryLocation.Npmrc:
                tl.debug("Using registries in .npmrc");
                let endpointIds = tl.getDelimitedInput("customEndpoint", ",");
                if (endpointIds && endpointIds.length > 0) {
                    let endpointRegistries = endpointIds.map(e => NpmRegistry.FromServiceEndpoint(e, true));
                    npmRegistries = npmRegistries.concat(endpointRegistries);
                }
                break;
        }

        for (let registry of npmRegistries) {
            tl.debug("Using registry: " + registry.url);
            util.appendToNpmrc(npmrc, `registry=${registry.url}\n`);
            tl.debug("Adding auth for registry: " + registry.url);
            util.appendToNpmrc(npmrc, `${registry.auth}\n`);
            if (registry.url.indexOf(".visualstudio.com") >= 0) {
                util.appendToNpmrc(npmrc, "always-auth=true\n");
            }
        }

        let yarn = tl.tool("yarn");

        if (tl.getBoolInput("ProductionMode")) {
            yarn.arg("--production");
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
        };

        saveProjectNpmrc(overrideNpmrc);
        fs.copySync(npmrc, projectNpmrc());

        let result = await yarn.exec(options);

        if (overrideNpmrc) {
            tl.rmRF(projectNpmrc());
        }

        restoreProjectNpmrc(overrideNpmrc);

        tl.setResult(tl.TaskResult.Succeeded, "Yarn executed successfully");
        tl.rmRF(npmrc);

    } catch (err) {
        tl.debug(String(err));
        if (err.stack) {
            tl.debug(err.stack);
        }
        tl.setResult(tl.TaskResult.Failed, String(err));
    } finally {
        tl.rmRF(util.getTempPath());
    }
}

yarnExec();
