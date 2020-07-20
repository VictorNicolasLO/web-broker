"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(logType, nodeId) {
        this.logType = logType;
        this.nodeId = nodeId;
    }
    debug(log) {
        if (this.logType === "debug") {
            console.log(this.nodeId, log);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map