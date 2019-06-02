let https = require("follow-redirects").https;
import fs = require("fs");
import q = require("q");
import * as tl from "azure-pipelines-task-lib/task";
import * as path from "path";
import { IncomingMessage } from "http";
// import { extract } from "./detar";
import { extract as tarExtract, extract } from "tar";

export function downloadFile(url: string, dest: string): q.Promise<any> {
  let deferal = q.defer<any>();
  let file = fs.createWriteStream(dest);
  let request = https
    .get(url, (response: IncomingMessage) => {
      response.pipe(file);
      file.on("finish", () => {
        deferal.resolve();
      });
    })
    .on("error", (err: any) => {
      deferal.reject(err);
    });

  return deferal.promise;
}

export function getTempPath(): string {
  let tempNpmrcDir =
    tl.getVariable("Agent.BuildDirectory") ||
    tl.getVariable("Agent.ReleaseDirectory") ||
    process.cwd();
  let tempPath = path.join(tempNpmrcDir, "yarn");
  if (tl.exist(tempPath) === false) {
    tl.mkdirP(tempPath);
  }

  return tempPath;
}

export function detar(source: string, dest: string): PromiseLike<any> {
  // let deferral = q.defer<any>();

  return extract({ file: source, cwd: dest });

  // return extract({ file: source, cwd: dest })
  //   .then(() => deferral.resolve())
  //   .catch(() => deferral.reject());
  // extract(source, dest, () => deferral.resolve(), err => deferral.reject(err));

  //return deferral.promise;
}
