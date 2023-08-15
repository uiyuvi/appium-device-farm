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
const node_simctl_1 = __importDefault(require("node-simctl"));
const lodash_1 = require("lodash");
const appium_ios_device_1 = require("appium-ios-device");
const helpers_1 = require("../helpers");
const helpers_2 = require("../helpers");
const logger_1 = __importDefault(require("../logger"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const device_utils_1 = require("../device-utils");
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_2 = __importDefault(require("../logger"));
const Devices_1 = __importDefault(require("./cloud/Devices"));
const ip_1 = __importDefault(require("ip"));
const NodeDevices_1 = __importDefault(require("./NodeDevices"));
const iOSTracker_1 = require("./iOSTracker");
const device_service_1 = require("../data-service/device-service");
class IOSDeviceManager {
    /**
     * Method to get all ios devices and simulators
     *
     * @returns {Promise<Array<IDevice>>}
     */
    getDevices(deviceTypes, existingDeviceDetails, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, helpers_1.isMac)()) {
                return [];
            }
            else {
                if (deviceTypes.iosDeviceType === 'real') {
                    return (0, lodash_1.flatten)(yield Promise.all([this.getRealDevices(existingDeviceDetails, cliArgs)]));
                }
                else if (deviceTypes.iosDeviceType === 'simulated') {
                    return (0, lodash_1.flatten)(yield Promise.all([this.getSimulators(cliArgs)]));
                    // return both real and simulated devices
                }
                else {
                    return (0, lodash_1.flatten)(yield Promise.all([
                        this.getRealDevices(existingDeviceDetails, cliArgs),
                        this.getSimulators(cliArgs),
                    ]));
                }
            }
        });
    }
    getConnectedDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield appium_ios_device_1.utilities.getConnectedDevices();
        });
    }
    getOSVersion(udid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield appium_ios_device_1.utilities.getOSVersion(udid);
        });
    }
    getDeviceName(udid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield appium_ios_device_1.utilities.getDeviceName(udid);
        });
    }
    getDevicePlatformName(name) {
        return name.toLowerCase().includes('tv') ? 'tvos' : 'ios';
    }
    /**
     * Method to get all ios real devices
     *
     * @returns {Promise<Array<IDevice>>}
     */
    getRealDevices(existingDeviceDetails, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const deviceState = [];
            if ((0, helpers_1.isCloud)(cliArgs)) {
                const cloud = new Devices_1.default(cliArgs.plugin['device-farm'].cloud, deviceState, 'ios');
                return yield cloud.getDevices();
            }
            else {
                yield this.fetchLocalIOSDevices(existingDeviceDetails, deviceState, cliArgs);
            }
            return deviceState;
        });
    }
    derivedDataPath(cliArgs, udid, realDevice) {
        const derivedDataPath = cliArgs.plugin['device-farm'].derivedDataPath;
        function derivedPathExtracted(tmpPath, derivedDataPath) {
            if (derivedDataPath !== undefined) {
                fs_extra_1.default.copySync(derivedDataPath, tmpPath);
            }
            else {
                if (!fs_extra_1.default.existsSync(tmpPath)) {
                    logger_2.default.info(`DerivedDataPath for UDID ${udid} not set, so falling back to ${tmpPath}`);
                    logger_2.default.info(`WDA will be build once and will use WDA Runner from path ${tmpPath}, second test run will skip the build process`);
                    fs_extra_1.default.mkdirSync(tmpPath, { recursive: true });
                }
            }
        }
        if (derivedDataPath) {
            if (typeof derivedDataPath !== 'object')
                throw new Error('DerivedData Path should be able Object');
            const tmpPath = path_1.default.join(os_1.default.homedir(), `Library/Developer/Xcode/DerivedData/WebDriverAgent-${udid}`);
            if (realDevice) {
                derivedPathExtracted(tmpPath, derivedDataPath.device);
            }
            else {
                derivedPathExtracted(tmpPath, derivedDataPath.simulator);
            }
            return tmpPath;
        }
        else {
            return path_1.default.join(os_1.default.homedir(), `Library/Developer/Xcode/DerivedData/WebDriverAgent-${udid}`);
        }
    }
    fetchLocalIOSDevices(existingDeviceDetails, deviceState, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = yield this.getConnectedDevices();
            yield (0, helpers_2.asyncForEach)(devices, (udid) => __awaiter(this, void 0, void 0, function* () {
                const existingDevice = existingDeviceDetails.find((device) => device.udid === udid);
                if (existingDevice) {
                    logger_1.default.info(`IOS Device details for ${udid} already available`);
                    deviceState.push(Object.assign(Object.assign({}, existingDevice), { busy: false }));
                }
                else {
                    const deviceInfo = yield this.getDeviceInfo(udid, cliArgs);
                    deviceState.push(deviceInfo);
                }
            }));
            const goIosTracker = new iOSTracker_1.GoIosTracker();
            yield goIosTracker.start();
            goIosTracker.on('device-connected', (message) => __awaiter(this, void 0, void 0, function* () {
                const deviceAttached = [yield this.getDeviceInfo(message.id, cliArgs)];
                const hubExists = (0, helpers_1.isHub)(cliArgs);
                if (hubExists) {
                    logger_2.default.info(`Updating Hub with iOS device ${message.id}`);
                    const nodeDevices = new NodeDevices_1.default(cliArgs.plugin['device-farm'].hub);
                    yield nodeDevices.postDevicesToHub(deviceAttached, 'add');
                }
                else {
                    logger_2.default.info(`iOS device with udid ${message.id} plugged! updating device list...`);
                    (0, device_service_1.addNewDevice)(deviceAttached);
                }
            }));
            goIosTracker.on('device-removed', (message) => __awaiter(this, void 0, void 0, function* () {
                const deviceRemoved = { udid: message.id, host: ip_1.default.address() };
                const hubExists = (0, helpers_1.isHub)(cliArgs);
                if (hubExists) {
                    logger_2.default.info(`iOS device with udid ${message.id} unplugged! updating hub device list...`);
                    const nodeDevices = new NodeDevices_1.default(cliArgs.plugin['device-farm'].hub);
                    yield nodeDevices.postDevicesToHub(deviceRemoved, 'remove');
                }
                else {
                    logger_2.default.info(`iOS device with udid ${message.id} unplugged! updating device list...`);
                    (0, device_service_1.removeDevice)(deviceRemoved);
                }
            }));
        });
    }
    getDeviceInfo(udid, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const wdaLocalPort = yield (0, helpers_1.getFreePort)();
            const mjpegServerPort = yield (0, helpers_1.getFreePort)();
            const totalUtilizationTimeMilliSec = yield (0, device_utils_1.getUtilizationTime)(udid);
            const [sdk, name] = yield Promise.all([this.getOSVersion(udid), this.getDeviceName(udid)]);
            return Object.assign({
                wdaLocalPort,
                mjpegServerPort,
                udid,
                sdk,
                name,
                busy: false,
                realDevice: true,
                deviceType: 'real',
                platform: this.getDevicePlatformName(name),
                host: `http://${ip_1.default.address()}:${cliArgs.port}`,
                totalUtilizationTimeMilliSec: totalUtilizationTimeMilliSec,
                sessionStartTime: 0,
                derivedDataPath: this.derivedDataPath(cliArgs, udid, true),
            });
        });
    }
    /**
     * Method to get all ios simulators
     *
     * @returns {Promise<Array<IDevice>>}
     */
    getSimulators(cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const simulators = [];
            const hubExists = (0, helpers_1.isHub)(cliArgs);
            yield this.fetchLocalSimulators(simulators, cliArgs);
            simulators.sort((a, b) => (a.state > b.state ? 1 : -1));
            if (hubExists) {
                logger_2.default.info('Updating Hub with Simulators');
                const nodeDevices = new NodeDevices_1.default(cliArgs.plugin['device-farm'].hub);
                yield nodeDevices.postDevicesToHub(simulators, 'add');
            }
            return simulators;
        });
    }
    fetchLocalSimulators(simulators, cliArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const flattenValued = yield this.getLocalSims();
            let filteredSimulators = [];
            const hasUserGivenSimulators = Object.hasOwn(cliArgs.plugin['device-farm'], 'simulators');
            if (hasUserGivenSimulators) {
                filteredSimulators = flattenValued.filter((device) => cliArgs.plugin['device-farm'].simulators.some((simulator) => device.name === simulator.name && device.sdk === simulator.sdk));
            }
            const buildSimulators = !(0, lodash_1.isEmpty)(filteredSimulators) ? filteredSimulators : flattenValued;
            yield (0, helpers_2.asyncForEach)(buildSimulators, (device) => __awaiter(this, void 0, void 0, function* () {
                const wdaLocalPort = yield (0, helpers_1.getFreePort)();
                const mjpegServerPort = yield (0, helpers_1.getFreePort)();
                const totalUtilizationTimeMilliSec = yield (0, device_utils_1.getUtilizationTime)(device.udid);
                simulators.push(Object.assign(Object.assign(Object.assign({}, device), { wdaLocalPort,
                    mjpegServerPort, busy: false, realDevice: false, platform: this.getDevicePlatformName(device.name), deviceType: 'simulator', host: `http://${ip_1.default.address()}:${cliArgs.port}`, totalUtilizationTimeMilliSec: totalUtilizationTimeMilliSec, sessionStartTime: 0, derivedDataPath: this.derivedDataPath(cliArgs, device.udid, false) })));
            }));
        });
    }
    getLocalSims() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const simctl = yield new node_simctl_1.default();
                const iOSSimulators = (0, lodash_1.flatten)(Object.values(yield simctl.getDevices(null, 'iOS'))).length > 1;
                const tvSimulators = (0, lodash_1.flatten)(Object.values(yield simctl.getDevices(null, 'tvOS'))).length > 1;
                let iosSimulators = [];
                let tvosSimulators = [];
                if (iOSSimulators) {
                    iosSimulators = (0, lodash_1.flatten)(Object.values((yield simctl.getDevicesByParsing('iOS'))));
                }
                else {
                    console.log('No iOS simulators found!');
                }
                if (tvSimulators) {
                    tvosSimulators = (0, lodash_1.flatten)(Object.values((yield simctl.getDevicesByParsing('tvOS'))));
                }
                else {
                    console.log('No tvOS simulators found!');
                }
                return [...iosSimulators, ...tvosSimulators];
            }
            catch (error) {
                console.error(error);
            }
        });
    }
}
exports.default = IOSDeviceManager;
