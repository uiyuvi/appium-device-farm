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
exports.unblockDevice = exports.updateCmdExecutedTime = exports.updateDevice = exports.updatedAllocatedDevice = exports.getDevice = exports.getAllDevices = exports.setSimulatorState = exports.addNewDevice = exports.removeDevice = void 0;
const db_1 = require("./db");
const logger_1 = __importDefault(require("../logger"));
const device_utils_1 = require("../device-utils");
function removeDevice(device) {
    db_1.DeviceModel.chain()
        .find({ udid: device.udid, host: { $contains: device.host } })
        .remove();
}
exports.removeDevice = removeDevice;
function addNewDevice(devices) {
    /**
     * If the newly identified devices are not in the database, then add them to the database
     */
    const devicesInDB = db_1.DeviceModel.chain().find().data();
    devices.forEach(function (device) {
        const isDeviceAlreadyPresent = devicesInDB.find((d) => d.udid === device.udid && device.host === d.host);
        if (!isDeviceAlreadyPresent) {
            db_1.DeviceModel.insert(Object.assign(Object.assign({}, device), { offline: false, userBlocked: false }));
        }
    });
}
exports.addNewDevice = addNewDevice;
function setSimulatorState(devices) {
    /**
     * Update the Latest Simulator state in DB
     */
    devices.forEach(function (device) {
        const allDevices = db_1.DeviceModel.chain().find().data();
        if (allDevices.length != 0 && device.deviceType === 'simulator') {
            const { state } = allDevices.find((d) => d.udid === device.udid);
            if (state !== device.state) {
                logger_1.default.info(`Updating Simulator status from ${state} to ${device.state} for device ${device.udid}`);
                db_1.DeviceModel.chain()
                    .find({ udid: device.udid })
                    .update(function (d) {
                    d.state = device.state;
                });
            }
        }
    });
}
exports.setSimulatorState = setSimulatorState;
function getAllDevices() {
    return db_1.DeviceModel.chain().find().data();
}
exports.getAllDevices = getAllDevices;
function getDevice(filterOptions) {
    const semver = require('semver');
    var results = db_1.DeviceModel.chain();
    if (semver.coerce(filterOptions.minSDK)) {
        results = results.where(function (obj) {
            if (semver.coerce(obj.sdk)) {
                return semver.gte(semver.coerce(obj.sdk), semver.coerce(filterOptions.minSDK));
            }
            return false;
        });
    }
    if (semver.coerce(filterOptions.maxSDK)) {
        results = results.where(function (obj) {
            if (semver.coerce(obj.sdk)) {
                return semver.lte(semver.coerce(obj.sdk), semver.coerce(filterOptions.maxSDK));
            }
            return false;
        });
    }
    const filter = {
        platform: filterOptions.platform,
        name: { $contains: filterOptions.name || '' },
        busy: filterOptions.busy,
    };
    if (filterOptions.platformVersion) {
        filter.sdk = filterOptions.platformVersion;
    }
    if (filterOptions.udid) {
        filter.udid = { $in: filterOptions.udid };
    }
    if (filterOptions.deviceType === 'simulator') {
        filter.state = 'Booted';
        const results_copy = results.copy();
        if (results_copy.find(filter).data()[0] != undefined) {
            logger_1.default.info('Picking up booted simulator');
            return results.find(filter).data()[0];
        }
        else {
            filter.state = 'Shutdown';
        }
    }
    return results.find(filter).data()[0];
}
exports.getDevice = getDevice;
function updatedAllocatedDevice(device, updateData) {
    db_1.DeviceModel.chain()
        .find({ udid: device.udid, host: device.host })
        .update(function (device) {
        Object.assign(device, Object.assign({}, updateData));
    });
}
exports.updatedAllocatedDevice = updatedAllocatedDevice;
function updateDevice(device, updateData) {
    const filterDevice = db_1.DeviceModel.chain().find({
        udid: device.udid,
    });
    if (filterDevice.data().length > 1) {
        const find = filterDevice.data().find((d) => d.busy === false);
        db_1.DeviceModel.chain()
            .find({ udid: find.udid, host: find.host })
            .update(function (device) {
            Object.assign(device, Object.assign({}, updateData));
        });
    }
    else {
        filterDevice.update(function (device) {
            Object.assign(device, Object.assign({}, updateData));
        });
    }
}
exports.updateDevice = updateDevice;
function updateCmdExecutedTime(sessionId) {
    db_1.DeviceModel.chain()
        .find({ session_id: sessionId })
        .update(function (device) {
        device.lastCmdExecutedAt = new Date().getTime();
    });
}
exports.updateCmdExecutedTime = updateCmdExecutedTime;
function unblockDevice(filter) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = db_1.DeviceModel.chain().find(filter).data()[0];
        if (device !== undefined) {
            console.log(`Found device with udid ${device.udid} to unblock with filter ${JSON.stringify(filter)}`);
            const sessionStart = device.sessionStartTime;
            const currentTime = new Date().getTime();
            const utilization = currentTime - sessionStart;
            const totalUtilization = device.totalUtilizationTimeMilliSec + utilization;
            yield (0, device_utils_1.setUtilizationTime)(device.udid, totalUtilization);
            db_1.DeviceModel.chain()
                .find(filter)
                .update(function (device) {
                device.session_id = undefined;
                device.busy = false;
                device.lastCmdExecutedAt = undefined;
                device.sessionStartTime = 0;
                device.totalUtilizationTimeMilliSec = totalUtilization;
                device.newCommandTimeout = undefined;
            });
        }
        else {
            console.log(`Not able to find device to unblock with filter ${JSON.stringify(filter)}`);
        }
    });
}
exports.unblockDevice = unblockDevice;
