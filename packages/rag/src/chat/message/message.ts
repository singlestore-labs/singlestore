import type { AnyAI, ChatCompletionMessage } from "@singlestore/ai";
import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

export interface ChatMessageSchema {
  sessionID: number;
  id: number;
  role: ChatCompletionMessage["role"];
  content: Extract<ChatCompletionMessage["content"], string>;
  createdAt: string;
}

export interface ChatMessageTable extends ChatMessageSchema {}

export class ChatMessage {
  constructor(
    private _database: AnyDatabase,
    private _tableName: TableName,
    public sessionID: ChatMessageSchema["sessionID"] | undefined,
    public id: ChatMessageSchema["id"] | undefined,
    public role: ChatMessageSchema["role"],
    public content: ChatMessageSchema["content"],
    public createdAt: ChatMessageSchema["createdAt"] | undefined,
  ) {}

  static async update(
    database: AnyDatabase,
    tableName: TableName,
    ...args: Parameters<Table<TableName, ChatMessageTable, DatabaseType, AnyAI>["update"]>
  ) {
    return database.table.use<TableName, ChatMessageTable>(tableName).update(...args);
  }

  static async delete(
    database: AnyDatabase,
    tableName: TableName,
    ...args: Parameters<Table<TableName, ChatMessageTable, DatabaseType, AnyAI>["delete"]>
  ) {
    return database.table.use<TableName, ChatMessageTable>(tableName).delete(...args);
  }

  async update(...[values]: Parameters<typeof ChatMessage.update> extends [any, any, ...infer Rest, any] ? Rest : never) {
    const result = await ChatMessage.update(this._database, this._tableName, values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  async delete() {
    return ChatMessage.delete(this._database, this._tableName, { id: this.id });
  }
}
