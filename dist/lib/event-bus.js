"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    constructor(webBroker) {
        this.webBroker = webBroker;
    }
    subscribe(topic, handler) {
        this.webBroker.subscribe(`event.${topic}`, handler);
    }
    publish(topic, data) {
        this.webBroker.emmitEvent(`event.${topic}`, data);
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=event-bus.js.map