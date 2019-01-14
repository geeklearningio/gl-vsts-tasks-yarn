import * as path from "path";
import * as fs from "fs-extra";
import * as tl from "vsts-task-lib/task";
import * as tr from "vsts-task-lib/toolrunner";
import * as q from "q";
import * as npmutil from "./packaging/npm/npmutil";
import * as util from "./packaging/util";
import { INpmRegistry, NpmRegistry } from "./packaging/npm/npmregistry";
import { PackagingLocation, getPackagingUris, ProtocolType } from './packaging/locationUtilities';

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
        }

        let packagingLocation: PackagingLocation;
        try {
            packagingLocation = await getPackagingUris(ProtocolType.Npm);
        } catch (error) {
            tl.debug('Unable to get packaging URIs, using default collection URI');
            tl.debug(JSON.stringify(error));
            const collectionUrl = tl.getVariable('System.TeamFoundationCollectionUri');
            packagingLocation = {
                PackagingUris: [collectionUrl],
                DefaultPackagingUri: collectionUrl
            };
        }


        tl.debug(yarnPath);

        let npmrc = npmutil.getTempNpmrcPath();
        let npmRegistries: INpmRegistry[] = await npmutil.getLocalNpmRegistries(projectPath, packagingLocation.PackagingUris);
        let overrideNpmrc = fs.existsSync(projectNpmrc());
        let registryLocation = customRegistry;

        if (overrideNpmrc) {
            fs.copySync(projectNpmrc(), npmrc);
        }

        fs.ensureFileSync(npmrc);

        switch (registryLocation) {
            case RegistryLocation.Feed:
                tl.debug("Using internal feed");
                let feedId = tl.getInput("customFeed", true);
                npmRegistries.push(await NpmRegistry.FromFeedId(packagingLocation.DefaultPackagingUri, feedId));
                break;
            case RegistryLocation.Npmrc:
                tl.debug("Using registries in .npmrc");
                let endpointIds = tl.getDelimitedInput("customEndpoint", ",");
                if (endpointIds && endpointIds.length > 0) {
                    const endpointRegistries = await q.all(endpointIds.map(e => NpmRegistry.FromServiceEndpoint(e, true)));
                    npmRegistries = npmRegistries.concat(endpointRegistries);
                }
                break;
        }

        for (let registry of npmRegistries) {
            if (registryLocation === RegistryLocation.Feed) {
                // Don't clobber existing registry settings when getting registries from .npmrc
                tl.debug("Using registry: " + registry.url);
                npmutil.appendToNpmrc(npmrc, `registry=${registry.url}\n`);
            }
            tl.debug("Adding auth for registry: " + registry.url);
            npmutil.appendToNpmrc(npmrc, `${registry.auth}\n`);
            if (registry.url.indexOf(".visualstudio.com") >= 0) {
                npmutil.appendToNpmrc(npmrc, "always-auth=true\n");
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
