"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CapabilityManager_1 = __importDefault(require("../cloud/browserstack/capability/CapabilityManager"));
const Cloud_1 = __importDefault(require("../../enums/Cloud"));
class CapabilityFactory {
    static getCapability(capability, device) {
        if (device.cloud == Cloud_1.default.BROWSERSTACK) {
            return new CapabilityManager_1.default(capability, device);
        }
        else {
            throw new Error('Cloud not supported');
        }
    }
}
exports.default = CapabilityFactory;
