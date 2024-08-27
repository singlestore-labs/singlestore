import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type {
  AnyDatabase,
  Database,
  DatabaseType,
  FieldPacket,
  InferDatabaseType,
  QueryBuilderParams,
  ResultSetHeader,
  Table,
} from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";
export * from "./chat/tools";

/**
 * Interface representing the configuration for creating a RAG (Retrieve and Generate) instance.
 *
 * @typeParam TDatabase - The type of the database, which extends `AnyDatabase`.
 * @typeParam TAi - The type of AI functionalities integrated with the RAG instance, which extends `AnyAI`.
 *
 * @property {TDatabase} database - The database instance used for storing and retrieving chat data.
 * @property {TAi} ai - The AI instance used for generating chat completions and other AI-driven tasks.
 */
export interface RAGConfig<TDatabase extends AnyDatabase, TAi extends AnyAI> {
  database: TDatabase;
  ai: TAi;
}

/**
 * Class representing a RAG (Retrieve and Generate) system, integrating with a database and AI functionalities to manage and generate chats.
 *
 * @typeParam TDatabase - The type of the database, which extends `AnyDatabase`.
 * @typeParam TAi - The type of AI functionalities integrated with the RAG instance, which extends `AnyAI`.
 *
 * @property {TDatabase} _database - The database instance used for storing and retrieving chat data.
 * @property {TAi} _ai - The AI instance used for generating chat completions and other AI-driven tasks.
 */
export class RAG<TDatabase extends AnyDatabase = AnyDatabase, TAi extends AnyAI = AnyAI> {
  private _database: TDatabase;
  private _ai: TAi;

  constructor(config: RAGConfig<TDatabase, TAi>) {
    this._database = config.database;
    this._ai = config.ai;
  }

  /**
   * Retrieves the available models from the AI instance.
   *
   * @returns {Promise<string[]>} A promise that resolves to an array of model names available in the AI instance.
   */
  getModels() {
    return this._ai.chatCompletions.getModels();
  }

  /**
   * Creates a new chat instance and optionally stores it in the database.
   *
   * @typeParam TConfig - The configuration object for creating the chat.
   *
   * @param {TConfig} [config] - The configuration object for the chat.
   *
   * @returns {Promise<Chat<TDatabase, TAi, TConfig["tools"]>>} A promise that resolves to the created `Chat` instance.
   */
  createChat<TConfig extends CreateChatConfig>(config?: TConfig): Promise<Chat<TDatabase, TAi, TConfig["tools"]>> {
    return Chat.create(this._database, this._ai, config);
  }

  /**
   * Selects chat instances from the database based on the provided configuration and arguments.
   *
   * @typeParam TConfig - The configuration object for selecting chats.
   * @typeParam TSelectArgs - The parameters passed to the `select` method of the `Table` class.
   *
   * @param {TConfig} [config] - The configuration object for selecting chats.
   * @param {...TSelectArgs} selectArgs - The arguments defining the filters and options for selecting chats.
   *
   * @returns {Promise<Chat<TDatabase, TAi, TConfig["tools"]>[]>} A promise that resolves to an array of `Chat` instances representing the selected chats.
   */
  async findChats<TConfig extends { tableName?: string; tools?: AnyChatCompletionTool[] }>(
    config?: TConfig,
    findParams?: QueryBuilderParams<ChatsTable, InferDatabaseType<TDatabase>>,
  ): Promise<Chat<TDatabase, TAi, TConfig["tools"]>[]> {
    const rows = await this._database.table<ChatsTable>(config?.tableName || "chats").find(findParams);
    return rows.map(
      (row) =>
        new Chat<TDatabase, TAi, TConfig["tools"]>(
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

  /**
   * Deletes chat instances from the database based on the provided arguments.
   *
   * @param {...any[]} args - The arguments defining the filters and options for deleting chats.
   *
   * @returns {Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]>} A promise that resolves when the delete operation is complete.
   */
  deleteChats(
    ...args: Parameters<typeof Chat.delete> extends [any, ...infer Rest] ? Rest : never
  ): Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]> {
    return Chat.delete(this._database, ...args);
  }
}
