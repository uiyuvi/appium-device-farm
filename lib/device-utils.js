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
exports.cronReleaseBlockedDevices = exports.releaseBlockedDevices = exports.checkNodeServerAvailability = exports.refreshSimulatorState = exports.updateDeviceList = exports.getBusyDevicesCount = exports.getDeviceFiltersFromCapability = exports.setUtilizationTime = exports.getUtilizationTime = exports.initlializeStorage = exports.updateCapabilityForDevice = exports.allocateDeviceForSession = exports.isDeviceConfigPathAbsolute = exports.isAndroidAndIOS = exports.isIOS = exports.deviceType = exports.isAndroid = exports.getDeviceTypeFromApp = void 0;
/* eslint-disable no-prototype-builtins */
const helpers_1 = require("./helpers");
const CapabilityManager_1 = require("./CapabilityManager");
const async_wait_until_1 = __importDefault(require("async-wait-until"));
const typedi_1 = require("typedi");
const device_managers_1 = require("./device-managers");
const device_service_1 = require("./data-service/device-service");
const logger_1 = __importDefault(require("./logger"));
const Platform_1 = __importDefault(require("./enums/Platform"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const CapabilityManager_2 = __importDefault(require("./device-managers/cloud/CapabilityManager"));
const IOSDeviceManager_1 = __importDefault(require("./device-managers/IOSDeviceManager"));
const NodeDevices_1 = __importDefault(require("./device-managers/NodeDevices"));
const ip_1 = __importDefault(require("ip"));
const pluginArgs_1 = require("./data-service/pluginArgs");
const plugin_1 = require("./plugin");
const DEVICE_AVAILABILITY_TIMEOUT = 180000;
const DEVICE_AVAILABILITY_QUERY_INTERVAL = 10000;
const customCapability = {
    deviceTimeOut: 'appium:deviceAvailabilityTimeout',
    deviceQueryInteval: 'appium:deviceRetryInterval',
    iphoneOnly: 'appium:iPhoneOnly',
    ipadOnly: 'appium:iPadOnly',
    udids: 'appium:udids',
    minSDK: 'appium:minSDK',
    maxSDK: 'appium:maxSDK',
};
let timer;
let cronTimerToReleaseBlockedDevices;
const getDeviceTypeFromApp = (app) => {
    /* If the test is targeting safarim, then app capability will be empty */
    if (!app) {
        return;
    }
    return app.endsWith('app') || app.endsWith('zip') ? 'simulator' : 'real';
};
exports.getDeviceTypeFromApp = getDeviceTypeFromApp;
function isAndroid(cliArgs) {
    return cliArgs.Platform.toLowerCase() === Platform_1.default.ANDROID;
}
exports.isAndroid = isAndroid;
function deviceType(cliArgs, device) {
    const iosDeviceType = cliArgs.plugin['device-farm'].iosDeviceType;
    if (lodash_1.default.has(cliArgs, 'plugin["device-farm"].iosDeviceType')) {
        return iosDeviceType === device || iosDeviceType === 'both';
    }
}
exports.deviceType = deviceType;
function isIOS(cliArgs) {
    return (0, helpers_1.isMac)() && cliArgs.plugin['device-farm'].platform.toLowerCase() === Platform_1.default.IOS;
}
exports.isIOS = isIOS;
function isAndroidAndIOS(cliArgs) {
    return (0, helpers_1.isMac)() && cliArgs.Platform.toLowerCase() === Platform_1.default.BOTH;
}
exports.isAndroidAndIOS = isAndroidAndIOS;
function isDeviceConfigPathAbsolute(path) {
    if ((0, helpers_1.checkIfPathIsAbsolute)(path)) {
        return true;
    }
    else {
        throw new Error(`Device Config Path ${path} should be absolute`);
    }
}
exports.isDeviceConfigPathAbsolute = isDeviceConfigPathAbsolute;
/**
 * For given capability, wait untill a free device is available from the database
 * and update the capability json with required device informations
 * @param capability
 * @returns
 */
function allocateDeviceForSession(capability) {
    return __awaiter(this, void 0, void 0, function* () {
        const firstMatch = Object.assign({}, capability.firstMatch[0], capability.alwaysMatch);
        console.log(firstMatch);
        const filters = getDeviceFiltersFromCapability(firstMatch);
        logger_1.default.info(JSON.stringify(filters));
        const timeout = firstMatch[customCapability.deviceTimeOut] || DEVICE_AVAILABILITY_TIMEOUT;
        const newCommandTimeout = firstMatch['appium:newCommandTimeout'] || undefined;
        const intervalBetweenAttempts = firstMatch[customCapability.deviceQueryInteval] || DEVICE_AVAILABILITY_QUERY_INTERVAL;
        try {
            yield (0, async_wait_until_1.default)(() => __awaiter(this, void 0, void 0, function* () {
                const maxSessions = getDeviceManager().getMaxSessionCount();
                if (maxSessions !== undefined && (yield getBusyDevicesCount()) === maxSessions) {
                    logger_1.default.info(`Waiting for session available, already at max session count of: ${maxSessions}`);
                    return false;
                }
                else
                    logger_1.default.info('Waiting for free device');
                return (yield (0, device_service_1.getDevice)(filters)) != undefined;
            }), { timeout, intervalBetweenAttempts });
        }
        catch (err) {
            throw new Error(`No device found for filters: ${JSON.stringify(filters)}`);
        }
        const device = (0, device_service_1.getDevice)(filters);
        logger_1.default.info(`📱 Device found: ${JSON.stringify(device)}`);
        (0, device_service_1.updateDevice)(device, { busy: true, newCommandTimeout: newCommandTimeout });
        logger_1.default.info(`📱 Blocking device ${device.udid} for new session`);
        yield updateCapabilityForDevice(capability, device);
        return device;
    });
}
exports.allocateDeviceForSession = allocateDeviceForSession;
function updateCapabilityForDevice(capability, device) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!device.hasOwnProperty('cloud')) {
            if (device.platform.toLowerCase() == Platform_1.default.ANDROID) {
                yield (0, CapabilityManager_1.androidCapabilities)(capability, device);
            }
            else {
                yield (0, CapabilityManager_1.iOSCapabilities)(capability, device);
            }
        }
        else {
            logger_1.default.info('Updating cloud Capability for Device');
            return new CapabilityManager_2.default(capability, device).getCapability();
        }
    });
}
exports.updateCapabilityForDevice = updateCapabilityForDevice;
/**
 * Sets up node-persist storage in local cache
 * @returns storage
 */
function initlializeStorage() {
    return __awaiter(this, void 0, void 0, function* () {
        const basePath = (0, helpers_1.cachePath)('storage');
        yield fs_1.default.promises.mkdir(basePath, { recursive: true });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const storage = require('node-persist');
        const localStorage = storage.create({ dir: basePath });
        yield localStorage.init();
        typedi_1.Container.set('LocalStorage', localStorage);
    });
}
exports.initlializeStorage = initlializeStorage;
function getStorage() {
    return typedi_1.Container.get('LocalStorage');
}
/**
 * Gets utlization time for a device from storage
 * Returns 0 if the device has not been used an thus utilization time has not been saved
 * @param udid
 * @returns number
 */
function getUtilizationTime(udid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const value = yield getStorage().getItem(udid);
            if (value !== undefined && value && !isNaN(value)) {
                return value;
            }
            else {
                //logger.error(`Custom Exception: Utilizaiton time in cache is corrupted. Value = '${value}'.`);
            }
        }
        catch (err) {
            logger_1.default.error(`Failed to fetch Utilization Time \n ${err}`);
        }
        return 0;
    });
}
exports.getUtilizationTime = getUtilizationTime;
/**
 * Sets utilization time for a device to storage
 * @param udid
 * @param utilizationTime
 */
function setUtilizationTime(udid, utilizationTime) {
    return __awaiter(this, void 0, void 0, function* () {
        yield getStorage().setItem(udid, utilizationTime);
    });
}
exports.setUtilizationTime = setUtilizationTime;
/**
 * Method to get the device filters from the custom session capability
 * This filter will be used as in the query to find the free device from the databse
 * @param capability
 * @returns IDeviceFilterOptions
 */
function getDeviceFiltersFromCapability(capability) {
    var _a;
    const platform = capability['platformName'].toLowerCase();
    const udids = capability[customCapability.udids]
        ? capability[customCapability.udids].split(',').map(lodash_1.default.trim)
        : (_a = process.env.UDIDS) === null || _a === void 0 ? void 0 : _a.split(',').map(lodash_1.default.trim);
    /* Based on the app file extension, we will decide whether to run the
     * test on real device or simulator.
     *
     * Applicaple only for ios.
     */
    const deviceType = platform == Platform_1.default.IOS && (0, helpers_1.isMac)()
        ? (0, exports.getDeviceTypeFromApp)(capability['appium:app'])
        : undefined;
    if ((deviceType === null || deviceType === void 0 ? void 0 : deviceType.startsWith('sim')) &&
        (0, pluginArgs_1.getCLIArgs)()[0].plugin['device-farm'].iosDeviceType.startsWith('real')) {
        throw new Error('iosDeviceType value is set to "real" but app provided is not suitable for real device.');
    }
    if ((deviceType === null || deviceType === void 0 ? void 0 : deviceType.startsWith('real')) &&
        (0, pluginArgs_1.getCLIArgs)()[0].plugin['device-farm'].iosDeviceType.startsWith('sim')) {
        throw new Error('iosDeviceType value is set to "simulated" but app provided is not suitable for simulator device.');
    }
    let name = '';
    if (capability[customCapability.ipadOnly]) {
        name = 'iPad';
    }
    else if (capability[customCapability.iphoneOnly]) {
        name = 'iPhone';
    }
    return {
        platform,
        platformVersion: capability['appium:platformVersion']
            ? capability['appium:platformVersion']
            : undefined,
        name,
        deviceType,
        udid: (udids === null || udids === void 0 ? void 0 : udids.length) ? udids : undefined,
        busy: false,
        userBlocked: false,
        minSDK: capability[customCapability.minSDK] ? capability[customCapability.minSDK] : undefined,
        maxSDK: capability[customCapability.maxSDK] ? capability[customCapability.maxSDK] : undefined,
    };
}
exports.getDeviceFiltersFromCapability = getDeviceFiltersFromCapability;
/**
 * Helper methods to manage devices
 */
function getDeviceManager() {
    return typedi_1.Container.get(device_managers_1.DeviceFarmManager);
}
function getBusyDevicesCount() {
    return __awaiter(this, void 0, void 0, function* () {
        const allDevices = (0, device_service_1.getAllDevices)();
        return allDevices.filter((device) => {
            return device.busy;
        }).length;
    });
}
exports.getBusyDevicesCount = getBusyDevicesCount;
function updateDeviceList(cliArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const devices = yield getDeviceManager().getDevices((0, device_service_1.getAllDevices)());
        if ((0, helpers_1.isHub)(cliArgs)) {
            const nodeDevices = new NodeDevices_1.default(cliArgs.plugin['device-farm'].hub);
            yield nodeDevices.postDevicesToHub(devices, 'add');
        }
        (0, device_service_1.addNewDevice)(devices);
        return devices;
    });
}
exports.updateDeviceList = updateDeviceList;
function refreshSimulatorState(cliArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        if (timer) {
            clearInterval(timer);
        }
        timer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const simulators = yield new IOSDeviceManager_1.default().getSimulators(cliArgs);
            yield (0, device_service_1.setSimulatorState)(simulators);
        }), 10000);
    });
}
exports.refreshSimulatorState = refreshSimulatorState;
function checkNodeServerAvailability() {
    return __awaiter(this, void 0, void 0, function* () {
        const nodeChecked = [];
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const devices = new Set();
            const allDevices = (0, device_service_1.getAllDevices)();
            allDevices.forEach((device) => {
                if (!device.host.includes(ip_1.default.address()) && !nodeChecked.includes(device.host)) {
                    devices.add(device);
                }
            });
            const iterableSet = [...devices];
            const nodeConnections = iterableSet.map((device) => __awaiter(this, void 0, void 0, function* () {
                nodeChecked.push(device.host);
                yield plugin_1.DevicePlugin.waitForRemoteHubServerToBeRunning(device.host);
                return device.host;
            }));
            const nodeConnectionsResult = yield Promise.allSettled(nodeConnections);
            const nodeConnectionsSuccess = nodeConnectionsResult.filter((result) => result.status === 'fulfilled');
            const nodeConnectionsSuccessHost = nodeConnectionsSuccess.map((result) => result.value);
            const nodeConnectionsSuccessHostSet = new Set(nodeConnectionsSuccessHost);
            const nodeConnectionsFailureHostSet = new Set([...devices].filter((device) => !nodeConnectionsSuccessHostSet.has(device.host)));
            nodeConnectionsFailureHostSet.forEach((device) => {
                logger_1.default.info(`Removing Device with udid (${device.udid}) because it is not available`);
                (0, device_service_1.removeDevice)(device);
                nodeChecked.splice(nodeChecked.indexOf(device.host), 1);
            });
        }), 5000);
    });
}
exports.checkNodeServerAvailability = checkNodeServerAvailability;
function releaseBlockedDevices() {
    return __awaiter(this, void 0, void 0, function* () {
        const allDevices = (0, device_service_1.getAllDevices)();
        const busyDevices = allDevices.filter((device) => {
            return device.busy && device.host.includes(ip_1.default.address());
        });
        busyDevices.forEach(function (device) {
            const currentEpoch = new Date().getTime();
            const timeout = device.newCommandTimeout != undefined ? device.newCommandTimeout : 60;
            if (device.lastCmdExecutedAt != undefined &&
                (currentEpoch - device.lastCmdExecutedAt) / 1000 > timeout) {
                console.log(`📱 Found Device with udid ${device.udid} has no activity for more than ${timeout} seconds`);
                const sessionId = device.session_id;
                if (sessionId !== undefined) {
                    (0, device_service_1.unblockDevice)({ session_id: sessionId });
                    logger_1.default.info(`📱 Unblocked device with udid ${device.udid} mapped to sessionId ${sessionId} as there is no activity from client for more than ${timeout} seconds`);
                }
            }
        });
    });
}
exports.releaseBlockedDevices = releaseBlockedDevices;
function cronReleaseBlockedDevices() {
    return __awaiter(this, void 0, void 0, function* () {
        if (cronTimerToReleaseBlockedDevices) {
            clearInterval(cronTimerToReleaseBlockedDevices);
        }
        yield releaseBlockedDevices();
        cronTimerToReleaseBlockedDevices = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield releaseBlockedDevices();
        }), 30000);
    });
}
exports.cronReleaseBlockedDevices = cronReleaseBlockedDevices;
