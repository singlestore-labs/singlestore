import type { AI } from "@singlestore/ai";
import type { WorkspaceDatabase, WorkspaceTable } from "@singlestore/client";

import { ChatMessage } from "./message";
import { ChatSession, type ChatSessionsTable } from "./session";

export interface ChatConfig
  extends Pick<Chat, "name" | "systemRole" | "store" | "tableName" | "sessionsTableName" | "messagesTableName"> {}

export interface ChatsTable {
  columns: Pick<Chat, "id" | "createdAt"> & ChatConfig;
}

export class Chat<T extends WorkspaceDatabase = WorkspaceDatabase, U extends AI = AI> {
  constructor(
    private _database: T,
    private _ai: U,
    public id: number | undefined,
    public createdAt: string | undefined,
    public name: string,
    public systemRole: ChatSession["systemRole"],
    public store: ChatSession["store"],
    public tableName: string,
    public sessionsTableName: ChatSession["tableName"],
    public messagesTableName: ChatSession["messagesTableName"],
  ) {}

  private static _createTable(database: WorkspaceDatabase, name: Chat["tableName"]) {
    return database.createTable<ChatsTable>({
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

  static async create<T extends WorkspaceDatabase, U extends AI = AI>(database: T, ai: U, config?: Partial<ChatConfig>) {
    const createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatConfig = {
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "You are a helpfull assistant",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chats",
      sessionsTableName: config?.sessionsTableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
    };

    const { name, systemRole, store, tableName, sessionsTableName, messagesTableName } = _config;
    let id: Chat["id"];

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

  static async delete(
    database: WorkspaceDatabase,
    tableName: Chat["tableName"],
    sessionsTable: Chat["sessionsTableName"],
    messagesTableName: Chat["messagesTableName"],
    filters?: Parameters<WorkspaceTable<ChatsTable>["delete"]>[0],
  ) {
    const table = database.table<ChatsTable>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatSession.delete(database, sessionsTable, messagesTableName, { chatId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  async update(data: Parameters<WorkspaceTable<ChatsTable>["update"]>[0]) {
    const result = await this._database.table<ChatsTable>(this.tableName).update(data, { id: this.id });

    for (const [key, value] of Object.entries(data)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete() {
    return Chat.delete(this._database, this.tableName, this.sessionsTableName, this.messagesTableName, { id: this.id });
  }

  createSession(name?: ChatSession["name"]) {
    return ChatSession.create(this._database, this._ai, {
      chatId: this.id,
      name,
      systemRole: this.systemRole,
      store: this.store,
      tableName: this.sessionsTableName,
      messagesTableName: this.messagesTableName,
    });
  }

  async selectSessions(...args: Parameters<WorkspaceTable<ChatSessionsTable>["select"]>) {
    const rows = await this._database.table<ChatSessionsTable>(this.sessionsTableName).select(...args);
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
