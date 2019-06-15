import fs = require("fs");
import q = require("q");
import * as tl from "azure-pipelines-task-lib/task";
import * as path from "path";
import { IncomingMessage } from "http";
import { extract } from "tar";
import * as https from "https";

function httpsGet(url: string): PromiseLike<IncomingMessage> {
  const deferal = q.defer<IncomingMessage>();
  https
    .get(url, (response: IncomingMessage) => {
      deferal.resolve(response);
    })
    .on("error", (err: Error) => {
      deferal.reject(err);
    });

  return deferal.promise;
}

function saveResponseToFile(
  response: IncomingMessage,
  dest: string
): PromiseLike<void> {
  const deferal = q.defer<void>();
  const file = fs.createWriteStream(dest);

  response.pipe(file);
  file.on("finish", () => {
    deferal.resolve();
  });
  return deferal.promise;
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  tl.debug(`downloading: ${url}`);
  let response = await httpsGet(url);
  while (
    (response.statusCode >= 301 && response.statusCode <= 303) ||
    response.statusCode == 307
  ) {
    const location = response.headers["location"] as string;
    tl.debug(`following redirect to location: ${location}`);
    response = await httpsGet(location);
  }

  await saveResponseToFile(response, dest);
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

export function detar(source: string, dest: string): PromiseLike<void> {
  return extract({ file: source, cwd: dest });
}
