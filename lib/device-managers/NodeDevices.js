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
class NodeDevices {
    constructor(host) {
        this.host = host;
    }
    postDevicesToHub(data, arg) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info(`Updating remote android devices ${this.host}/device-farm/api/register`);
            const status = (yield axios_1.default.post(`${this.host}/device-farm/api/register`, data, {
                params: {
                    type: arg,
                },
            })).status;
            if (status === 200) {
                if (arg === 'add') {
                    logger_1.default.info(`Pushed devices to hub ${JSON.stringify(data)}`);
                }
                else {
                    logger_1.default.info(`Removed device and pushed information to hub ${JSON.stringify(data)}`);
                }
            }
            else {
                logger_1.default.warn('Something went wrong!!');
            }
        });
    }
}
exports.default = NodeDevices;
