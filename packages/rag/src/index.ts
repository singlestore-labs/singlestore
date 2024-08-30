import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, ResultSetHeader, Table } from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";
export * from "./chat/tools";

export interface RAGConfig<TDatabase extends AnyDatabase, TAi extends AnyAI> {
  database: TDatabase;
  ai: TAi;
}

export class RAG<TDatabase extends AnyDatabase = AnyDatabase, TAi extends AnyAI = AnyAI> {
  private _database: TDatabase;
  private _ai: TAi;

  constructor(config: RAGConfig<TDatabase, TAi>) {
    this._database = config.database;
    this._ai = config.ai;
  }

  getModels() {
    return this._ai.chatCompletions.getModels();
  }

  createChat<TConfig extends CreateChatConfig>(
    config?: TConfig,
  ): Promise<
    Chat<
      TDatabase,
      TAi,
      TConfig["tools"],
      TConfig["tableName"] extends string ? TConfig["tableName"] : string,
      TConfig["sessionsTableName"] extends string ? TConfig["sessionsTableName"] : string,
      TConfig["messagesTableName"] extends string ? TConfig["messagesTableName"] : string
    >
  > {
    return Chat.create(this._database, this._ai, config);
  }

  async findChats<TConfig extends { tableName?: string; tools?: AnyChatCompletionTool[] }>(
    config?: TConfig,
    findParams?: Parameters<Table<ChatsTable<TConfig["tableName"] extends string ? TConfig["tableName"] : string>>["find"]>[0],
  ): Promise<
    Chat<
      TDatabase,
      TAi,
      TConfig["tools"],
      TConfig["tableName"] extends string ? TConfig["tableName"] : string,
      string,
      string
    >[]
  > {
    const rows = await this._database.table(config?.tableName || "chats").find(findParams);
    return rows.map(
      (row) =>
        new Chat(
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

  deleteChats(
    ...args: Parameters<typeof Chat.delete> extends [any, ...infer Rest] ? Rest : never
  ): Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]> {
    return Chat.delete(this._database, ...args);
  }
}
