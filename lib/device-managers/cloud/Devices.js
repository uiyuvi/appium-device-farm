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
/* eslint-disable no-prototype-builtins */
const Cloud_1 = __importDefault(require("../../enums/Cloud"));
class Devices {
    constructor(cloudArgs, deviceState, platform) {
        this.devices = cloudArgs.devices;
        this.deviceState = deviceState;
        this.platform = platform;
        this.cloud = cloudArgs;
    }
    getDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            const devicesByPlatform = this.devices.filter((value) => value.platform === this.platform);
            let cloudDeviceProperties;
            const result = devicesByPlatform.map((d) => {
                if (this.isBrowserStack()) {
                    cloudDeviceProperties = {
                        name: d.deviceName,
                        sdk: d['os_version'],
                        udid: d.deviceName,
                    };
                }
                if (this.isSauceLabs() || this.isLambdaTest()) {
                    cloudDeviceProperties = {
                        name: d.deviceName,
                        sdk: d.platformVersion,
                        udid: d.deviceName,
                    };
                }
                if (this.isPCloudy()) {
                    cloudDeviceProperties = {
                        name: (d === null || d === void 0 ? void 0 : d.pCloudy_DeviceFullName) || (d === null || d === void 0 ? void 0 : d.pCloudy_DeviceManufacturer),
                        sdk: (d === null || d === void 0 ? void 0 : d.pCloudy_DeviceVersion) || (d === null || d === void 0 ? void 0 : d.platformVersion),
                        udid: (d === null || d === void 0 ? void 0 : d.pCloudy_DeviceFullName) || (d === null || d === void 0 ? void 0 : d.pCloudy_DeviceManufacturer),
                    };
                }
                return Object.assign({}, ...devicesByPlatform, Object.assign({ host: this.cloud.url, busy: false, userBlocked: false, deviceType: 'real', capability: d, cloud: this.cloud.cloudName }, cloudDeviceProperties));
            });
            this.deviceState.push(...result);
            return this.deviceState;
        });
    }
    isBrowserStack() {
        return this.cloud.cloudName.toLowerCase() === Cloud_1.default.BROWSERSTACK;
    }
    isPCloudy() {
        return this.cloud.cloudName.toLowerCase() === Cloud_1.default.PCLOUDY;
    }
    isLambdaTest() {
        return this.cloud.cloudName.toLowerCase() === Cloud_1.default.LAMBDATEST;
    }
    isSauceLabs() {
        return this.cloud.cloudName.toLowerCase() === Cloud_1.default.SAUCELABS;
    }
}
exports.default = Devices;
