"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFactory = void 0;
const RemoteAndroidDeviceManager_1 = __importDefault(require("../RemoteAndroidDeviceManager"));
const RemoteIOSDeviceManager_1 = __importDefault(require("../RemoteIOSDeviceManager"));
const lodash_1 = require("lodash");
const Platform_1 = __importDefault(require("../../enums/Platform"));
const Devices_1 = __importDefault(require("../cloud/Devices"));
class DeviceFactory {
    static deviceInstance(host, deviceState, platform) {
        if ((0, lodash_1.isObject)(host) && host.cloudName) {
            return new Devices_1.default(host, deviceState, platform);
        }
        else if (platform == Platform_1.default.ANDROID) {
            return new RemoteAndroidDeviceManager_1.default(host, deviceState);
        }
        else {
            return new RemoteIOSDeviceManager_1.default(host, deviceState);
        }
    }
}
exports.DeviceFactory = DeviceFactory;
