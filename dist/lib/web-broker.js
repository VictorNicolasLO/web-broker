"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebBroker = void 0;
const query_bus_1 = require("./query-bus");
const event_bus_1 = require("./event-bus");
const command_bus_1 = require("./command-bus");
const logger_1 = require("../logger");
class WebBroker {
    constructor(nodeId, logType) {
        this.nodeId = nodeId;
        this.children = [];
        this.localSubscriptions = {};
        this.routingDirectory = {};
        this.proccessMessage = (ev) => {
            const { data, webBroker, nodeId: fromNodeId } = ev.data;
            if (!webBroker)
                return;
            switch (data.action) {
                case "init-child":
                    this.parentId = fromNodeId;
                    this.insertTopicsToRoutingDirectory(fromNodeId, data.parentTopics);
                    this.postParentMessage({
                        action: "child-ready",
                        nodeId: this.nodeId,
                        childTopics: this.getAllTopics(),
                        index: data.index,
                    });
                    break;
                case "child-ready":
                    if (!this.children[data.index].nodeId)
                        this.children[data.index].nodeId = data.nodeId;
                    this.insertTopicsToRoutingDirectory(fromNodeId, data.childTopics);
                    break;
                case "new-subscription":
                    const subscription = data.subscription;
                    this.newSubscription(fromNodeId, subscription.topic);
                    break;
                case "emmit-event":
                    this.logger.debug(`Event emmited ${name}`);
                    const { topic, payload } = data.event;
                    this.emmitEvent(topic, payload, fromNodeId);
                    break;
            }
        };
        this.subscribe = (topic, listener) => {
            if (!this.localSubscriptions[topic]) {
                this.localSubscriptions[topic] = [];
                const message = { action: "new-subscription", subscription: { topic } };
                this.postParentMessage(message);
                this.broadcastToChilden(message);
            }
            return this.localSubscriptions[topic].push({ listener });
        };
        this.logger = new logger_1.Logger(logType, nodeId);
        window.addEventListener("message", this.proccessMessage);
        this.eventBus = new event_bus_1.EventBus(this);
        this.commandBus = new command_bus_1.CommandBus(this, nodeId);
        this.queryBus = new query_bus_1.QueryBus(this, nodeId);
    }
    connectChild(iframe, name) {
        const parentTopics = this.getAllTopics();
        this.logger.debug(`child loaded with ${name}`);
        this.postChildMessage(iframe, {
            action: "init-child",
            parentTopics,
            index: this.children.push({ iframe, nodeId: name }) - 1,
        });
    }
    getAllTopics() {
        return [
            ...new Set([
                ...Object.keys(this.routingDirectory),
                ...Object.keys(this.localSubscriptions),
            ]),
        ];
    }
    insertTopicsToRoutingDirectory(nodeId, topics) {
        topics.forEach((topic) => {
            this.newSubscription(nodeId, topic);
        });
    }
    newSubscription(fromNodeId, topic) {
        if (!this.routingDirectory[topic]) {
            this.routingDirectory[topic] = [];
        }
        if (this.routingDirectory[topic].indexOf(fromNodeId) === -1) {
            this.routingDirectory[topic].push(fromNodeId);
            const message = { action: "new-subscription", subscription: { topic } };
            if (fromNodeId !== this.parentId) {
                this.postParentMessage(message);
            }
            this.broadcastToChilden(message, (child) => child.nodeId !== fromNodeId);
            this.logger.debug("SUBSCRIPTIONS");
            this.logger.debug(this.routingDirectory);
            this.logger.debug(this.localSubscriptions);
        }
    }
    emmitEvent(topic, data, fromNodeId) {
        if (this.localSubscriptions[topic])
            this.localSubscriptions[topic].forEach((localSub) => {
                localSub.listener(data);
            });
        if (this.routingDirectory[topic]) {
            this.routingDirectory[topic].forEach((route) => {
                const targetNodeId = route;
                const message = {
                    action: "emmit-event",
                    event: {
                        topic,
                        payload: data,
                    },
                };
                if (this.parentId === targetNodeId && this.parentId !== fromNodeId) {
                    this.postParentMessage(message);
                    return;
                }
                const child = this.children.find((child) => child.nodeId === targetNodeId && child.nodeId !== fromNodeId);
                if (child)
                    this.postChildMessage(child.iframe, message);
            });
        }
    }
    broadcastToChilden(message, filter) {
        this.children.forEach((child) => {
            if (filter) {
                if (filter(child)) {
                    this.postChildMessage(child.iframe, message);
                }
                return;
            }
            this.postChildMessage(child.iframe, message);
        });
    }
    postParentMessage(data) {
        if (this.parentId && window.parent.postMessage)
            window.parent.postMessage({
                nodeId: this.nodeId,
                webBroker: true,
                data: data,
            }, "*");
    }
    postChildMessage(iframe, data) {
        iframe.contentWindow?.postMessage({
            nodeId: this.nodeId,
            webBroker: true,
            data: data,
        }, "*");
    }
}
exports.WebBroker = WebBroker;
//# sourceMappingURL=web-broker.js.map