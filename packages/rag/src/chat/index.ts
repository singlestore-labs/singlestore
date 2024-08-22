import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, Table } from "@singlestore/client";

import { ChatMessage } from "./message";
import { ChatSession, type ChatSessionsTable } from "./session";

export interface ChatConfig
  extends Pick<Chat, "name" | "systemRole" | "store" | "tableName" | "sessionsTableName" | "messagesTableName"> {
  tools: AnyChatCompletionTool[];
}

export interface ChatsTable {
  columns: Pick<Chat, "id" | "createdAt"> & Omit<ChatConfig, "tools">;
}

export type CreateChatConfig = Partial<ChatConfig>;

export class Chat<
  T extends AnyDatabase = AnyDatabase,
  U extends AnyAI = AnyAI,
  K extends AnyChatCompletionTool[] | undefined = undefined,
> {
  constructor(
    private _database: T,
    private _ai: U,
    private _tools: K,
    public id: number | undefined,
    public createdAt: string | undefined,
    public name: string,
    public systemRole: ChatSession<T>["systemRole"],
    public store: ChatSession<T>["store"],
    public tableName: string,
    public sessionsTableName: ChatSession<T>["tableName"],
    public messagesTableName: ChatSession<T>["messagesTableName"],
  ) {}

  private static _createTable<T extends AnyDatabase, U extends Chat["tableName"]>(database: T, name: U) {
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

  static async create<T extends AnyDatabase, U extends AnyAI, K extends CreateChatConfig>(database: T, ai: U, config?: K) {
    const createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatConfig = {
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chats",
      sessionsTableName: config?.sessionsTableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
      tools: config?.tools || [],
    };

    const { name, systemRole, store, tableName, sessionsTableName, messagesTableName, tools } = _config;
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

    return new Chat<T, U, K["tools"]>(
      database,
      ai,
      tools,
      id,
      createdAt,
      name,
      systemRole,
      store,
      tableName,
      sessionsTableName,
      messagesTableName,
    );
  }

  static async delete(
    database: AnyDatabase,
    tableName: Chat["tableName"],
    sessionsTable: Chat["sessionsTableName"],
    messagesTableName: Chat["messagesTableName"],
    filters?: Parameters<Table<ChatsTable>["delete"]>[0],
  ) {
    const table = database.table<ChatsTable>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatSession.delete(database, sessionsTable, messagesTableName, { chatId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  async update(values: Parameters<Table<ChatsTable>["update"]>[0]) {
    const result = await this._database.table<ChatsTable>(this.tableName).update(values, { id: this.id });

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

  createSession<V extends ChatSession["name"]>(name?: V) {
    return ChatSession.create(this._database, this._ai, {
      chatId: this.id,
      name,
      systemRole: this.systemRole,
      store: this.store,
      tableName: this.sessionsTableName,
      messagesTableName: this.messagesTableName,
      tools: this._tools,
    });
  }

  async selectSessions<V extends Parameters<Table<ChatSessionsTable>["select"]>>(...args: V) {
    const rows = await this._database.table<ChatSessionsTable>(this.sessionsTableName).select(...args);

    return rows.map(
      (row) =>
        new ChatSession(
          this._database,
          this._ai,
          this._tools,
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
