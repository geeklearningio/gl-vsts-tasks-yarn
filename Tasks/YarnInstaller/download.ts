import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import q = require("q");
import { IncomingMessage } from "http";

function httpsGet(url: string): PromiseLike<IncomingMessage> {
  const deferal = q.defer<IncomingMessage>();

  const options: https.RequestOptions = {};

  var proxy = process.env.https_proxy;

  if (proxy != null) {
    options.agent = new HttpsProxyAgent(proxy);
  }

  https
    .get(url, options, (response: IncomingMessage) => {
      deferal.resolve(response);
    })
    .on("error", (err: Error) => {
      deferal.reject(err);
    });

  return deferal.promise;
}

export async function downloadFrom(
  url: string,
  logRedirect?: (location: string) => void
): Promise<IncomingMessage> {
  let response = await httpsGet(url);
  while (
    (response.statusCode >= 301 && response.statusCode <= 303) ||
    response.statusCode == 307
  ) {
    const location = response.headers["location"] as string;
    logRedirect && logRedirect(location);
    response = await httpsGet(location);
  }

  return response;
}
