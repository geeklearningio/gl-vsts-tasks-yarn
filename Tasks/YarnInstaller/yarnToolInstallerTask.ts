import * as fs from "fs-extra";
import * as tl from "azure-pipelines-task-lib/task";
import * as path from "path";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { downloadFile, getTempPath, detar } from "./util";

interface YarnRelease {
  uri: string;
  isPrerelease: boolean;
}

// Yarn 1.x (Classic) is end-of-life, so the set of releases is final and the
// version index ships with the task rather than being fetched at run time.
const yarnVersionsFile = path.join(__dirname, "tarballsV2.json");

function readYarnVersions(): { [key: string]: YarnRelease } {
  return JSON.parse(
    fs.readFileSync(yarnVersionsFile, { encoding: "utf8" }),
  ) as {
    [key: string]: YarnRelease;
  };
}

function queryLatestMatch(
  versionSpec: string,
  includePrerelease: boolean,
): { version: string; url: string } {
  const yarnVersions = readYarnVersions();
  let versionsCodes = Object.keys(yarnVersions);
  if (!includePrerelease) {
    versionsCodes = versionsCodes.filter((v) => !yarnVersions[v].isPrerelease);
  }

  const version: string = toolLib.evaluateVersions(versionsCodes, versionSpec);

  if (!version) {
    return undefined;
  }

  return { version: version, url: yarnVersions[version].uri };
}

async function downloadYarn(version: {
  version: string;
  url: string;
}): Promise<string> {
  const cleanVersion = toolLib.cleanVersion(version.version);

  const downloadPath: string = path.join(
    getTempPath(),
    `yarn-${cleanVersion}.tar.gz`,
  );
  await downloadFile(version.url, downloadPath);

  const detarLocation = path.join(getTempPath(), "yarn-output");
  fs.emptyDirSync(detarLocation);
  await detar(downloadPath, detarLocation);

  return await toolLib.cacheDir(detarLocation, "yarn", cleanVersion);
}

async function getYarn(
  versionSpec: string,
  checkLatest: boolean,
  includePrerelease: boolean,
): Promise<void> {
  if (toolLib.isExplicitVersion(versionSpec)) {
    checkLatest = false; // check latest doesn't make sense when explicit version
  }

  // check cache
  let toolPath: string;
  if (!checkLatest) {
    toolPath = toolLib.findLocalTool("yarn", versionSpec);
  }

  if (!toolPath) {
    let version: { version: string; url: string };
    if (toolLib.isExplicitVersion(versionSpec)) {
      // version to download
      version = queryLatestMatch(versionSpec, true);
    } else {
      // find a matching version in the bundled index
      version = queryLatestMatch(versionSpec, includePrerelease);
    }

    if (!version) {
      throw new Error(`Unable to find Yarn version '${versionSpec}'.`);
    }

    tl.debug("Matched version: " + version.version);

    // check cache
    toolPath = toolLib.findLocalTool("yarn", version.version);

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

  const matches = tl.findMatch(toolPath, ["**/bin/yarn.cmd"]);

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

async function run(): Promise<void> {
  try {
    const versionSpec = tl.getInput("versionSpec", true);
    const checkLatest: boolean = tl.getBoolInput("checkLatest", false);
    const includePrerelease: boolean = tl.getBoolInput(
      "includePrerelease",
      false,
    );

    await getYarn(versionSpec, checkLatest, includePrerelease);
  } catch (error) {
    tl.setResult(tl.TaskResult.Failed, error.message);
  }
}

run();
