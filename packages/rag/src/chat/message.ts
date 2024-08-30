import type { ChatCompletionMessage } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, InferDatabaseType, ResultSetHeader, Table } from "@singlestore/client";

export interface ChatMessageConfig extends Pick<ChatMessage, "sessionId" | "role" | "content" | "store" | "tableName"> {}

export interface ChatMessagesTable<TName extends string = string> {
  name: TName;
  columns: Pick<ChatMessage, "id" | "createdAt" | "sessionId" | "role" | "content">;
}

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

  static delete(
    database: AnyDatabase,
    tableName: ChatMessage["tableName"],
    where?: Parameters<Table<ChatMessagesTable>["delete"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return database.table<ChatMessagesTable>(tableName).delete(where);
  }

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

  delete(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return ChatMessage.delete(this._database, this.tableName, { id: this.id });
  }
}
