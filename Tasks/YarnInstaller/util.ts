import * as fs from "fs";
import * as tl from "azure-pipelines-task-lib/task";
import * as path from "path";
import { IncomingMessage } from "http";
import { extract } from "tar";
import { downloadFrom } from "./download";

function saveResponseToFile(
  response: IncomingMessage,
  dest: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    response.on("error", reject);
    file.on("error", reject);
    file.on("finish", () => {
      resolve();
    });

    response.pipe(file);
  });
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  tl.debug(`downloading: ${url}`);

  const response = await downloadFrom(url, (location) =>
    tl.debug(`following redirect to location: ${location}`),
  );

  await saveResponseToFile(response, dest);
}

export function getTempPath(): string {
  const tempNpmrcDir =
    tl.getVariable("Agent.BuildDirectory") ||
    tl.getVariable("Agent.ReleaseDirectory") ||
    process.cwd();
  const tempPath = path.join(tempNpmrcDir, "yarn");
  if (tl.exist(tempPath) === false) {
    tl.mkdirP(tempPath);
  }

  return tempPath;
}

export function detar(source: string, dest: string): Promise<void> {
  return extract({ file: source, cwd: dest });
}
