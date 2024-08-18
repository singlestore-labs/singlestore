import type { AnyAI } from "@singlestore/ai";
import type { AnyDatabase, Table } from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";

export interface RAGConfig<T extends AnyDatabase, U extends AnyAI> {
  database: T;
  ai: U;
}

export class RAG<T extends AnyDatabase = AnyDatabase, U extends AnyAI = AnyAI> {
  private _database: T;
  private _ai: U;

  constructor(config: RAGConfig<T, U>) {
    this._database = config.database;
    this._ai = config.ai;
  }

  getModels() {
    return this._ai.chatCompletions.getModels();
  }

  createChat<T extends CreateChatConfig>(config?: T) {
    return Chat.create(this._database, this._ai, config);
  }

  async selectChats<T extends [tableName: string, ...Parameters<Table<ChatsTable>["select"]>]>(...[tableName, ...args]: T) {
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
