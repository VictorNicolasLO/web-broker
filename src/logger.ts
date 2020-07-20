export type LogType = "debug" | "none";

export class Logger {
  constructor(private logType: LogType, private nodeId: string) {}
  debug(log: any) {
    if (this.logType === "debug") {
      console.log(this.nodeId, log);
    }
  }
}
