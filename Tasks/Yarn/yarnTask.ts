import * as path from "path";
import * as fs from "fs-extra";
import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import * as npmutil from "./packaging/npm/npmutil";
import * as util from "./packaging/util";
import { INpmRegistry, NpmRegistry } from "./packaging/npm/npmregistry";
import {
  PackagingLocation,
  getPackagingUris,
  ProtocolType,
} from "./packaging/locationUtilities";

import { RegistryLocation } from "./constants";

tl.setResourcePath(path.join(__dirname, "task.json"));

const yarnPath = tl.which("yarn");
const args = tl.getInput("arguments");
const projectPath = tl.getPathInput("projectDirectory") || process.cwd();
const customRegistry = tl.getInput("customRegistry");

function projectNpmrc(): string {
  return path.join(projectPath, ".npmrc");
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

async function yarnExec(): Promise<void> {
  try {
    if (!yarnPath) {
      throw new Error("couldn't locate Yarn");
    }

    let packagingLocation: PackagingLocation;
    try {
      packagingLocation = await getPackagingUris(ProtocolType.Npm);
    } catch (error) {
      tl.debug("Unable to get packaging URIs, using default collection URI");
      tl.debug(JSON.stringify(error));
      const collectionUrl = tl.getVariable(
        "System.TeamFoundationCollectionUri",
      );
      packagingLocation = {
        PackagingUris: [collectionUrl],
        DefaultPackagingUri: collectionUrl,
      };
    }

    tl.debug(yarnPath);

    const npmrc = npmutil.getTempNpmrcPath();
    let npmRegistries: INpmRegistry[] = await npmutil.getLocalNpmRegistries(
      projectPath,
      packagingLocation.PackagingUris,
    );

    const registryLocation = customRegistry;
    const overrideNpmrc =
      registryLocation === RegistryLocation.Feed
        ? true
        : !fs.existsSync(projectNpmrc());

    if (!overrideNpmrc) {
      fs.copySync(projectNpmrc(), npmrc);
    }

    fs.ensureFileSync(npmrc);

    switch (registryLocation) {
      case RegistryLocation.Feed:
        tl.debug("Using internal feed");
        const feedId = tl.getInput("customFeed", true);
        npmRegistries.push(
          await NpmRegistry.FromFeedId(
            packagingLocation.DefaultPackagingUri,
            feedId,
            null,
          ),
        );
        break;
      case RegistryLocation.Npmrc:
        tl.debug("Using registries in .npmrc");
        const endpointIds = tl.getDelimitedInput("customEndpoint", ",");
        if (endpointIds && endpointIds.length > 0) {
          const endpointRegistries = await Promise.all(
            endpointIds.map((e) => NpmRegistry.FromServiceEndpoint(e, true)),
          );
          npmRegistries = npmRegistries.concat(endpointRegistries);
        }
        break;
    }

    for (const registry of npmRegistries) {
      if (registry.authOnly === false) {
        tl.debug(`Using registry: ${registry.url}`);
        npmutil.appendToNpmrc(npmrc, `registry=${registry.url}\n`);
        if (registry.auth) {
          npmutil.appendToNpmrc(npmrc, `always-auth=true\n`);
        }
      }

      tl.debug(tl.loc("AddingAuthRegistry", registry.url));
      npmutil.appendToNpmrc(npmrc, `${registry.auth}\n`);
    }

    const yarn = tl.tool("yarn");

    if (tl.getBoolInput("ProductionMode")) {
      yarn.arg("--production");
    }

    yarn.line(args);

    const options: tr.IExecOptions = {
      cwd: projectPath,
      env: process.env,
      silent: false,
      failOnStdErr: false,
      ignoreReturnCode: false,
      outStream: undefined,
      errStream: undefined,
      windowsVerbatimArguments: undefined,
    };

    saveProjectNpmrc(overrideNpmrc);
    fs.copySync(npmrc, projectNpmrc());

    const result = await yarn.exec(options);

    if (overrideNpmrc) {
      tl.rmRF(projectNpmrc());
    }

    restoreProjectNpmrc(overrideNpmrc);

    tl.rmRF(npmrc);

    if (result) {
      tl.setResult(
        tl.TaskResult.Failed,
        `Yarn failed with exit code ${result}`,
      );
    } else {
      tl.setResult(tl.TaskResult.Succeeded, "Yarn executed successfully");
    }
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
