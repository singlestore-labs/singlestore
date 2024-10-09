import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

import { ChatSession, type ChatSessionSchema, type ChatSessionTable } from "./session";

export interface CreateChatSessionValues extends Partial<Pick<ChatSessionSchema, "name">> {}

export class ChatSessionManager<TAI extends AnyAI, TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  constructor(
    private _database: AnyDatabase,
    private _ai: TAI,
    public chatID: ChatSessionSchema["chatID"] | undefined,
    public systemRole: string,
    public store: ChatSessionSchema["store"],
    public tableName: ChatSessionSchema["tableName"],
    public messagesTableName: ChatSessionSchema["messagesTableName"],
    private _tools: TTools,
  ) {}

  static async createTable(database: AnyDatabase, name: TableName) {
    return database.table.create<TableName, ChatSessionTable>({
      name,
      columns: {
        chatID: { type: "bigint" },
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        name: { type: "varchar(128)" },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
      },
    });
  }

  async create(values?: CreateChatSessionValues) {
    let id;
    const createdAt = new Date().toISOString().replace("T", " ").substring(0, 23);
    const name = values?.name ?? createdAt;

    if (this.store) {
      const [rows] = await this._database.table
        .use<TableName, ChatSessionTable>(this.tableName)
        .insert({ chatID: this.chatID, name, createdAt });

      id = rows?.[0].insertId;
    }

    return new ChatSession(
      this._database,
      this._ai,
      this.chatID,
      id,
      name,
      this.systemRole,
      this.store,
      this.tableName,
      this.messagesTableName,
      createdAt,
      this._tools,
    );
  }

  async find<
    TParams extends Parameters<Table<TableName, Omit<ChatSessionTable, "chatID">, DatabaseType, TAI>["find"]>[0],
    _ReturnType = TParams extends { where: { id: number } } ? ChatSession<TAI, TTools> | undefined : ChatSession<TAI, TTools>[],
  >(params?: TParams): Promise<_ReturnType> {
    const rows = await this._database.table
      .use<TableName, ChatSessionTable>(this.tableName)
      .find({ ...(params as any), where: { ...params?.where, chatID: this.chatID } });

    const sessions = rows.map((row) => {
      return new ChatSession(
        this._database,
        this._ai,
        this.chatID,
        row.id,
        row.name,
        this.systemRole,
        this.store,
        this.tableName,
        this.messagesTableName,
        row.createdAt,
        this._tools,
      );
    });

    if (params?.where?.id) {
      return sessions[0] as _ReturnType;
    }

    return sessions as _ReturnType;
  }

  async update(
    ...[values, where]: Parameters<typeof ChatSession.update> extends [any, any, infer Values, infer Where]
      ? [Values, Omit<Where, "chatID">]
      : never
  ) {
    return ChatSession.update(this._database, this.tableName, values, { ...where, chatID: this.chatID });
  }

  async delete(where: Parameters<Table<TableName, Omit<ChatSessionTable, "chatID">, DatabaseType, AnyAI>["delete"]>[0]) {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { ...where, chatID: this.chatID });
  }
}
