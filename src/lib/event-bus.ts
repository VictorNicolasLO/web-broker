import { WebBroker } from "./web-broker";

export class EventBus {
  constructor(private webBroker: WebBroker) {}

  subscribe(topic: string, handler: (data: any) => void) {
    this.webBroker.subscribe(`event.${topic}`, handler);
  }

  publish(topic: string, data: any) {
    this.webBroker.emmitEvent(`event.${topic}`, data);
  }
}
