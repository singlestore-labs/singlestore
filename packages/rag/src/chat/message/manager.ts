import type { AnyAI } from "@singlestore/ai";
import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

import { ChatMessage, type ChatMessageSchema, type ChatMessageTable } from "./message";

export interface CreateChatMessageValues extends Pick<ChatMessageSchema, "role" | "content"> {}

export class ChatMessageManager {
  constructor(
    private _database: AnyDatabase,
    private _tableName: TableName,
    private _store: boolean,
    public sessionID: ChatMessageSchema["sessionID"] | undefined,
  ) {}

  static async createTable(database: AnyDatabase, name: TableName) {
    return database.table.create<TableName, ChatMessageTable>({
      name,
      columns: {
        sessionID: { type: "bigint", nullable: false },
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        role: { type: "varchar(64)", nullable: false },
        content: { type: "text", nullable: false },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
      },
    });
  }

  async create(values: CreateChatMessageValues) {
    let id;
    const createdAt = new Date().toISOString().replace("T", " ").substring(0, 23);

    if (this._store) {
      const [rows] = await this._database.table
        .use<TableName, ChatMessageTable>(this._tableName)
        .insert({ ...values, sessionID: this.sessionID, createdAt });

      id = rows?.[0].insertId;
    }

    return new ChatMessage(this._database, this._tableName, this.sessionID, id, values.role, values.content, createdAt);
  }

  async find<
    TParams extends Parameters<Table<TableName, Omit<ChatMessageTable, "sessionID">, DatabaseType, AnyAI>["find"]>[0],
    _ReturnType = TParams extends { where: { id: number } } ? ChatMessage | undefined : ChatMessage[],
  >(params?: TParams): Promise<_ReturnType> {
    const rows = await this._database.table
      .use<TableName, ChatMessageTable>(this._tableName)
      .find({ ...params, where: { ...params?.where, sessionID: this.sessionID } });

    const sessions = rows.map((row) => {
      return new ChatMessage(this._database, this._tableName, this.sessionID, row.id, row.role, row.content, row.createdAt);
    });

    if (params?.where?.id) {
      return sessions[0] as _ReturnType;
    }

    return sessions as _ReturnType;
  }

  async update(
    ...[values, where]: Parameters<typeof ChatMessage.update> extends [any, any, infer Values, infer Where]
      ? [Values, Omit<Where, "sessionID">]
      : never
  ) {
    return ChatMessage.update(this._database, this._tableName, values, { ...where, sessionID: this.sessionID });
  }

  async delete(where: Parameters<Table<TableName, Omit<ChatMessageTable, "sessionID">, DatabaseType, AnyAI>["delete"]>[0]) {
    return ChatMessage.delete(this._database, this._tableName, { ...where, sessionID: this.sessionID });
  }
}
