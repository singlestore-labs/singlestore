import type { AI, AIBase } from "@singlestore/ai";
import type { Database, Table } from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";

export interface RAGConfig<T extends Database<any>, U extends AIBase> {
  database: T;
  ai: U;
}

export class RAG<T extends Database<any> = Database, U extends AIBase = AI> {
  private _database;
  private _ai;

  constructor(config: RAGConfig<T, U>) {
    this._database = config.database;
    this._ai = config.ai;
  }

  getModels() {
    return this._ai.chatCompletions.getModels();
  }

  createChat<K extends CreateChatConfig<T, U>>(config?: K) {
    return Chat.create(this._database, this._ai, config);
  }

  async selectChats(...[tableName, ...args]: [tableName: string, ...Parameters<Table<ChatsTable<T, U>>["select"]>]) {
    const rows = await this._database.table<ChatsTable<T, U>>(tableName).select(...args);

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
