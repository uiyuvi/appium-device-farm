"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BrowserStackCapabilityManager {
    constructor(capabilities, freeDevice) {
        this.capabilities = capabilities;
        this.freeDevice = freeDevice;
    }
    getCapability() {
        const entries = Object.entries(this.freeDevice.capability);
        console.log(this.capabilities);
        entries.map(([key, val]) => {
            this.capabilities.alwaysMatch[`appium:${key}`] = val;
        });
        console.log('After', this.capabilities);
        return this.capabilities;
    }
}
exports.default = BrowserStackCapabilityManager;
