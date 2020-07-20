"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
const short_uuid_1 = require("short-uuid");
class CommandBus {
    constructor(webBroker, nodeId) {
        this.webBroker = webBroker;
        this.nodeId = nodeId;
        this.pendingMessages = {};
        this.createCommandName = (commandName) => `command.${this.nodeId}.${commandName}`;
        this.addCommandHandler = (commandName, handler) => {
            const completecommandName = this.createCommandName(commandName);
            this.webBroker.subscribe(completecommandName, ({ data, replyTopic, messageId }) => {
                try {
                    const result = handler(data);
                    this.webBroker.emmitEvent(replyTopic, { result, messageId });
                }
                catch (error) {
                    this.webBroker.emmitEvent(replyTopic, { error, messageId });
                }
            });
        };
        this.command = (commandName, data) => {
            return new Promise((resolve, reject) => {
                const completecommandName = `command.${commandName}`;
                const messageId = short_uuid_1.generate();
                this.pendingMessages[messageId] = { resolve, reject };
                const eventEmmited = this.webBroker.emmitEvent(completecommandName, {
                    data,
                    replyTopic: this.replyTopic,
                    messageId,
                });
                if (!eventEmmited) {
                    reject({ message: "Subscription not found" });
                }
            });
        };
        this.replyTopic = `reply.command.${nodeId}`;
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
exports.CommandBus = CommandBus;
//# sourceMappingURL=command-bus.js.map