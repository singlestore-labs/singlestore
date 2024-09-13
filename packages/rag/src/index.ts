import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, InferDatabaseType, ResultSetHeader, Table, TableName } from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";
export * from "./chat/tools";

export interface RAGConfig<TDatabase extends AnyDatabase, TAI extends AnyAI> {
  database: TDatabase;
  ai: TAI;
}

export class RAG<TDatabase extends AnyDatabase = AnyDatabase, TAI extends AnyAI = AnyAI> {
  private _database: TDatabase;
  private _ai: TAI;

  constructor(config: RAGConfig<TDatabase, TAI>) {
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
      TAI,
      TConfig["tools"],
      TConfig["tableName"] extends TableName ? TConfig["tableName"] : TableName,
      TConfig["sessionsTableName"] extends TableName ? TConfig["sessionsTableName"] : TableName,
      TConfig["messagesTableName"] extends TableName ? TConfig["messagesTableName"] : TableName
    >
  > {
    return Chat.create(this._database, this._ai, config);
  }

  async findChats<TConfig extends { tableName?: string; tools?: AnyChatCompletionTool[] }>(
    config?: TConfig,
    findParams?: Parameters<
      Table<
        TConfig["tableName"] extends TableName ? TConfig["tableName"] : TableName,
        ChatsTable,
        InferDatabaseType<TDatabase>,
        TAI
      >["find"]
    >[0],
  ): Promise<
    Chat<
      TDatabase,
      TAI,
      TConfig["tools"],
      TConfig["tableName"] extends TableName ? TConfig["tableName"] : TableName,
      TableName,
      TableName
    >[]
  > {
    const rows = await this._database.table.use(config?.tableName || "chats").find(findParams as any);
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
