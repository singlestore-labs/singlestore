import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, ResultSetHeader, Table } from "@singlestore/client";

import { Chat, type CreateChatConfig, type ChatsTable } from "./chat";

export type * from "./types";
export * from "./chat/tools";

/**
 * Interface representing the configuration for creating a RAG (Retrieve and Generate) instance.
 *
 * @typeParam T - The type of the database, which extends `AnyDatabase`.
 * @typeParam U - The type of AI functionalities integrated with the RAG instance, which extends `AnyAI`.
 *
 * @property {T} database - The database instance used for storing and retrieving chat data.
 * @property {U} ai - The AI instance used for generating chat completions and other AI-driven tasks.
 */
export interface RAGConfig<T extends AnyDatabase, U extends AnyAI> {
  database: T;
  ai: U;
}

/**
 * Class representing a RAG (Retrieve and Generate) system, integrating with a database and AI functionalities to manage and generate chats.
 *
 * @typeParam T - The type of the database, which extends `AnyDatabase`.
 * @typeParam U - The type of AI functionalities integrated with the RAG instance, which extends `AnyAI`.
 *
 * @property {T} _database - The database instance used for storing and retrieving chat data.
 * @property {U} _ai - The AI instance used for generating chat completions and other AI-driven tasks.
 */
export class RAG<T extends AnyDatabase = AnyDatabase, U extends AnyAI = AnyAI> {
  private _database: T;
  private _ai: U;

  constructor(config: RAGConfig<T, U>) {
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
   * @typeParam K - The configuration object for creating the chat.
   *
   * @param {K} [config] - The configuration object for the chat.
   *
   * @returns {Promise<Chat<T, U, K["tools"]>>} A promise that resolves to the created `Chat` instance.
   */
  createChat<K extends CreateChatConfig>(config?: K): Promise<Chat<T, U, K["tools"]>> {
    return Chat.create(this._database, this._ai, config);
  }

  /**
   * Selects chat instances from the database based on the provided configuration and arguments.
   *
   * @typeParam K - The configuration object for selecting chats.
   * @typeParam V - The parameters passed to the `select` method of the `Table` class.
   *
   * @param {K} [config] - The configuration object for selecting chats.
   * @param {...V} args - The arguments defining the filters and options for selecting chats.
   *
   * @returns {Promise<Chat<T, U, K["tools"]>[]>} A promise that resolves to an array of `Chat` instances representing the selected chats.
   */
  async selectChats<
    K extends { tableName?: string; tools?: AnyChatCompletionTool[] },
    V extends Parameters<Table<ChatsTable>["select"]>,
  >(...[config, ...args]: [K?, ...V]): Promise<Chat<T, U, K["tools"]>[]> {
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
