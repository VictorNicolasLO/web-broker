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

export declare class CommandBus {
  addCommandHandler(commandName: string, handler: (data: any) => any): void;
  command(commandName: string, data: any): any;
}

export declare class QueryBus {
  addQueryHandler(queryName: string, handler: (data: any) => any): void;
  query(queryName: string, data: any): any;
}

export declare class EventBus {
  subscribe(topic: string, handler: (data: any) => void): void;
  publish(topic: string, data: any): void;
}

export declare class WebBroker {
  queryBus: QueryBus;
  eventBus: EventBus;
  commandBus: CommandBus;

  connectChild(iframe: HTMLIFrameElement, name?: string): number;

  subscribe(topic: string, listener: (data: any) => void): number;

  emmitEvent(topic: string, data: any): void;
}
