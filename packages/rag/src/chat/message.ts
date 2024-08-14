import type { ChatCompletionMessage } from "@singlestore/ai";
import type { Database, Table } from "@singlestore/client";

export interface ChatMessageConfig<T extends Database<any> = Database>
  extends Pick<ChatMessage<T>, "sessionId" | "role" | "content" | "store" | "tableName"> {}

export interface ChatMessagesTable<T extends Database<any> = Database> {
  columns: Pick<ChatMessage<T>, "id" | "createdAt" | "sessionId" | "role" | "content">;
}

export class ChatMessage<T extends Database<any> = Database> {
  constructor(
    private _database: T,
    public id: number | undefined,
    public createdAt: string | undefined,
    public sessionId: number | undefined,
    public role: ChatCompletionMessage["role"],
    public content: ChatCompletionMessage["content"],
    public store: boolean,
    public tableName: string,
  ) {}

  static createTable<T extends Database<any> = Database>(database: Database, name: ChatMessage<T>["tableName"]) {
    return database.createTable<ChatMessagesTable<T>>({
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

  static async create<T extends Database<any> = Database>(database: T, config: ChatMessageConfig<T>) {
    const { sessionId, role, content, store, tableName } = config;
    const createdAt: ChatMessage<T>["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);
    let id: ChatMessage<T>["id"];

    if (store) {
      const [rows] = await database.table<ChatMessagesTable<T>>(tableName).insert({ createdAt, sessionId, role, content });
      id = rows?.[0].insertId;
    }

    return new ChatMessage(database, id, createdAt, sessionId, role, content, store, tableName);
  }

  static delete<T extends Database<any> = Database>(
    database: T,
    tableName: ChatMessage<T>["tableName"],
    filters?: Parameters<Table<ChatMessagesTable<T>>["delete"]>[0],
  ) {
    return database.table<ChatMessagesTable<T>>(tableName).delete(filters);
  }

  async update(values: Parameters<Table<ChatMessagesTable<T>>["update"]>[0]) {
    const result = await this._database.table<ChatMessagesTable<T>>(this.tableName).update(values, { id: this.id });

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
