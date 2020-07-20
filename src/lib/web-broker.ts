// Rule any nodeId can't be called PARENT

import { QueryBus } from "./query-bus";
import { EventBus } from "./event-bus";
import { CommandBus } from "./command-bus";
import { LogType, Logger } from "../logger";

type Subscription = {
  topic: string;
};

type Child = {
  iframe: HTMLIFrameElement;
  nodeId?: string;
};

type LocalSubscription = {
  listener: (data: any) => void;
};

type Event = {
  topic: string;
  payload: any;
};

export class WebBroker {
  private children: Child[] = [];
  private parentId: string;
  private localSubscriptions: { [topic: string]: LocalSubscription[] } = {};
  private routingDirectory: { [topic: string]: string[] } = {};
  private logger: Logger;
  queryBus: QueryBus;
  eventBus: EventBus;
  commandBus: CommandBus;

  constructor(private nodeId: string, logType: LogType) {
    this.logger = new Logger(logType, nodeId);
    window.addEventListener("message", this.proccessMessage);

    this.eventBus = new EventBus(this);
    this.commandBus = new CommandBus(this, nodeId);
    this.queryBus = new QueryBus(this, nodeId);
  }

  connectChild(iframe: HTMLIFrameElement, name?: string) {
    const parentTopics = this.getAllTopics();
    this.logger.debug(`child loaded with ${name}`);
    this.postChildMessage(iframe, {
      action: "init-child",
      parentTopics,
      index: this.children.push({ iframe, nodeId: name }) - 1,
    });
  }

  private getAllTopics() {
    return [
      ...new Set([
        ...Object.keys(this.routingDirectory),
        ...Object.keys(this.localSubscriptions),
      ]),
    ];
  }

  private insertTopicsToRoutingDirectory(nodeId: string, topics: string[]) {
    topics.forEach((topic: string) => {
      this.newSubscription(nodeId, topic);
    });
  }

  private proccessMessage = (ev: MessageEvent) => {
    const { data, webBroker, nodeId: fromNodeId } = ev.data;
    if (!webBroker) return;
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
        const subscription: Subscription = data.subscription;
        this.newSubscription(fromNodeId, subscription.topic);
        break;
      case "emmit-event":
        this.logger.debug(`Event emmited ${name}`);
        const { topic, payload } = data.event as Event;
        this.emmitEvent(topic, payload, fromNodeId);
        break;
    }
  };

  private newSubscription(fromNodeId: string, topic: string) {
    if (!this.routingDirectory[topic]) {
      this.routingDirectory[topic] = [];
    }
    // TODO replace with indexOf
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

  subscribe = (topic: string, listener: (data: any) => void) => {
    if (!this.localSubscriptions[topic]) {
      this.localSubscriptions[topic] = [];
      const message = { action: "new-subscription", subscription: { topic } };
      this.postParentMessage(message);
      this.broadcastToChilden(message);
    }
    return this.localSubscriptions[topic].push({ listener });
  };

  emmitEvent(topic: string, data: any, fromNodeId?: string) {
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
        const child = this.children.find(
          (child) =>
            child.nodeId === targetNodeId && child.nodeId !== fromNodeId
        );
        if (child) this.postChildMessage(child.iframe, message);
      });
    }
  }

  private broadcastToChilden(message: any, filter?: (child: Child) => boolean) {
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

  private postParentMessage(data: any) {
    if (this.parentId && window.parent.postMessage)
      window.parent.postMessage(
        {
          nodeId: this.nodeId,
          webBroker: true,
          data: data,
        },
        "*"
      );
  }

  private postChildMessage(iframe: HTMLIFrameElement, data: any) {
    iframe.contentWindow?.postMessage(
      {
        nodeId: this.nodeId,
        webBroker: true,
        data: data,
      },
      "*"
    );
  }
}
