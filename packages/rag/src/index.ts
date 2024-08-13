import type { AI } from "@singlestore/ai";
import type { WorkspaceDatabase, WorkspaceTable } from "@singlestore/client";
import { Chat, type ChatsTable, type ChatConfig } from "./chat";

export type * from "./types";

export class RAG<T extends WorkspaceDatabase = WorkspaceDatabase, U extends AI = AI> {
  private _database;
  private _ai;

  constructor(config: { database: T; ai: U }) {
    this._database = config.database;
    this._ai = config.ai;
  }

  getModels() {
    return this._ai.chatCompletions.getModels();
  }

  createChat<T extends Partial<ChatConfig>>(config?: T) {
    return Chat.create(this._database, this._ai, config);
  }

  async selectChats(...[tableName, ...args]: [tableName: string, ...Parameters<WorkspaceTable<ChatsTable>["select"]>]) {
    const rows = await this._database.table<ChatsTable>(tableName).select(...args);
    return rows.map(
      (row) =>
        new Chat(
          this._database,
          this._ai,
          row.id,
          row.createdAt,
          row.name,
          row.systemRole,
          row.store,
          row.tableName,
          row.sessionsTableName,
          row.messagesTableName,
        ),
    );
  }

  deleteChats(...args: Parameters<typeof Chat.delete> extends [any, ...infer Rest] ? Rest : never) {
    return Chat.delete(this._database, ...args);
  }
}
