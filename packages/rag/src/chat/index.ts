import type { AI, AIBase } from "@singlestore/ai";
import type { Database, Table } from "@singlestore/client";

import { ChatMessage } from "./message";
import { ChatSession, type ChatSessionsTable } from "./session";

export interface ChatConfig<T extends Database<any> = Database, U extends AIBase = AI>
  extends Pick<Chat<T, U>, "name" | "systemRole" | "store" | "tableName" | "sessionsTableName" | "messagesTableName"> {}

export interface ChatsTable<T extends Database<any> = Database, U extends AIBase = AI> {
  columns: Pick<Chat<T, U>, "id" | "createdAt"> & ChatConfig<T, U>;
}

export type CreateChatConfig<T extends Database<any> = Database, U extends AIBase = AI> = Partial<ChatConfig<T, U>>;

export class Chat<T extends Database<any> = Database, U extends AIBase = AI> {
  constructor(
    private _database: T,
    private _ai: U,
    public id: number | undefined,
    public createdAt: string | undefined,
    public name: string,
    public systemRole: ChatSession<T, U>["systemRole"],
    public store: ChatSession<T, U>["store"],
    public tableName: string,
    public sessionsTableName: ChatSession<T, U>["tableName"],
    public messagesTableName: ChatSession<T, U>["messagesTableName"],
  ) {}

  private static _createTable<T extends Database<any> = Database, U extends AIBase = AI>(
    database: T,
    name: Chat<T, U>["tableName"],
  ) {
    return database.createTable<ChatsTable<T, U>>({
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

  static async create<T extends Database<any> = Database, U extends AIBase = AI>(
    database: T,
    ai: U,
    config?: CreateChatConfig<T, U>,
  ) {
    const createdAt: Chat<T, U>["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatConfig<T, U> = {
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "You are a helpfull assistant",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chats",
      sessionsTableName: config?.sessionsTableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
    };

    const { name, systemRole, store, tableName, sessionsTableName, messagesTableName } = _config;
    let id: Chat<T, U>["id"];

    if (store) {
      const [chatsTable] = await Promise.all([
        Chat._createTable(database, tableName),
        ChatSession.createTable(database, sessionsTableName),
        ChatMessage.createTable(database, messagesTableName),
      ]);

      const [rows] = await chatsTable.insert({
        createdAt,
        name,
        systemRole,
        store,
        tableName,
        sessionsTableName,
        messagesTableName,
      });

      id = rows?.[0].insertId;
    }

    return new Chat(database, ai, id, createdAt, name, systemRole, store, tableName, sessionsTableName, messagesTableName);
  }

  static async delete<T extends Database<any> = Database, U extends AIBase = AI>(
    database: T,
    tableName: Chat<T, U>["tableName"],
    sessionsTable: Chat<T, U>["sessionsTableName"],
    messagesTableName: Chat<T, U>["messagesTableName"],
    filters?: Parameters<Table<ChatsTable<T, U>>["delete"]>[0],
  ) {
    const table = database.table<ChatsTable<T, U>>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatSession.delete(database, sessionsTable, messagesTableName, { chatId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  async update(values: Parameters<Table<ChatsTable<T, U>>["update"]>[0]) {
    const result = await this._database.table<ChatsTable<T, U>>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete() {
    return Chat.delete(this._database, this.tableName, this.sessionsTableName, this.messagesTableName, { id: this.id });
  }

  createSession(name?: ChatSession<T, U>["name"]) {
    return ChatSession.create(this._database, this._ai, {
      chatId: this.id,
      name,
      systemRole: this.systemRole,
      store: this.store,
      tableName: this.sessionsTableName,
      messagesTableName: this.messagesTableName,
    });
  }

  async selectSessions(...args: Parameters<Table<ChatSessionsTable<T, U>>["select"]>) {
    const rows = await this._database.table<ChatSessionsTable<T, U>>(this.sessionsTableName).select(...args);

    return rows.map(
      (row) =>
        new ChatSession(
          this._database,
          this._ai,
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

  deleteSessions(filters: Parameters<typeof ChatSession.delete>[3] = { chatId: this.id }) {
    return ChatSession.delete(this._database, this.sessionsTableName, this.messagesTableName, filters);
  }
}
