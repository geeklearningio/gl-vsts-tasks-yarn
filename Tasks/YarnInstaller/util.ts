var https = require('follow-redirects').https;
import fs = require('fs');
import q = require('q');
import * as tl from 'vsts-task-lib/task';
import * as path from 'path';
import { IncomingMessage } from 'http';

export function downloadFile(url: string, dest: string): q.Promise<any> {
    let deferal = q.defer<any>();
    var file = fs.createWriteStream(dest);
    var request = https.get(url, (response: IncomingMessage) => {
        response.pipe(file);
        file.on('finish', () => {
            deferal.resolve();
        });
    }).on('error', (err: any) => {
        deferal.reject(err);
    });

    return deferal.promise;
};

export function getTempPath(): string {
    let tempNpmrcDir
        = tl.getVariable('Agent.BuildDirectory')
        || tl.getVariable('Agent.ReleaseDirectory')
        || process.cwd();
    let tempPath = path.join(tempNpmrcDir, 'npm');
    if (tl.exist(tempPath) === false) {
        tl.mkdirP(tempPath);
    }

    return tempPath;
}
