import {bindNodeCallback, of} from "rxjs";
import {catchError, concatMap} from "rxjs/operators";
// @ts-ignore
const fs = require("fs");

export class LogFileWriter {

    logFilePath: string;
    logFilePathRollout: string;
    rollAfterBytes: number;
    write = bindNodeCallback(fs.appendFile);
    rename = bindNodeCallback(fs.rename);

    constructor(logFilePath: string, rollAfterBytes = 50 * 1024 * 1024) {
        this.logFilePath = logFilePath;
        this.logFilePathRollout = logFilePath + ".1";
        this.rollAfterBytes = rollAfterBytes;
    }

    writeToFile(jsonMsg: any) {
        return this.checkForRollOut().pipe(
            concatMap(() => this.callWrite(jsonMsg))
        );
    }

    private checkForRollOut() {
        const stat = bindNodeCallback(fs.stat);
        return stat(this.logFilePath).pipe(
            concatMap(stats => this.determineRollout(stats)),
            catchError(error => {
                return of("ignore");
            })
        );
    }

    private callWrite(jsonMsg: any) {
        const msg = JSON.stringify(jsonMsg) + "\n";
        return this.write(this.logFilePath, msg);
    }


    private determineRollout(stats: any) {
        if (stats.size <= this.rollAfterBytes) {
            return of(stats);
        }
        return this.rename(this.logFilePath, this.logFilePathRollout);
    }
}
