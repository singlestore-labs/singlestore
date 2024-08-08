import type { AI } from "@singlestore/ai";
import type { WorkspaceDatabase } from "@singlestore/client";
import { Chat, type ChatConfig } from "./chat";

export type * from "./types";

export class RAG<T extends WorkspaceDatabase = WorkspaceDatabase> {
  public database;
  public ai;

  constructor(config: { database: T; ai: AI }) {
    this.database = config.database;
    this.ai = config.ai;
  }

  createChat<T extends Partial<ChatConfig>>(config?: T) {
    return Chat.create(this.database, this.ai, config);
  }

  deleteChat(tableName: Chat["tableName"], value: Chat["id"] | Chat["name"]) {
    return Chat.delete(this.database, tableName, value);
  }
}
