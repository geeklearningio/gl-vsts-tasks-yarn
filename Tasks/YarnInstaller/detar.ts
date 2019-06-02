const fstream: any = require("fstream");
import { createGunzip } from "zlib";
import { extract as tarExtract } from "tar";

export const extract = (
  source: string,
  destination: string,
  callback: () => void | undefined = undefined,
  errback: (err: Error) => void | undefined = undefined
) => {
  if (!errback) {
    errback = err => console.error("Error while reading", err);
  }
  process.nextTick(() => {
    const stream = fstream.Reader({
      path: source,
      type: "File"
    });
    stream.on("error", errback);
    const gzstream = stream.pipe(createGunzip());
    gzstream.on("error", errback);
    const tstream = gzstream.pipe(tarExtract({ path: destination }));
    tstream.on("error", errback);
    tstream.on("end", () => callback && callback());
  });
};
