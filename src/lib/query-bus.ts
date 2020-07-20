import { WebBroker } from "./web-broker";
import { generate } from "short-uuid";

export class QueryBus {
  replyTopic: string;
  pendingMessages: { [messageId: string]: { resolve: any; reject: any } } = {};
  constructor(private webBroker: WebBroker, private nodeId: string) {
    this.replyTopic = `reply.query.${nodeId}`;
    webBroker.subscribe(this.replyTopic, ({ error, result, messageId }) => {
      if (error) {
        this.pendingMessages[messageId].reject(error);
      } else {
        this.pendingMessages[messageId].resolve(result);
      }
    });
  }

  createQueryName = (queryName: string) => `query.${this.nodeId}.${queryName}`;

  addQueryHandler = (queryName: string, handler: (data: any) => any) => {
    const completeQueryName = this.createQueryName(queryName);
    this.webBroker.subscribe(
      completeQueryName,
      ({ data, replyTopic, messageId }) => {
        try {
          const result = handler(data);
          this.webBroker.emmitEvent(replyTopic, { result, messageId });
        } catch (error) {
          this.webBroker.emmitEvent(replyTopic, { error, messageId });
        }
      }
    );
  };

  query = (queryName: string, data: any) => {
    return new Promise((resolve, reject) => {
      const completeQueryName = `query.${queryName}`;
      const messageId = generate();
      this.pendingMessages[messageId] = { resolve, reject };
      const eventEmmited = this.webBroker.emmitEvent(completeQueryName, {
        data,
        replyTopic: this.replyTopic,
        messageId,
      });
      if (!eventEmmited) {
        reject({ message: "Subscription not found" });
      }
    });
  };
}
