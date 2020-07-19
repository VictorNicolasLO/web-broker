// Rule any nodeId can't be called PARENT

import { QueryBus } from "./query-bus";
import { EventBus } from "./event-bus";
import { CommandBus } from "./command-bus";

type Subscription = {
  topic: string;
};

type Child = {
  iframe: HTMLIFrameElement;
  nodeId: string;
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
  queryBus: QueryBus;
  eventBus: EventBus;
  commandBus: CommandBus;

  constructor(private nodeId: string) {
    window.addEventListener("message", this.proccessMessage);
    this.eventBus = new EventBus(this);
    this.commandBus = new CommandBus(this, nodeId);
    this.queryBus = new QueryBus(this, nodeId);
  }

  addChild(iframe: HTMLIFrameElement, name?: string) {
    const parentTopics = this.getAllTopics();
    this.postChildMessage(iframe, {
      action: "init-child",
      parentTopics,
      index: this.children.push({ iframe, nodeId: name }),
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
      if (this.routingDirectory[topic]) {
        this.routingDirectory[topic] = [];
      }
      this.routingDirectory[topic].push(nodeId);
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
        if (!this.routingDirectory[subscription.topic].find(fromNodeId))
          this.routingDirectory[subscription.topic].push(fromNodeId);
        const message = { action: "new-subscription", subscription };
        if (fromNodeId !== this.parentId) {
          this.postParentMessage(message);
        }
        this.broadcastToChilden(
          message,
          (child) => child.nodeId !== fromNodeId
        );
        break;
      case "emmit-event":
        const { topic, payload } = data.event as Event;
        this.emmitEvent(topic, payload);
        break;
    }
  };

  subscribe = (topic: string, listener: (data: any) => void) => {
    if (!this.localSubscriptions[topic]) {
      this.localSubscriptions[topic] = [];
      const message = { action: "new-subscription", subscription: { topic } };
      this.postParentMessage(message);
      this.broadcastToChilden(message);
    }
    return this.localSubscriptions[topic].push({ listener });
  };

  emmitEvent(topic: string, data: any) {
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
        if (this.parentId === targetNodeId) {
          this.postParentMessage(message);
          return;
        }
        const child = this.children.find(
          (child) => child.nodeId === targetNodeId
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
    if (this.parentId)
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
    iframe.contentWindow.postMessage(
      {
        nodeId: this.nodeId,
        webBroker: true,
        data: data,
      },
      "*"
    );
  }
}
