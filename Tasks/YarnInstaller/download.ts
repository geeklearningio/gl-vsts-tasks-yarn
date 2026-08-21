import * as https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { IncomingMessage } from "http";

function httpsGet(url: string): Promise<IncomingMessage> {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const options: https.RequestOptions = {};

    const proxy = // Azure DevOps transforms all variables to uppercase
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy;

    if (proxy !== null && proxy !== undefined) {
      options.agent = new HttpsProxyAgent(proxy);
    }

    https
      .get(url, options, (response: IncomingMessage) => {
        resolve(response);
      })
      .on("error", (err: Error) => {
        reject(err);
      });
  });
}

export async function downloadFrom(
  url: string,
  logRedirect?: (location: string) => void,
): Promise<IncomingMessage> {
  let response = await httpsGet(url);
  while (
    (response.statusCode >= 301 && response.statusCode <= 303) ||
    response.statusCode == 307
  ) {
    const location = response.headers["location"] as string;
    if (logRedirect) {
      logRedirect(location);
    }
    response = await httpsGet(location);
  }

  return response;
}
