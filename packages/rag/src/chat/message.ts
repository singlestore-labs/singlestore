import type { AnyAI } from "@singlestore/ai";
import type { ChatCompletionMessage } from "@singlestore/ai/chat-completions";
import type { ResultSetHeader, FieldPacket } from "@singlestore/client";
import type { AnyDatabase, InferDatabaseType } from "@singlestore/client/database";
import type { TableName, Table } from "@singlestore/client/table";

export interface ChatMessageConfig extends Pick<ChatMessage, "sessionId" | "role" | "content" | "store" | "tableName"> {}

export interface ChatMessagesTable extends Pick<ChatMessage, "id" | "createdAt" | "sessionId" | "role" | "content"> {}

export class ChatMessage<TDatabase extends AnyDatabase = AnyDatabase, TTableName extends TableName = TableName> {
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

  static createTable<TDatabase extends AnyDatabase, TName extends TableName>(
    database: TDatabase,
    name: TName,
  ): Promise<Table<TName, ChatMessagesTable, InferDatabaseType<TDatabase>, AnyAI>> {
    return database.table.create<TName, ChatMessagesTable>({
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

  static async create<TDatabase extends AnyDatabase, TConfig extends ChatMessageConfig>(
    database: TDatabase,
    config: TConfig,
  ): Promise<ChatMessage<TDatabase, TConfig["tableName"]>> {
    const { sessionId, role, content, store, tableName } = config;
    const createdAt: ChatMessage["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);
    let id: ChatMessage["id"];

    if (store) {
      const [rows] = await database.table
        .use<TConfig["tableName"], ChatMessagesTable>(tableName)
        .insert({ createdAt, sessionId, role, content });
      id = rows?.[0].insertId;
    }

    return new ChatMessage(database, id, createdAt, sessionId, role, content, store, tableName);
  }

  static delete(
    database: AnyDatabase,
    tableName: ChatMessage["tableName"],
    where?: Parameters<Table<ChatMessage["tableName"], ChatMessagesTable, InferDatabaseType<AnyDatabase>, AnyAI>["delete"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return database.table.use<ChatMessage["tableName"], ChatMessagesTable>(tableName).delete(where);
  }

  async update(
    values: Parameters<Table<TTableName, ChatMessagesTable, InferDatabaseType<TDatabase>, AnyAI>["update"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._database.table
      .use<TTableName, ChatMessagesTable>(this.tableName)
      .update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return ChatMessage.delete(this._database, this.tableName, { id: this.id });
  }
}
