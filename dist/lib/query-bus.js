"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBus = void 0;
const short_uuid_1 = require("short-uuid");
class QueryBus {
    constructor(webBroker, nodeId) {
        this.webBroker = webBroker;
        this.nodeId = nodeId;
        this.pendingMessages = {};
        this.createQueryName = (queryName) => `query.${this.nodeId}.${queryName}`;
        this.addQueryHandler = (queryName, handler) => {
            const completeQueryName = this.createQueryName(queryName);
            this.webBroker.subscribe(completeQueryName, ({ data, replyTopic, messageId }) => {
                try {
                    const result = handler(data);
                    this.webBroker.emmitEvent(replyTopic, { result, messageId });
                }
                catch (error) {
                    this.webBroker.emmitEvent(replyTopic, { error, messageId });
                }
            });
        };
        this.query = (queryName, data) => {
            return new Promise((resolve, reject) => {
                const completeQueryName = `query.${queryName}`;
                const messageId = short_uuid_1.generate();
                this.pendingMessages[messageId] = { resolve, reject };
                this.webBroker.emmitEvent(completeQueryName, {
                    data,
                    replyTopic: this.replyTopic,
                    messageId,
                });
            });
        };
        this.replyTopic = `reply.query.${nodeId}`;
        webBroker.subscribe(this.replyTopic, ({ error, result, messageId }) => {
            if (error) {
                this.pendingMessages[messageId].reject(error);
            }
            else {
                this.pendingMessages[messageId].resolve(result);
            }
        });
    }
}
exports.QueryBus = QueryBus;
//# sourceMappingURL=query-bus.js.map