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
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../logger"));
class RemoteIOSDeviceManager {
    constructor(host, deviceState) {
        this.host = host;
        this.deviceState = deviceState;
    }
    getDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info('Fetching remote iOS devices');
            const remoteDevices = (yield axios_1.default.get(`${this.host}/device-farm/api/devices/ios`)).data;
            remoteDevices.filter((device) => {
                if (device.deviceType === 'real') {
                    delete device['meta'];
                    delete device['$loki'];
                    this.deviceState.push(Object.assign(Object.assign(Object.assign({}, device), { host: `${this.host}` })));
                }
            });
        });
    }
}
exports.default = RemoteIOSDeviceManager;
