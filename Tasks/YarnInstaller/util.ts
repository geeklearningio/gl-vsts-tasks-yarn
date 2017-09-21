import http = require('http');
import fs = require('fs');
import q = require('q');
import * as tl from 'vsts-task-lib/task';
import * as path from 'path';

export function downloadFile(url: string, dest: string): q.Promise<any> {
    let deferal = q.defer<any>();
    var file = fs.createWriteStream(dest);
    var request = http.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            deferal.resolve();
        });
    }).on('error', (err) => {
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
