import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, Table } from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";
export * from "./chat/tools";

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

  createChat<K extends CreateChatConfig>(config?: K) {
    return Chat.create(this._database, this._ai, config);
  }

  async selectChats<
    K extends { tableName?: string; tools?: AnyChatCompletionTool[] },
    V extends Parameters<Table<ChatsTable>["select"]>,
  >(...[config, ...args]: [K?, ...V]) {
    const rows = await this._database.table<ChatsTable>(config?.tableName || "chats").select(...args);

    return rows.map(
      (row) =>
        new Chat<T, U, K["tools"]>(
          this._database,
          this._ai,
          config?.tools || [],
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
