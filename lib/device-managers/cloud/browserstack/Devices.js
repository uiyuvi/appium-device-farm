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
Object.defineProperty(exports, "__esModule", { value: true });
class Devices {
    constructor(host, deviceState, platform) {
        this.host = host;
        this.deviceState = deviceState;
        this.platform = platform;
    }
    getDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = this.host.devices;
            const devicesByPlatform = devices.filter((value) => value.platform === this.platform);
            let cloudDeviceProperties;
            const result = devicesByPlatform.map((d) => {
                if (this.host.cloudName.toLowerCase() === 'browserstack') {
                    cloudDeviceProperties = {
                        name: d.deviceName,
                        sdk: d['os_version'],
                        udid: d.deviceName,
                    };
                }
                return Object.assign({}, ...devicesByPlatform, Object.assign({ host: this.host.url, busy: false, deviceType: 'real', capability: d, cloud: this.host.cloudName }, cloudDeviceProperties));
            });
            this.deviceState.push(...result);
            return this.deviceState;
        });
    }
}
exports.default = Devices;
