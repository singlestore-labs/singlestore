import type { AI } from "@singlestore/ai";
import type { WorkspaceDatabase } from "@singlestore/client";
import { Chat, type ChatConfig } from "./chat";

export type * from "./types";

export class RAG<T extends WorkspaceDatabase = WorkspaceDatabase, U extends AI = AI> {
  public database;
  public ai;

  constructor(config: { database: T; ai: U }) {
    this.database = config.database;
    this.ai = config.ai;
  }

  getModels() {
    return this.ai.chatCompletions.getModels();
  }

  createChat<T extends Partial<ChatConfig>>(config?: T) {
    return Chat.create(this.database, this.ai, config);
  }

  deleteChats(...args: Parameters<typeof Chat.delete> extends [any, ...infer Rest] ? Rest : never) {
    return Chat.delete(this.database, ...args);
  }
}
