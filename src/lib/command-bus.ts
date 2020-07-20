import { WebBroker } from "./web-broker";
import { generate } from "short-uuid";

export class CommandBus {
  replyTopic: string;
  pendingMessages: { [messageId: string]: { resolve: any; reject: any } } = {};
  constructor(private webBroker: WebBroker, private nodeId: string) {
    this.replyTopic = `reply.command.${nodeId}`;
    webBroker.subscribe(this.replyTopic, ({ error, result, messageId }) => {
      if (error) {
        this.pendingMessages[messageId].reject(error);
      } else {
        this.pendingMessages[messageId].resolve(result);
      }
    });
  }

  createCommandName = (commandName: string) =>
    `command.${this.nodeId}.${commandName}`;

  addCommandHandler = (commandName: string, handler: (data: any) => any) => {
    const completecommandName = this.createCommandName(commandName);
    this.webBroker.subscribe(
      completecommandName,
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

  command = (commandName: string, data: any) => {
    return new Promise((resolve, reject) => {
      const completecommandName = `command.${commandName}`;
      const messageId = generate();
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
}
