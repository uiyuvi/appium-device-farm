"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hookGlobalLog = void 0;
const support_1 = require("@appium/support");
const winston_1 = __importDefault(require("winston"));
// logger for normal plugin.
const log = support_1.logger.getLogger('DatadogLogPlugin');
// global npmlog.
const gLog = log.unwrap();
const npmToWinstonLevels = {
    silly: 'debug',
    verbose: 'debug',
    debug: 'debug',
    info: 'info',
    http: 'info',
    warn: 'warn',
    error: 'error',
};
function hookGlobalLog() {
    const ddLog = winston_1.default.createLogger({
        level: 'info',
        format: winston_1.default.format.json(),
        transports: [
            new winston_1.default.transports.Console({
                level: 'info',
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
            }),
            new winston_1.default.transports.File({ filename: 'somefile.log' }),
        ],
    });
    // Capture logs emitted via npmlog and pass them through winston
    gLog.on('log', (logObj) => {
        console.log('*********', logObj);
        const winstonLevel = npmToWinstonLevels[logObj.level] || 'info';
        ddLog.log(winstonLevel, {
            component: logObj.prefix,
            message: logObj.message,
        });
    });
    log.info('start exporting Appium application logs.');
}
exports.hookGlobalLog = hookGlobalLog;
