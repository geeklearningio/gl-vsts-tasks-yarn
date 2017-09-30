import fs = require('fs');
import q = require('q');
import * as tl from 'vsts-task-lib/task';
import * as path from 'path';
import * as toolLib from 'vsts-task-tool-lib/tool';
import { downloadFile, getTempPath, detar } from './util';

let yarnVersionsFile = path.join(getTempPath(), "yarnVersions.json");

async function queryLatestMatch(versionSpec: string): Promise<{ version: string, url: string }> {
    await downloadFile("https://geeklearningassets.blob.core.windows.net/yarn/tarballs.json", yarnVersionsFile);
    var yarnVersions = <{ [key: string]: string }>JSON.parse(fs.readFileSync(yarnVersionsFile, { encoding: "utf8" }));

    let version: string = toolLib.evaluateVersions(Object.keys(yarnVersions), versionSpec);

    if (!version) {
        return undefined;
    }

    return { version: version, url: yarnVersions[version] };
}

async function downloadYarn(version: { version: string, url: string }) {
    let cleanVersion = toolLib.cleanVersion(version.version);

    let downloadPath: string = path.join(getTempPath(), `yarn-${cleanVersion}.tar.gz`);
    
    await downloadFile(version.url, downloadPath);
    //await toolLib.downloadTool(version.url);

    var detarLocation = path.join(getTempPath(), "output");

    await detar(downloadPath, detarLocation);

    //let toolRoot = path.join(detarLocation, version.url.substring(version.url.lastIndexOf('/') + 1));

    return await toolLib.cacheDir(detarLocation, 'yarn', cleanVersion);
}

async function getYarn(versionSpec: string, checkLatest: boolean) {
    if (toolLib.isExplicitVersion(versionSpec)) {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    // check cache
    let toolPath: string;
    if (!checkLatest) {
        toolPath = toolLib.findLocalTool('yarn', versionSpec);
    }

    if (!toolPath) {
        let version: { version: string, url: string };
        if (toolLib.isExplicitVersion(versionSpec)) {
            // version to download
            version = await queryLatestMatch(versionSpec);
        } else {
            // query nodejs.org for a matching version
            version = await queryLatestMatch(versionSpec);

            if (!version) {
                throw new Error(`Unable to find Yarn version '${versionSpec}'.`);
            }

            // check cache
            toolPath = toolLib.findLocalTool('yarn', version.version)
        }



        if (!toolPath) {

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

    toolPath = path.join(toolPath, 'dist/bin');

    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //

    toolLib.prependPath(toolPath);
}

async function run() {
    try {
        let versionSpec = tl.getInput('versionSpec', true);
        let checkLatest: boolean = tl.getBoolInput('checkLatest', false);

        await getYarn(versionSpec, checkLatest);
    }
    catch (error) {
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
}

run();