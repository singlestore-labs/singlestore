import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

import { Chat, type ChatTable, type ChatSchema } from "./chat";
import { ChatSessionManager } from "./session";

export interface CreateChatValues<TTools extends AnyChatCompletionTool[] | undefined>
  extends Partial<Omit<ChatSchema<TTools>, "id" | "createdAt">> {}

export interface FindChatConfig<TTools extends AnyChatCompletionTool[] | undefined> {
  tableName?: TableName;
  tools?: TTools;
}

export class ChatManager<TAI extends AnyAI> {
  constructor(
    private _database: AnyDatabase,
    private _ai: TAI,
  ) {}

  private _createTable(name: TableName) {
    return this._database.table.create<TableName, ChatTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        name: { type: "varchar(128)", nullable: false },
        systemRole: { type: "text" },
        tableName: { type: "varchar(128)", nullable: false, default: "'chats'" },
        sessionsTableName: { type: "varchar(128)", nullable: false, default: "'chat_sessions'" },
        messagesTableName: { type: "varchar(128)", nullable: false, default: "'chat_messages'" },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
      },
    });
  }

  async create<TTools extends AnyChatCompletionTool[] | undefined = undefined>(values?: CreateChatValues<TTools>) {
    let id;
    const createdAt = new Date().toISOString().replace("T", " ").substring(0, 23);
    const name = values?.name ?? createdAt;
    const systemRole = values?.systemRole ?? "";
    const store = values?.store ?? false;
    const tableName = values?.tableName ?? "chats";
    const sessionsTableName = values?.sessionsTableName ?? "chat_sessions";
    const messagesTableName = values?.messagesTableName ?? "chat_messages";

    if (store) {
      const [chatsTable] = await Promise.all([
        this._createTable(tableName),
        ChatSessionManager.createTable(this._database, sessionsTableName),
      ]);

      const [rows] = await chatsTable.insert({
        name,
        systemRole,
        tableName,
        sessionsTableName,
        messagesTableName,
        createdAt,
      });

      id = rows?.[0].insertId;
    }

    return new Chat<TAI, TTools>(
      this._database,
      this._ai,
      id,
      name,
      systemRole,
      store,
      tableName,
      sessionsTableName,
      messagesTableName,
      createdAt,
      values?.tools as TTools,
    );
  }

  async find<
    TTools extends AnyChatCompletionTool[] | undefined = undefined,
    TParams extends Parameters<Table<TableName, ChatTable, DatabaseType, TAI>["find"]>[0] = Parameters<
      Table<TableName, ChatTable, DatabaseType, TAI>["find"]
    >[0],
    _ReturnType = TParams extends { where: { id: number } } ? Chat<TAI, TTools> | undefined : Chat<TAI, TTools>[],
  >(config?: FindChatConfig<TTools>, params?: TParams): Promise<_ReturnType> {
    const tableName = config?.tableName ?? "chats";
    const rows = await this._database.table.use<TableName, ChatTable>(tableName).find(params);
    const chats = rows.map((row) => {
      return new Chat(
        this._database,
        this._ai,
        row.id,
        row.name,
        row.systemRole,
        true,
        row.tableName,
        row.sessionsTableName,
        row.messagesTableName,
        row.createdAt,
        config?.tools as TTools,
      );
    });

    if (params?.where?.id) {
      return chats[0] as _ReturnType;
    }

    return chats as _ReturnType;
  }

  async update(...args: Parameters<typeof Chat.update> extends [any, ...infer Rest] ? Rest : never) {
    return Chat.update(this._database, ...args);
  }

  async delete(...args: Parameters<typeof Chat.delete> extends [any, ...infer Rest] ? Rest : never) {
    return Chat.delete(this._database, ...args);
  }
}
