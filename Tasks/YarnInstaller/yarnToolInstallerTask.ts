import fs = require("fs-extra");
import q = require("q");
import * as tl from "azure-pipelines-task-lib/task";
import * as path from "path";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { downloadFile, getTempPath, detar } from "./util";

let yarnVersionsFile = path.join(getTempPath(), "yarnVersions.json");

async function queryLatestMatch(versionSpec: string, includePrerelease: boolean): Promise<{ version: string, url: string }> {
    await downloadFile("https://geeklearningassets.blob.core.windows.net/yarn/tarballsV2.json", yarnVersionsFile);
    let yarnVersions = <{ [key: string]: {uri:string, isPrerelease:boolean} }>JSON.parse(fs.readFileSync(yarnVersionsFile, { encoding: "utf8" }));
    let versionsCodes = Object.keys(yarnVersions);
    if (!includePrerelease) {
        versionsCodes = versionsCodes.filter(v => !yarnVersions[v].isPrerelease);
    }

    let version: string = toolLib.evaluateVersions(versionsCodes, versionSpec);

    if (!version) {
        return undefined;
    }

    return { version: version, url: yarnVersions[version].uri };
}

async function downloadYarn(version: { version: string, url: string }) {
    let cleanVersion = toolLib.cleanVersion(version.version);

    let downloadPath: string = path.join(getTempPath(), `yarn-${cleanVersion}.tar.gz`);
    await downloadFile(version.url, downloadPath);

    let detarLocation = path.join(getTempPath(), "yarn-output");
    fs.emptyDirSync(detarLocation);
    await detar(downloadPath, detarLocation);

    return await toolLib.cacheDir(detarLocation, "yarn", cleanVersion);
}

async function getYarn(versionSpec: string, checkLatest: boolean, includePrerelease: boolean) {
    if (toolLib.isExplicitVersion(versionSpec)) {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    // check cache
    let toolPath: string;
    if (!checkLatest) {
        toolPath = toolLib.findLocalTool("yarn", versionSpec);
    }

    if (!toolPath) {
        let version: { version: string, url: string };
        if (toolLib.isExplicitVersion(versionSpec)) {
            // version to download
            version = await queryLatestMatch(versionSpec, true);
        } else {
            // query nodejs.org for a matching version
            version = await queryLatestMatch(versionSpec, includePrerelease);
            tl.debug("Matched version: " + version.version);
            
            if (!version) {
                throw new Error(`Unable to find Yarn version '${versionSpec}'.`);
            }

            // check cache
            toolPath = toolLib.findLocalTool("yarn", version.version);
        }

        if (!toolPath) {
            tl.debug("Downloading tarball: " + version.url);
            // download, extract, cache
            toolPath = await downloadYarn(version);
        }

        toolLib.prependPath(toolPath);
    }

    //
    // a tool installer initimately knows details about the layout of that tool
    // for example, node binary is in the bin folder after the extract on Mac/Linux.
    // layouts could change by version, by platform etc... but that's the tool installers job
    //

    let matches = tl.findMatch(toolPath, [
        "**/bin/yarn.cmd",
    ]);

    if (matches.length) {
        toolPath = path.dirname(matches[0]);
    } else {
        throw new Error("Yarn package layout unexpected.");
    }

    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //

    toolLib.prependPath(toolPath);
}

async function run() {
    try {
        let versionSpec = tl.getInput("versionSpec", true);
        let checkLatest: boolean = tl.getBoolInput("checkLatest", false);
        let includePrerelease: boolean = tl.getBoolInput("includePrerelease", false);

        await getYarn(versionSpec, checkLatest, includePrerelease);
    }
    catch (error) {
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
}

run();