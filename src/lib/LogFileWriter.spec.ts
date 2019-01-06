import {LogFileWriter} from "./LogFileWriter";
import {bindNodeCallback, Observable, of} from "rxjs";
import * as fs from "fs";
import {catchError, concatMap, tap} from "rxjs/operators";
import {expect, assert} from "chai";

const logFilePath = "/tmp/logFileWriterTest.log";

describe("LogFileWriter tests", () => {

    beforeEach(complete => {
        const deleteCall = bindNodeCallback(fs.unlink);
        deleteCall(logFilePath).pipe(
            catchError(error => {
                return of("ignore");
            })
        ).subscribe({
            complete() {
                complete();
            }
        });
    });

    const test = {
        logFile: function(path: string) {
            return {
                contentShouldBe: function(expectedContent: string, observable: Observable<any>) {
                    return observable.pipe(
                        concatMap(result => {
                            const read = bindNodeCallback(fs.readFile);
                            return read(path);
                        }),
                        tap((contentBuffer: Buffer) => {
                            const content = contentBuffer.toString();
                            expect(content).to.equal(expectedContent);
                        }),
                    );
                },
            };
        },
        logWriter: function(logWriter: LogFileWriter) {
            return {
                writeToFile: function(jsonMsg: any, observable: Observable<any>) {
                    return observable.pipe(
                        concatMap(result => logWriter.writeToFile(jsonMsg))
                    );
                }
            };
        },
        complete: function(observable: Observable<any>, complete: Function) {
            observable.subscribe(result => {
                    console.log(result);
                },
                error => {
                    console.log(error);
                    assert.fail( "error occurred");
                    complete();
                }, () => {
                    complete();
                });
        },
    };

    it("should write out a log message", complete => {
        const logWriter = new LogFileWriter(logFilePath);
        const jsonMsg = {hello: "world"};
        let observable: Observable<any> = logWriter.writeToFile(jsonMsg);
        observable = test.logFile(logFilePath).contentShouldBe(
            JSON.stringify(jsonMsg) + "\n", observable);
        test.complete(observable, complete);
    });

    it("should write out two log message", complete => {
        const logWriter = new LogFileWriter(logFilePath);
        const jsonMsg1 = {hello: "world"};
        const jsonMsg2 = {how: "are you"};
        const expectedContent =
            JSON.stringify(jsonMsg1) + "\n" +
            JSON.stringify(jsonMsg2) + "\n";
        let observable: Observable<any> = test.logWriter(logWriter).writeToFile(jsonMsg1, of(""));
        observable = test.logWriter(logWriter).writeToFile(jsonMsg2, observable);
        observable = test.logFile(logFilePath).contentShouldBe(expectedContent, observable);
        test.complete(observable, complete);
    });

    it("should roll out the log file after 30 bytes", complete => {
        const logWriter = new LogFileWriter(logFilePath, 30);
        const jsonMsg1 = {hello: "world"};
        const jsonMsg2 = {how: "are you"};
        const jsonMsg3 = {good: "and you"};
        const expectedContent =
            JSON.stringify(jsonMsg1) + "\n" +
            JSON.stringify(jsonMsg2) + "\n";
        let observable: Observable<any> = test.logWriter(logWriter).writeToFile(jsonMsg1, of(""));
        observable = test.logWriter(logWriter).writeToFile(jsonMsg2, observable);
        observable = test.logWriter(logWriter).writeToFile(jsonMsg3, observable);
        const rolledOutLogPath = logFilePath + ".1";
        observable = test.logFile(rolledOutLogPath).contentShouldBe(expectedContent, observable);
        observable = test.logFile(logFilePath).contentShouldBe(JSON.stringify(jsonMsg3) + "\n", observable);
        test.complete(observable, complete);
    });

    it("should delete the first rollout after the second rollout", complete => {
        const logWriter = new LogFileWriter(logFilePath, 10);
        const jsonMsg1 = {hello: "world"};
        const jsonMsg2 = {how: "are you"};
        const jsonMsg3 = {good: "and you"};
        let observable: Observable<any> = test.logWriter(logWriter).writeToFile(jsonMsg1, of(""));
        observable = test.logWriter(logWriter).writeToFile(jsonMsg2, observable);
        observable = test.logWriter(logWriter).writeToFile(jsonMsg3, observable);
        const rolledOutLogPath = logFilePath + ".1";
        observable = test.logFile(rolledOutLogPath).contentShouldBe(JSON.stringify(jsonMsg2) + "\n", observable);
        observable = test.logFile(logFilePath).contentShouldBe(JSON.stringify(jsonMsg3) + "\n", observable);
        test.complete(observable, complete);
    });
});
