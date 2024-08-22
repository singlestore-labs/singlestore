import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, ResultSetHeader, Table } from "@singlestore/client";

import { ChatMessage } from "./message";
import { ChatSession, type ChatSessionsTable } from "./session";

/**
 * Interface for configuring a `Chat` instance.
 *
 * This interface is a subset of the `Chat` class properties, excluding the `id`, `createdAt`, and `_database` fields.
 *
 * @property {string} name - The name of the chat.
 * @property {string} systemRole - The system role for the chat session.
 * @property {boolean} store - Whether to store the chat and its sessions in the database.
 * @property {string} tableName - The name of the table where the chat is stored.
 * @property {string} sessionsTableName - The name of the table where the chat sessions are stored.
 * @property {string} messagesTableName - The name of the table where the session's messages are stored.
 * @property {AnyChatCompletionTool[]} tools - The tools available in the chat session.
 */
export interface ChatConfig
  extends Pick<Chat, "name" | "systemRole" | "store" | "tableName" | "sessionsTableName" | "messagesTableName"> {
  tools: AnyChatCompletionTool[];
}

/**
 * Interface representing the schema of the chats table.
 *
 * @property {Pick<Chat, "id" | "createdAt">} columns - The columns of the chats table.
 * @property {Omit<ChatConfig, "tools">} columns - The columns that correspond to the chat configuration.
 */
export interface ChatsTable {
  columns: Pick<Chat, "id" | "createdAt"> & Omit<ChatConfig, "tools">;
}

/**
 * Type alias for partial configuration of a `Chat`.
 */
export type CreateChatConfig = Partial<ChatConfig>;

/**
 * Class representing a chat, providing methods to manage the chat, its sessions, and messages in the database.
 *
 * @typeParam T - The type of the database, which extends `AnyDatabase`.
 * @typeParam U - The type of AI functionalities integrated with the chat, which extends `AnyAI`.
 * @typeParam K - The type of tools available in the chat, which can be `undefined`.
 *
 * @property {T} _database - The database instance where the chat and its sessions are stored.
 * @property {U} _ai - The AI instance used in the chat.
 * @property {K} _tools - The tools available in the chat.
 * @property {number | undefined} id - The unique identifier of the chat.
 * @property {string | undefined} createdAt - The timestamp when the chat was created.
 * @property {string} name - The name of the chat.
 * @property {string} systemRole - The system role for the chat session.
 * @property {boolean} store - Whether the chat and its sessions are stored in the database.
 * @property {string} tableName - The name of the table where the chat is stored.
 * @property {string} sessionsTableName - The name of the table where the chat sessions are stored.
 * @property {string} messagesTableName - The name of the table where the session's messages are stored.
 */
export class Chat<
  T extends AnyDatabase = AnyDatabase,
  U extends AnyAI = AnyAI,
  K extends AnyChatCompletionTool[] | undefined = undefined,
> {
  constructor(
    private _database: T,
    private _ai: U,
    private _tools: K,
    public id: number | undefined,
    public createdAt: string | undefined,
    public name: string,
    public systemRole: ChatSession<T>["systemRole"],
    public store: ChatSession<T>["store"],
    public tableName: string,
    public sessionsTableName: ChatSession<T>["tableName"],
    public messagesTableName: ChatSession<T>["messagesTableName"],
  ) {}

  /**
   * Creates a table to store chats.
   *
   * @typeParam T - The type of the database.
   * @typeParam U - The name of the table to be created.
   *
   * @param {T} database - The database instance where the table will be created.
   * @param {U} name - The name of the table.
   *
   * @returns {Promise<Table<ChatsTable>>} A promise that resolves to the created table instance.
   */
  private static _createTable<T extends AnyDatabase, U extends Chat["tableName"]>(
    database: T,
    name: U,
  ): Promise<Table<ChatsTable>> {
    return database.createTable<ChatsTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        name: { type: "varchar(128)", nullable: false },
        systemRole: { type: "text" },
        store: { type: "bool" },
        tableName: { type: "varchar(128)", nullable: false, default: "'chats'" },
        sessionsTableName: { type: "varchar(128)", nullable: false, default: "'chat_sessions'" },
        messagesTableName: { type: "varchar(128)", nullable: false, default: "'chat_messages'" },
      },
    });
  }

  /**
   * Creates a new chat instance and optionally stores it in the database.
   *
   * @typeParam T - The type of the database.
   * @typeParam U - The type of AI functionalities integrated with the chat.
   * @typeParam K - The configuration object for the chat.
   *
   * @param {T} database - The database instance where the chat may be stored.
   * @param {U} ai - The AI instance used in the chat.
   * @param {K} [config] - The configuration object for the chat.
   *
   * @returns {Promise<Chat<T, U, K["tools"]>>} A promise that resolves to the created `Chat` instance.
   */
  static async create<T extends AnyDatabase, U extends AnyAI, K extends CreateChatConfig>(
    database: T,
    ai: U,
    config?: K,
  ): Promise<Chat<T, U, K["tools"]>> {
    const createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatConfig = {
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chats",
      sessionsTableName: config?.sessionsTableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
      tools: config?.tools || [],
    };

    let id: Chat["id"];

    if (_config.store) {
      const [chatsTable] = await Promise.all([
        Chat._createTable(database, _config.tableName),
        ChatSession.createTable(database, _config.sessionsTableName),
        ChatMessage.createTable(database, _config.messagesTableName),
      ]);

      const [rows] = await chatsTable.insert({
        createdAt,
        name: _config.name,
        systemRole: _config.systemRole,
        store: _config.store,
        tableName: _config.tableName,
        sessionsTableName: _config.sessionsTableName,
        messagesTableName: _config.messagesTableName,
      });

      id = rows?.[0].insertId;
    }

    return new Chat<T, U, K["tools"]>(
      database,
      ai,
      _config.tools,
      id,
      createdAt,
      _config.name,
      _config.systemRole,
      _config.store,
      _config.tableName,
      _config.sessionsTableName,
      _config.messagesTableName,
    );
  }

  /**
   * Deletes chats and their associated sessions and messages from the database based on the provided filters.
   *
   * @param {AnyDatabase} database - The database instance where the chats are stored.
   * @param {Chat["tableName"]} tableName - The name of the table where the chats are stored.
   * @param {Chat["sessionsTableName"]} sessionsTable - The name of the table where the chat sessions are stored.
   * @param {Chat["messagesTableName"]} messagesTableName - The name of the table where the session's messages are stored.
   * @param {Parameters<Table<ChatsTable>["delete"]>[0]} [filters] - The filters to apply to the delete operation.
   *
   * @returns {Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]>} A promise that resolves when the delete operation is complete.
   */
  static async delete(
    database: AnyDatabase,
    tableName: Chat["tableName"],
    sessionsTable: Chat["sessionsTableName"],
    messagesTableName: Chat["messagesTableName"],
    filters?: Parameters<Table<ChatsTable>["delete"]>[0],
  ): Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]> {
    const table = database.table<ChatsTable>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatSession.delete(database, sessionsTable, messagesTableName, { chatId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  /**
   * Updates the current chat instance in the database with the specified values.
   *
   * @param {Parameters<Table<ChatsTable>["update"]>[0]} values - The values to update in the chat.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the update operation is complete.
   */
  async update(values: Parameters<Table<ChatsTable>["update"]>[0]): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._database.table<ChatsTable>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  /**
   * Deletes the current chat instance and its associated sessions and messages from the database.
   *
   * @returns {Promise<any[]>} A promise that resolves when the delete operation is complete.
   */
  delete(): Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]> {
    return Chat.delete(this._database, this.tableName, this.sessionsTableName, this.messagesTableName, { id: this.id });
  }

  /**
   * Creates a new chat session within the current chat and optionally stores it in the database.
   *
   * @typeParam V - The name of the session.
   *
   * @param {V} [name] - The name of the session.
   *
   * @returns {Promise<ChatSession<T, U, K>>} A promise that resolves to the created `ChatSession` instance.
   */
  createSession<V extends ChatSession["name"]>(name?: V): Promise<ChatSession<T, U, K>> {
    return ChatSession.create(this._database, this._ai, {
      chatId: this.id,
      name,
      systemRole: this.systemRole,
      store: this.store,
      tableName: this.sessionsTableName,
      messagesTableName: this.messagesTableName,
      tools: this._tools,
    });
  }

  /**
   * Selects chat sessions from the current chat based on the provided filters and options.
   *
   * @typeParam V - The parameters passed to the `select` method of the `Table` class.
   *
   * @param {...V} args - The arguments defining the filters and options for selecting sessions.
   *
   * @returns {Promise<ChatSession<T, U, K>[]>} A promise that resolves to an array of `ChatSession` instances representing the selected sessions.
   */
  async selectSessions<V extends Parameters<Table<ChatSessionsTable>["select"]>>(...args: V): Promise<ChatSession<T, U, K>[]> {
    const rows = await this._database.table<ChatSessionsTable>(this.sessionsTableName).select(...args);

    return rows.map(
      (row) =>
        new ChatSession(
          this._database,
          this._ai,
          this._tools,
          row.id,
          row.createdAt,
          row.chatId,
          row.name,
          this.systemRole,
          this.store,
          this.sessionsTableName,
          this.messagesTableName,
        ),
    );
  }

  /**
   * Deletes chat sessions from the current chat based on the provided filters.
   *
   * @param {Parameters<typeof ChatSession.delete>[3]} [filters] - The filters to apply to the delete operation. Defaults to deleting sessions from the current chat.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]][]>} A promise that resolves when the delete operation is complete.
   */
  deleteSessions(
    filters: Parameters<typeof ChatSession.delete>[3] = { chatId: this.id },
  ): Promise<[ResultSetHeader, FieldPacket[]][]> {
    return ChatSession.delete(this._database, this.sessionsTableName, this.messagesTableName, filters);
  }
}
