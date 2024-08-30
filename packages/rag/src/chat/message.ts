import type { ChatCompletionMessage } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, InferDatabaseType, ResultSetHeader, Table } from "@singlestore/client";

/**
 * Interface for configuring a `ChatMessage` instance.
 *
 * Represents a subset of the `ChatMessage` class properties, excluding the `id`, `createdAt`, and `_database` fields.
 *
 * @interface ChatMessageConfig
 * @property {number | undefined} sessionId - The session ID associated with the chat message.
 * @property {ChatCompletionMessage["role"]} role - The role of the message sender, such as "system", "user", or "assistant".
 * @property {string} content - The content of the chat message.
 * @property {boolean} store - Whether to store the message in the database.
 * @property {string} tableName - The name of the table where the message is stored.
 */
export interface ChatMessageConfig extends Pick<ChatMessage, "sessionId" | "role" | "content" | "store" | "tableName"> {}

/**
 * Interface representing the schema of the chat messages table.
 *
 * Defines the structure of the chat messages table, including the necessary columns and their types.
 *
 * @typeParam TName The name of the table.
 * @property {TName} name - The name of the table.
 * @property {Pick<ChatMessage, "id" | "createdAt" | "sessionId" | "role" | "content">} columns - The columns of the chat messages table.
 */
export interface ChatMessagesTable<TName extends string = string> {
  name: TName;
  columns: Pick<ChatMessage, "id" | "createdAt" | "sessionId" | "role" | "content">;
}

/**
 * Class representing a chat message, providing methods to manage chat messages in the database.
 *
 * This class supports operations for creating, updating, and deleting chat messages stored in a database table.
 *
 * @typeParam TDatabase The type of the database, which extends `AnyDatabase`.
 * @typeParam TTableName The name of the table where the message is stored.
 *
 * @property {TDatabase} _database - The database instance where the chat message is stored.
 * @property {number | undefined} id - The unique identifier of the chat message.
 * @property {string | undefined} createdAt - The timestamp when the chat message was created.
 * @property {number | undefined} sessionId - The session ID associated with the chat message.
 * @property {ChatCompletionMessage["role"]} role - The role of the message sender, such as "system", "user", or "assistant".
 * @property {string} content - The content of the chat message.
 * @property {boolean} store - Whether the message is stored in the database.
 * @property {TTableName} tableName - The name of the table where the message is stored.
 */
export class ChatMessage<TDatabase extends AnyDatabase = AnyDatabase, TTableName extends string = string> {
  constructor(
    private _database: TDatabase,
    public id: number | undefined,
    public createdAt: string | undefined,
    public sessionId: number | undefined,
    public role: ChatCompletionMessage["role"],
    public content: string,
    public store: boolean,
    public tableName: TTableName,
  ) {}

  /**
   * Creates a table to store chat messages in the database.
   *
   * @typeParam TDatabase The type of the database.
   * @typeParam TName The name of the table to be created.
   *
   * @param {TDatabase} database - The database instance where the table will be created.
   * @param {TName} name - The name of the table.
   *
   * @returns {Promise<Table<ChatMessagesTable<TName>, InferDatabaseType<TDatabase>>>} A promise that resolves to the created table instance.
   * @static
   */
  static createTable<TDatabase extends AnyDatabase, TName extends string>(
    database: TDatabase,
    name: TName,
  ): Promise<Table<ChatMessagesTable<TName>, InferDatabaseType<TDatabase>>> {
    return database.createTable<ChatMessagesTable<TName>>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        sessionId: { type: "bigint", nullable: false },
        role: { type: "varchar(64)", nullable: false },
        content: { type: "text", nullable: false },
      },
    });
  }

  /**
   * Creates a new chat message instance and optionally stores it in the database.
   *
   * @typeParam TDatabase The type of the database.
   * @typeParam TConfig The configuration object for the chat message.
   *
   * @param {TDatabase} database - The database instance where the message may be stored.
   * @param {TConfig} config - The configuration object for the chat message.
   *
   * @returns {Promise<ChatMessage<TDatabase, TConfig["tableName"]>>} A promise that resolves to the created `ChatMessage` instance.
   * @static
   */
  static async create<TDatabase extends AnyDatabase, TConfig extends ChatMessageConfig>(
    database: TDatabase,
    config: TConfig,
  ): Promise<ChatMessage<TDatabase, TConfig["tableName"]>> {
    const { sessionId, role, content, store, tableName } = config;
    const createdAt: ChatMessage["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);
    let id: ChatMessage["id"];

    if (store) {
      const [rows] = await database.table<ChatMessagesTable>(tableName).insert({ createdAt, sessionId, role, content });
      id = rows?.[0].insertId;
    }

    return new ChatMessage(database, id, createdAt, sessionId, role, content, store, tableName);
  }

  /**
   * Deletes chat messages from the specified table based on the provided where clauses.
   *
   * @param {AnyDatabase} database - The database instance where the messages are stored.
   * @param {ChatMessage["tableName"]} tableName - The name of the table where the messages are stored.
   * @param {Parameters<Table<ChatMessagesTable>["delete"]>[0]} [where] - The where clauses to apply to the delete operation.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the delete operation is complete.
   * @static
   */
  static delete(
    database: AnyDatabase,
    tableName: ChatMessage["tableName"],
    where?: Parameters<Table<ChatMessagesTable>["delete"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return database.table<ChatMessagesTable>(tableName).delete(where);
  }

  /**
   * Updates the current chat message instance in the database with the specified values.
   *
   * @param {Parameters<Table<ChatMessagesTable<TTableName>>["update"]>[0]} values - The values to update in the chat message.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the update operation is complete.
   */
  async update(
    values: Parameters<Table<ChatMessagesTable<TTableName>>["update"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._database.table<ChatMessagesTable, TTableName>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  /**
   * Deletes the current chat message instance from the database.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the delete operation is complete.
   */
  delete(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return ChatMessage.delete(this._database, this.tableName, { id: this.id });
  }
}
