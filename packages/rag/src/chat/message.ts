import type { AI, ChatCompletionMessage } from "@singlestore/ai";
import type { Database, DatabaseType, Table } from "@singlestore/client";

export interface ChatMessageConfig extends Pick<ChatMessage, "sessionId" | "role" | "content" | "store" | "tableName"> {}

export interface ChatMessagesTable {
  columns: Pick<ChatMessage, "id" | "createdAt" | "sessionId" | "role" | "content">;
}

export class ChatMessage<T extends DatabaseType = DatabaseType, U extends AI | undefined = undefined> {
  constructor(
    private _database: Database<T, U>,
    public id: number | undefined,
    public createdAt: string | undefined,
    public sessionId: number | undefined,
    public role: ChatCompletionMessage["role"],
    public content: ChatCompletionMessage["content"],
    public store: boolean,
    public tableName: string,
  ) {}

  static createTable<
    T extends DatabaseType = DatabaseType,
    U extends AI | undefined = undefined,
    C extends ChatMessage["tableName"] = string,
  >(database: Database<T, U>, name: C) {
    return database.createTable<ChatMessagesTable>({
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

  static async create<
    T extends DatabaseType = DatabaseType,
    U extends AI | undefined = undefined,
    K extends ChatMessageConfig = ChatMessageConfig,
  >(database: Database<T, U>, config: K) {
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
    database: Database<any, any>,
    tableName: ChatMessage["tableName"],
    filters?: Parameters<Table<ChatMessagesTable>["delete"]>[0],
  ) {
    return database.table<ChatMessagesTable>(tableName).delete(filters);
  }

  async update(values: Parameters<Table<ChatMessagesTable>["update"]>[0]) {
    const result = await this._database.table<ChatMessagesTable>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete() {
    return ChatMessage.delete(this._database, this.tableName, { id: this.id });
  }
}
