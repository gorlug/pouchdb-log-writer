#!/usr/bin/node

import {Observable, of, throwError} from "rxjs";
import {bindNodeCallback} from "rxjs/internal/observable/bindNodeCallback";
import {catchError, concatMap} from "rxjs/operators";
import {PouchDBWrapper, CouchDBConf, CouchDBWrapper, Credentials,
    LogDocument, LogDocumentGenerator, Logger, ValueWithLogger} from "@gorlug/pouchdb";
import {Buffer} from "buffer";
import {XMLHttpRequest} from "xmlhttprequest-ssl";
import {LogFileWriter} from "./LogFileWriter";

const yargs = require("yargs");
const fs = require("fs");

function btoa(input: string) {
    const buffer = Buffer.from(input.toString(), "binary");
    return buffer.toString("base64");
}

export interface LoggerToFileConfig {
    db: {
        host: string,
        port: number,
        dbName: string,
        https?: boolean
    };
    loggingUser: Credentials;
    admin: Credentials;
    logger: {
        path: string
    };
}

export class LoggerToFile {

    private readonly LOG_NAME = "LoggerToFile";
    logWriter: LogFileWriter;
    db: PouchDBWrapper;
    silentLogger: Logger;

    public static run() {
        const argv = yargs.help("h")
            .usage("Usage: $0 <config_path>")
            .demand(1, "you need to supply the path to the config")
            .argv;

        const configFile = argv._[0];
        const loggerToFile: LoggerToFile = new LoggerToFile();
        loggerToFile.initialize(configFile).subscribe(next => {
            // console.log(next);
        }, error => {
            console.log(error);
        });
    }

    initialize(configPath: string): Observable<any> {
        this.silentLogger = Logger.getLoggerTrace();
        this.silentLogger.setSilent(true);
        let config: LoggerToFileConfig;
        let couchDBConf: CouchDBConf;
        return this.doesConfigExist(configPath).pipe(
            concatMap(result => this.readConfigFile(configPath)),
            concatMap(configResult => {
                config = configResult;
                this.logWriter = new LogFileWriter(config.logger.path);
                couchDBConf = this.createCouchDBConf(config);
                return this.createDBIfNotExists(configResult, couchDBConf);
            }),
            concatMap(result => this.createLoggingUserIfNotExists(result, config, couchDBConf)),
            concatMap(result => this.setAuthorizationToLoggingUser(result, config, couchDBConf)),
            concatMap(result => this.loadDB(result, config, couchDBConf)),
            concatMap(result => this.saveCurrentDocuments(result)),
            concatMap(result => this.listenToChanges(result))
        );
    }

    doesConfigExist(path: string) {
        const stat = bindNodeCallback(fs.stat);
        return stat(path).pipe(
            catchError(error => {
                return throwError("config file " + path + " does not exist");
            })
        );
    }

    private readConfigFile(configPath: string): Observable<LoggerToFileConfig> {
        const read = bindNodeCallback(fs.readFile);
        return read(configPath).pipe(
            concatMap(result => {
                const content = result.toString();
                const config = JSON.parse(content);
                return of(config);
            })
        );
    }

    private createDBIfNotExists(config: LoggerToFileConfig, couchDBConf: CouchDBConf) {
        couchDBConf.setCredentials(config.admin);
        const log = Logger.getLoggerTrace();
        log.logMessage(this.LOG_NAME, "createDBIfNotExists", couchDBConf.getDebugInfo());
        return this.ignoreExistsError(CouchDBWrapper.createCouchDBDatabase(couchDBConf, log), log);
    }

    private ignoreExistsError(observable: Observable<ValueWithLogger>, log: Logger) {
        return observable.pipe(
            catchError(error => {
                // ignore db exists error
                if (error.exists) {
                    return of({value: error, log: log});
                }
                return throwError(error);
            })
        );
    }

    private createLoggingUserIfNotExists(result: { value: any; log: Logger },
                                         config: LoggerToFileConfig, couchDBConf: CouchDBConf) {

        couchDBConf.setCredentials(config.admin);
        return this.ignoreExistsError(CouchDBWrapper.createUser(couchDBConf, config.loggingUser, result.log),
            result.log);
    }

    private createCouchDBConf(config: LoggerToFileConfig) {
        const couchdbConf: CouchDBConf = new CouchDBConf();
        couchdbConf.host = config.db.host;
        couchdbConf.port = config.db.port;
        couchdbConf.dbName = config.db.dbName;
        couchdbConf.setBtoaFunction(btoa);
        if (config.db.https === true) {
            couchdbConf.setHttps();
        } else {
            couchdbConf.setHttp();
        }
        couchdbConf.setCreateXHR(() => {
            return new XMLHttpRequest();
        });
        return couchdbConf;
    }

    private setAuthorizationToLoggingUser(result: ValueWithLogger, config: LoggerToFileConfig, couchDBConf: CouchDBConf) {
        couchDBConf.dbName = config.db.dbName;
        couchDBConf.setCredentials(config.admin);
        return CouchDBWrapper.setDBAuthorization(couchDBConf, [config.loggingUser.username], result.log);
    }

    private loadDB(result: ValueWithLogger, config: LoggerToFileConfig, couchDBConf: CouchDBConf) {
        couchDBConf.setCredentials(config.loggingUser);
        couchDBConf.dbName = config.db.dbName;
        couchDBConf.setGenerator(new LogDocumentGenerator());
        return PouchDBWrapper.loadExternalDB(couchDBConf, result.log);
    }

    private saveCurrentDocuments(result: {value: PouchDBWrapper, log: Logger}) {
        this.db = result.value;
        return result.value.getAllDocuments(result.log).pipe(
            concatMap(docsResult => {
                const messages: LogDocument[] = docsResult.value;
                this.writeMessages(messages);
                return docsResult.log.addTo(of(result.value));
            })
        );
    }

    private writeMessages(messages: LogDocument[]) {
        messages.forEach(message => this.writeMessage(message));
    }

    private writeMessage(message: LogDocument) {
        this.logWriter.writeToFile(message.toLogMessage()).pipe(
            concatMap(() => {
                return this.db.deleteDocument(message, this.silentLogger);
            })
        ).subscribe(() => {}, error => {
            console.log("failed to write log message", error);
        });
    }

    private listenToChanges(result: {value: PouchDBWrapper; log: Logger}) {
        result.value.docSaved$.subscribe(saveResult => {
            const message: LogDocument = saveResult.value;
            this.writeMessage(message);
        }, error => {
            console.log(error);
        });
        result.value.listenToChanges(this.silentLogger);
        return of(result.value);
    }

}

