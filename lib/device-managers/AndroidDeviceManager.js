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
const helpers_1 = require("../helpers");
const appium_adb_1 = require("appium-adb");
const logger_1 = __importDefault(require("../logger"));
const lodash_1 = __importDefault(require("lodash"));
const support_1 = require("@appium/support");
const ChromeDriverManager_1 = __importDefault(require("./ChromeDriverManager"));
const typedi_1 = require("typedi");
const device_utils_1 = require("../device-utils");
const adbkit_1 = __importDefault(require("@devicefarmer/adbkit"));
const node_abort_controller_1 = require("node-abort-controller");
const async_wait_until_1 = __importDefault(require("async-wait-until"));
const logger_2 = __importDefault(require("../logger"));
const ip_1 = __importDefault(require("ip"));
const NodeDevices_1 = __importDefault(require("./NodeDevices"));
const device_service_1 = require("../data-service/device-service");
const Devices_1 = __importDefault(require("./cloud/Devices"));
class AndroidDeviceManager {
    constructor() {
        this.adbAvailable = true;
        this.abortControl = new Map();
        this.getDeviceName = (adbInstance, udid) => __awaiter(this, void 0, void 0, function* () {
            return yield (yield adbInstance).adbExec([
                '-s',
                udid,
                'shell',
                'dumpsys',
                'bluetooth_manager',
                '|',
                'grep',
                'name:',
                '|',
                'cut',
                '-c9-',
            ]);
        });
    }
    initiateAbortControl(deviceUdid) {
        const control = new node_abort_controller_1.AbortController();
        this.abortControl.set(deviceUdid, control);
        return control;
    }
    abort(deviceUdid) {
        var _a;
        (_a = this.abortControl.get(deviceUdid)) === null || _a === void 0 ? void 0 : _a.abort();
    }
    cancelAbort(deviceUdid) {
        if (this.abortControl.has(deviceUdid)) {
            this.abortControl.delete(deviceUdid);
        }
    }
    getDevices(deviceTypes, existingDeviceDetails, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.adbAvailable) {
                return [];
            }
            const deviceState = [];
            try {
                if ((0, helpers_1.isCloud)(cliArgs)) {
                    const cloud = new Devices_1.default(cliArgs.plugin['device-farm'].cloud, deviceState, 'android');
                    return yield cloud.getDevices();
                }
                else {
                    yield this.fetchAndroidDevices(deviceState, existingDeviceDetails, cliArgs);
                }
                if (deviceTypes.androidDeviceType === 'real') {
                    return deviceState.filter((device) => {
                        return device.deviceType === 'real';
                    });
                }
                else if (deviceTypes.androidDeviceType === 'simulated') {
                    return deviceState.filter((device) => {
                        return device.deviceType === 'emulator';
                    });
                    // return both real and simulated (emulated) devices
                }
                else {
                    return deviceState;
                }
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    fetchAndroidDevices(deviceState, existingDeviceDetails, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.requireSdkRoot();
            const connectedDevices = yield this.getConnectedDevices(cliArgs);
            for (const [adbInstance, devices] of connectedDevices) {
                yield (0, helpers_1.asyncForEach)(devices, (device) => __awaiter(this, void 0, void 0, function* () {
                    device.adbRemoteHost =
                        adbInstance.adbRemoteHost === null ? ip_1.default.address() : adbInstance.adbRemoteHost;
                    if (!deviceState.find((devicestate) => devicestate.udid === device.udid && devicestate.adbRemoteHost === device.adbRemoteHost)) {
                        const existingDevice = existingDeviceDetails.find((dev) => dev.udid === device.udid && dev.host.includes(ip_1.default.address()));
                        if (existingDevice) {
                            logger_1.default.info(`Android Device details for ${device.udid} already available`);
                            deviceState.push(Object.assign(Object.assign({}, existingDevice), { busy: false }));
                        }
                        else {
                            logger_1.default.info(`Android Device details for ${device.udid} not available. So querying now.`);
                            const deviceInfo = yield this.deviceInfo(device, adbInstance, cliArgs);
                            deviceState.push(deviceInfo[0]);
                        }
                    }
                }));
            }
            return deviceState;
        });
    }
    deviceInfo(device, adbInstance, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const systemPort = yield (0, helpers_1.getFreePort)();
            const totalUtilizationTimeMilliSec = yield (0, device_utils_1.getUtilizationTime)(device.udid);
            const [sdk, realDevice, name, chromeDriverPath] = yield Promise.all([
                this.getDeviceVersion(adbInstance, device.udid),
                this.isRealDevice(adbInstance, device.udid),
                this.getDeviceName(adbInstance, device.udid),
                this.getChromeVersion(adbInstance, device.udid, cliArgs),
            ]);
            const host = adbInstance.adbHost != null ? adbInstance.adbHost : ip_1.default.address();
            return [
                {
                    adbRemoteHost: adbInstance.adbHost,
                    adbPort: adbInstance.adbPort,
                    systemPort,
                    sdk,
                    realDevice,
                    name,
                    busy: false,
                    state: device.state,
                    udid: device.udid,
                    platform: 'android',
                    deviceType: realDevice ? 'real' : 'emulator',
                    host: `http://${host}:${cliArgs.port}`,
                    totalUtilizationTimeMilliSec: totalUtilizationTimeMilliSec,
                    sessionStartTime: 0,
                    chromeDriverPath,
                },
            ];
        });
    }
    getAdb() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.adb) {
                    this.adb = yield appium_adb_1.ADB.createADB();
                }
            }
            catch (e) {
                this.adbAvailable = false;
            }
            return this.adb;
        });
    }
    waitBootComplete(originalADB, udid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, async_wait_until_1.default)(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const bootStatus = (yield this.getDeviceProperty(originalADB, udid, 'init.svc.bootanim'));
                    if (!lodash_1.default.isNil(bootStatus) && !lodash_1.default.isEmpty(bootStatus) && bootStatus == 'stopped') {
                        console.log('Boot Completed!', udid);
                        return true;
                    }
                }
                catch (err) {
                    return false;
                }
            }), {
                intervalBetweenAttempts: 2000,
                timeout: 60 * 1000,
            });
        });
    }
    getConnectedDevices(cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const deviceList = new Map();
            const originalADB = yield this.getAdb();
            deviceList.set(originalADB, yield originalADB.getConnectedDevices());
            const client = adbkit_1.default.createClient();
            const originalADBTracking = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const tracker = yield client.trackDevices();
                    tracker.on('add', (device) => __awaiter(this, void 0, void 0, function* () {
                        const clonedDevice = lodash_1.default.cloneDeep(device);
                        Object.assign(clonedDevice, { udid: clonedDevice['id'], state: clonedDevice['type'] });
                        if (device.state != 'offline') {
                            logger_2.default.info(`Device ${clonedDevice.udid} was plugged`);
                            this.initiateAbortControl(clonedDevice.udid);
                            yield this.waitBootComplete(originalADB, clonedDevice.udid);
                            this.cancelAbort(clonedDevice.udid);
                            const trackedDevice = yield this.deviceInfo(clonedDevice, originalADB, cliArgs);
                            logger_2.default.info(`Adding device ${clonedDevice.udid} to list!`);
                            const hubExists = (0, helpers_1.isHub)(cliArgs);
                            if (hubExists) {
                                logger_2.default.info(`Updating Hub with device ${clonedDevice.udid}`);
                                const nodeDevices = new NodeDevices_1.default(cliArgs.plugin['device-farm'].hub);
                                yield nodeDevices.postDevicesToHub(trackedDevice, 'add');
                            }
                            else {
                                (0, device_service_1.addNewDevice)(trackedDevice);
                            }
                        }
                    }));
                    tracker.on('remove', (device) => __awaiter(this, void 0, void 0, function* () {
                        const clonedDevice = lodash_1.default.cloneDeep(device);
                        Object.assign(clonedDevice, { udid: clonedDevice['id'], host: ip_1.default.address() });
                        const hubExists = (0, helpers_1.isHub)(cliArgs);
                        if (hubExists) {
                            logger_2.default.info(`Removing device from Hub with device ${clonedDevice.udid}`);
                            const nodeDevices = new NodeDevices_1.default(cliArgs.plugin['device-farm'].hub);
                            yield nodeDevices.postDevicesToHub(clonedDevice, 'remove');
                        }
                        else {
                            logger_2.default.warn(`Removing device ${clonedDevice.udid} from list as the device was unplugged!`);
                            (0, device_service_1.removeDevice)(clonedDevice);
                            this.abort(clonedDevice.udid);
                        }
                    }));
                    tracker.on('end', () => console.log('Tracking stopped'));
                }
                catch (err) {
                    console.error('Something went wrong:', err.stack);
                }
            });
            originalADBTracking();
            const adbRemote = cliArgs.plugin['device-farm'].adbRemote;
            if (adbRemote !== undefined && adbRemote.length > 0) {
                yield (0, helpers_1.asyncForEach)(adbRemote, (value) => __awaiter(this, void 0, void 0, function* () {
                    const adbRemoteValue = value.split(':');
                    const adbHost = adbRemoteValue[0];
                    const adbPort = adbRemoteValue[1] || 5037;
                    const cloneAdb = originalADB.clone({
                        remoteAdbHost: adbHost,
                        adbPort,
                    });
                    deviceList.set(cloneAdb, yield cloneAdb.getConnectedDevices());
                    const remoteAdb = adbkit_1.default.createClient({
                        host: adbHost,
                        port: adbPort,
                    });
                    const remoteAdbTracking = () => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const tracker = yield remoteAdb.trackDevices();
                            tracker.on('add', (device) => __awaiter(this, void 0, void 0, function* () {
                                const clonedDevice = lodash_1.default.cloneDeep(device);
                                Object.assign(clonedDevice, {
                                    udid: clonedDevice['id'],
                                    state: clonedDevice['type'],
                                });
                                if (device.state != 'offline') {
                                    logger_2.default.info(`Device ${clonedDevice.udid} was plugged in host ${adbHost}`);
                                    this.initiateAbortControl(clonedDevice.udid);
                                    yield this.waitBootComplete(cloneAdb, clonedDevice.udid);
                                    this.cancelAbort(clonedDevice.udid);
                                    const trackedDevice = yield this.deviceInfo(clonedDevice, cloneAdb, cliArgs);
                                    logger_2.default.info(`Adding device ${clonedDevice.udid} to list!`);
                                    (0, device_service_1.addNewDevice)(trackedDevice);
                                }
                            }));
                            tracker.on('remove', (device) => __awaiter(this, void 0, void 0, function* () {
                                const clonedDevice = lodash_1.default.cloneDeep(device);
                                Object.assign(clonedDevice, { udid: clonedDevice['id'], host: adbHost });
                                logger_2.default.warn(`Removing device ${clonedDevice.udid} from ${adbHost} list as the device was unplugged!`);
                                (0, device_service_1.removeDevice)(clonedDevice);
                                this.abort(clonedDevice.udid);
                            }));
                            tracker.on('end', () => console.log('Tracking stopped'));
                        }
                        catch (err) {
                            console.error('Something went wrong:', err.stack);
                        }
                    });
                    remoteAdbTracking();
                }));
            }
            return deviceList;
        });
    }
    getChromeVersion(adbInstance, udid, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (cliArgs.plugin['device-farm'].skipChromeDownload) {
                logger_1.default.warn('skipChromeDownload server arg is set; skipping Chromedriver installation.');
                logger_1.default.warn('Android web/hybrid testing will not be possible without Chromedriver.');
                return;
            }
            logger_1.default.debug('Getting package info for chrome');
            const chromeDriverManager = typedi_1.Container.get(ChromeDriverManager_1.default);
            let versionName = '';
            try {
                const stdout = yield (yield adbInstance).adbExec(['-s', udid, 'shell', 'dumpsys', 'package', 'com.android.chrome']);
                const versionNameMatch = new RegExp(/versionName=([\d+.]+)/).exec(stdout);
                if (versionNameMatch) {
                    versionName = versionNameMatch[1];
                    versionName = versionName.split('.')[0];
                    return yield chromeDriverManager.downloadChromeDriver(versionName);
                }
            }
            catch (err) {
                logger_1.default.warn(`Error '${err.message}' while dumping package info`);
            }
        });
    }
    downloadChromeDriver(version) {
        return __awaiter(this, void 0, void 0, function* () {
            const instance = yield ChromeDriverManager_1.default.getInstance();
            return yield instance.downloadChromeDriver(version);
        });
    }
    getDeviceVersion(adbInstance, udid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getDeviceProperty(adbInstance, udid, 'ro.build.version.release');
        });
    }
    getDeviceProperty(adbInstance, udid, prop) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (yield adbInstance).adbExec(['-s', udid, 'shell', 'getprop', prop]);
        });
    }
    isRealDevice(adbInstance, udid) {
        return __awaiter(this, void 0, void 0, function* () {
            const character = yield this.getDeviceProperty(adbInstance, udid, 'ro.build.characteristics');
            return character !== 'emulator';
        });
    }
    requireSdkRoot() {
        return __awaiter(this, void 0, void 0, function* () {
            const sdkRoot = (0, appium_adb_1.getSdkRootFromEnv)();
            const docMsg = 'Read https://developer.android.com/studio/command-line/variables for more details';
            if (lodash_1.default.isEmpty(sdkRoot)) {
                throw new Error(`Neither ANDROID_HOME nor ANDROID_SDK_ROOT environment variable was exported. ${docMsg}`);
            }
            if (!(yield support_1.fs.exists(sdkRoot))) {
                throw new Error(`The Android SDK root folder '${sdkRoot}' does not exist on the local file system. ${docMsg}`);
            }
            const stats = yield support_1.fs.stat(sdkRoot);
            if (!stats.isDirectory()) {
                throw new Error(`The Android SDK root '${sdkRoot}' must be a folder. ${docMsg}`);
            }
            return sdkRoot;
        });
    }
}
exports.default = AndroidDeviceManager;
