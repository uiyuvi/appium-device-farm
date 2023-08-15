"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.CLIArgs = exports.PendingSessionsModel = exports.DeviceModel = void 0;
const lokijs_1 = __importDefault(require("lokijs"));
const db = new lokijs_1.default('db.json');
exports.db = db;
const DeviceModel = db.addCollection('devices');
exports.DeviceModel = DeviceModel;
const PendingSessionsModel = db.addCollection('pending-sessions');
exports.PendingSessionsModel = PendingSessionsModel;
const CLIArgs = db.addCollection('cliArgs');
exports.CLIArgs = CLIArgs;
