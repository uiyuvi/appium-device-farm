"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicePlugin = void 0;
/* eslint-disable no-prototype-builtins */
require("reflect-metadata");
const index_1 = __importDefault(require("./commands/index"));
const base_plugin_1 = __importDefault(require("@appium/base-plugin"));
const app_1 = require("./app");
const async_lock_1 = __importDefault(require("async-lock"));
const device_service_1 = require("./data-service/device-service");
const pending_sessions_service_1 = require("./data-service/pending-sessions-service");
const device_utils_1 = require("./device-utils");
const device_managers_1 = require("./device-managers");
const typedi_1 = require("typedi");
const logger_1 = __importDefault(require("./logger"));
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const helpers_1 = require("./helpers");
const wd_command_proxy_1 = require("./wd-command-proxy");
const ChromeDriverManager_1 = __importDefault(require("./device-managers/ChromeDriverManager"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const pluginArgs_1 = require("./data-service/pluginArgs");
const Cloud_1 = __importDefault(require("./enums/Cloud"));
const ip_1 = __importDefault(require("ip"));
const lodash_1 = __importDefault(require("lodash"));
const commandsQueueGuard = new async_lock_1.default();
const DEVICE_MANAGER_LOCK_NAME = 'DeviceManager';
class DevicePlugin extends base_plugin_1.default {
    constructor(pluginName, cliArgs) {
        super(pluginName, cliArgs);
    }
    onUnexpectedShutdown(driver, cause) {
        const deviceFilter = {
            session_id: driver.sessionId ? driver.sessionId : undefined,
            udid: driver.caps && driver.caps.udid ? driver.caps.udid : undefined,
        };
        (0, device_service_1.unblockDevice)(deviceFilter);
        logger_1.default.info(`Unblocking device mapped with filter ${JSON.stringify(deviceFilter)} onUnexpectedShutdown from server`);
    }
    static updateServer(expressApp, httpServer, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            let platform;
            let androidDeviceType;
            let iosDeviceType;
            let skipChromeDownload;
            (0, wd_command_proxy_1.registerProxyMiddlware)(expressApp);
            if (cliArgs.plugin && cliArgs.plugin['device-farm']) {
                platform = cliArgs.plugin['device-farm'].platform;
                androidDeviceType = cliArgs.plugin['device-farm'].androidDeviceType || 'both';
                iosDeviceType = cliArgs.plugin['device-farm'].iosDeviceType || 'both';
                skipChromeDownload = cliArgs.plugin['device-farm'].skipChromeDownload;
            }
            expressApp.use('/device-farm', app_1.router);
            if (!platform)
                throw new Error('🔴 🔴 🔴 Specify --plugin-device-farm-platform from CLI as android,iOS or both or use appium server config. Please refer 🔗 https://github.com/appium/appium/blob/master/packages/appium/docs/en/guides/config.md 🔴 🔴 🔴');
            if (skipChromeDownload === undefined)
                cliArgs.plugin['device-farm'].skipChromeDownload = true;
            const chromeDriverManager = cliArgs.plugin['device-farm'].skipChromeDownload === false
                ? yield ChromeDriverManager_1.default.getInstance()
                : undefined;
            iosDeviceType = DevicePlugin.setIncludeSimulatorState(cliArgs, iosDeviceType);
            const deviceTypes = { androidDeviceType, iosDeviceType };
            const deviceManager = new device_managers_1.DeviceFarmManager({
                platform,
                deviceTypes,
                cliArgs,
            });
            typedi_1.Container.set(device_managers_1.DeviceFarmManager, deviceManager);
            if (chromeDriverManager)
                typedi_1.Container.set(ChromeDriverManager_1.default, chromeDriverManager);
            yield (0, pluginArgs_1.addCLIArgs)(cliArgs);
            yield (0, device_utils_1.initlializeStorage)();
            logger_1.default.info(`📣📣📣 Device Farm Plugin will be served at 🔗 http://localhost:${cliArgs.port}/device-farm`);
            if ((0, helpers_1.isHub)(cliArgs)) {
                const hub = cliArgs.plugin['device-farm'].hub;
                yield DevicePlugin.waitForRemoteHubServerToBeRunning(hub);
                yield (0, device_utils_1.checkNodeServerAvailability)();
            }
            const devicesUpdates = yield (0, device_utils_1.updateDeviceList)(cliArgs);
            if ((0, device_utils_1.isIOS)(cliArgs) && (0, device_utils_1.deviceType)(cliArgs, 'simulated')) {
                yield (0, device_service_1.setSimulatorState)(devicesUpdates);
                yield (0, device_utils_1.refreshSimulatorState)(cliArgs);
            }
            yield (0, device_utils_1.cronReleaseBlockedDevices)();
        });
    }
    static setIncludeSimulatorState(cliArgs, deviceTypes) {
        const cloudExists = lodash_1.default.has(cliArgs, 'plugin["device-farm"].cloud');
        if (cloudExists) {
            deviceTypes = 'real';
            logger_1.default.info('ℹ️ Skipping Simulators as per the configuration ℹ️');
        }
        return deviceTypes;
    }
    static waitForRemoteHubServerToBeRunning(host) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, helpers_1.spinWith)(`Waiting for node server ${host} to be up and running\n`, () => __awaiter(this, void 0, void 0, function* () {
                yield (0, axios_1.default)({
                    method: 'get',
                    url: `${host}/device-farm`,
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }), (msg) => {
                throw new Error(`Failed: ${msg}`);
            });
        });
    }
    createSession(next, driver, jwpDesCaps, jwpReqCaps, caps) {
        return __awaiter(this, void 0, void 0, function* () {
            const pendingSessionId = (0, uuid_1.v4)();
            const { alwaysMatch: requiredCaps = {}, // If 'requiredCaps' is undefined, set it to an empty JSON object (#2.1)
            firstMatch: allFirstMatchCaps = [{}], // If 'firstMatch' is undefined set it to a singleton list with one empty object (#3.1)
             } = caps;
            (0, helpers_1.stripAppiumPrefixes)(requiredCaps);
            (0, helpers_1.stripAppiumPrefixes)(allFirstMatchCaps);
            yield (0, pending_sessions_service_1.addNewPendingSession)(Object.assign(Object.assign({}, Object.assign({}, caps.firstMatch[0], caps.alwaysMatch)), { capability_id: pendingSessionId }));
            /**
             *  Wait untill a free device is available for the given capabilities
             */
            const device = yield commandsQueueGuard.acquire(DEVICE_MANAGER_LOCK_NAME, () => __awaiter(this, void 0, void 0, function* () {
                //await refreshDeviceList();
                try {
                    return yield (0, device_utils_1.allocateDeviceForSession)(caps);
                }
                catch (err) {
                    yield (0, pending_sessions_service_1.removePendingSession)(pendingSessionId);
                    throw err;
                }
            }));
            let session;
            if (!device.host.includes(ip_1.default.address())) {
                const remoteUrl = (0, helpers_1.hubUrl)(device);
                let capabilitiesToCreateSession = { capabilities: caps };
                if (device.hasOwnProperty('cloud') && device.cloud.toLowerCase() === Cloud_1.default.LAMBDATEST) {
                    capabilitiesToCreateSession = Object.assign(capabilitiesToCreateSession, {
                        desiredCapabilities: capabilitiesToCreateSession.capabilities.alwaysMatch,
                    });
                }
                logger_1.default.info(`Remote Host URL - ${remoteUrl}`);
                let sessionDetails;
                logger_1.default.info('Creating cloud session');
                const config = {
                    method: 'post',
                    url: remoteUrl,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: capabilitiesToCreateSession,
                };
                yield (0, axios_1.default)(config)
                    .then(function (response) {
                    sessionDetails = response.data;
                })
                    .catch(function (error) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield (0, device_service_1.updatedAllocatedDevice)(device, { busy: false });
                        logger_1.default.info(`📱 Device UDID ${device.udid} unblocked. Reason: Remote Session failed to create`);
                        throw new Error(`${error.response.data.value.message}, Please check the remote appium server log to know the reason for failure`);
                    });
                });
                session = {
                    protocol: 'W3C',
                    value: [sessionDetails.value.sessionId, sessionDetails.value.capabilities, 'W3C'],
                };
            }
            else {
                session = yield next();
            }
            yield (0, pending_sessions_service_1.removePendingSession)(pendingSessionId);
            if (session.error) {
                yield (0, device_service_1.updatedAllocatedDevice)(device, { busy: false });
                logger_1.default.info(`📱 Device UDID ${device.udid} unblocked. Reason: Session failed to create`);
            }
            else {
                const sessionId = session.value[0];
                yield (0, device_service_1.updatedAllocatedDevice)(device, {
                    busy: true,
                    session_id: sessionId,
                    lastCmdExecutedAt: new Date().getTime(),
                    sessionStartTime: new Date().getTime(),
                });
                if (!device.host.includes(ip_1.default.address())) {
                    (0, wd_command_proxy_1.addProxyHandler)(sessionId, device.host);
                }
                logger_1.default.info(`📱 Updating Device ${device.udid} with session ID ${sessionId}`);
            }
            return session;
        });
    }
    deleteSession(next, driver, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, device_service_1.unblockDevice)({ session_id: sessionId });
            logger_1.default.info(`📱 Unblocking the device that is blocked for session ${sessionId}`);
            return yield next();
        });
    }
}
exports.DevicePlugin = DevicePlugin;
Object.assign(DevicePlugin.prototype, index_1.default);
