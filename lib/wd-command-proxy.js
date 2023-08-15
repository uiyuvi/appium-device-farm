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
exports.registerProxyMiddlware = exports.removeProxyHandler = exports.addProxyHandler = void 0;
const http_proxy_middleware_1 = require("http-proxy-middleware");
const device_service_1 = require("./data-service/device-service");
const logger_1 = __importDefault(require("./logger"));
const remoteProxyMap = new Map();
function addProxyHandler(sessionId, remoteHost) {
    remoteProxyMap.set(sessionId, (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: new URL(remoteHost).origin,
        logLevel: 'debug',
        changeOrigin: true,
        onProxyReq: proxyRequestInterceptor,
    }));
}
exports.addProxyHandler = addProxyHandler;
function removeProxyHandler(sessionId) {
    remoteProxyMap.delete(sessionId);
}
exports.removeProxyHandler = removeProxyHandler;
function proxyRequestInterceptor(proxyReq, req, res) {
    if (!new RegExp(/post|put|patch/g).test(req.method.toLowerCase())) {
        return;
    }
    const contentType = proxyReq.getHeader('Content-Type');
    const writeBody = (bodyData) => {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    };
    if (contentType && contentType.includes('application/json')) {
        writeBody(JSON.stringify(req.body || {}));
    }
}
function getSessionIdFromUr(url) {
    const SESSION_ID_PATTERN = /\/session\/([^/]+)/;
    const match = SESSION_ID_PATTERN.exec(url);
    if (match) {
        return match[1];
    }
    return null;
}
function handler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const sessionId = getSessionIdFromUr(req.url);
        if (!sessionId) {
            return next();
        }
        if (remoteProxyMap.has(sessionId)) {
            remoteProxyMap.get(sessionId)(req, res, next);
            if (req.method === 'DELETE') {
                logger_1.default.info(`📱 Unblocking the device that is blocked for session ${sessionId} in remote machine`);
                (0, device_service_1.unblockDevice)({ session_id: sessionId });
                removeProxyHandler(sessionId);
            }
        }
        else {
            return next();
        }
    });
}
function registerProxyMiddlware(expressApp) {
    const index = expressApp._router.stack.findIndex((s) => s.route);
    expressApp.use('/', handler);
    expressApp._router.stack.splice(index, 0, expressApp._router.stack.pop());
}
exports.registerProxyMiddlware = registerProxyMiddlware;
