import type { AI } from "@singlestore/ai";
import type { ResultSetHeader, WorkspaceDatabase } from "@singlestore/client";
import { ChatSession } from "./session";
import { ChatMessage } from "./message";

export interface ChatConfig
  extends Pick<Chat, "name" | "systemRole" | "store" | "tableName" | "sessionsTableName" | "messagesTableName"> {}

export interface ChatsTable {
  columns: Pick<Chat, "id" | "createdAt"> & ChatConfig;
}

export class Chat<T extends WorkspaceDatabase = WorkspaceDatabase> {
  constructor(
    private _database: T,
    private _ai: AI,
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
        id: { type: "bigint", autoIncrement: true },
        createdAt: { type: "DATETIME", default: "CURRENT_TIMESTAMP()" },
        name: { type: "varchar(128)", nullable: false },
        systemRole: { type: "text" },
        store: { type: "bool" },
        tableName: { type: "varchar(128)", nullable: false, default: "'chats'" },
        sessionsTableName: { type: "varchar(128)", nullable: false, default: "'chat_sessions'" },
        messagesTableName: { type: "varchar(128)", nullable: false, default: "'chat_messages'" },
      },
      clauses: ["KEY(id)", "SHARD KEY (name)", `CONSTRAINT ${name}_name_uk UNIQUE (name)`],
    });
  }

  static async create<T extends WorkspaceDatabase>(database: T, ai: AI, config?: Partial<ChatConfig>) {
    const createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 19);

    const _config = Object.assign(
      {
        name: createdAt,
        systemRole: "You are a helpfull assistant",
        store: true,
        tableName: "chats",
        sessionsTableName: "chat_sessions",
        messagesTableName: "chat_messages",
      } satisfies ChatConfig,
      config,
    );

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

  static delete(database: WorkspaceDatabase, tableName: Chat["tableName"], value: Chat["id"] | Chat["name"]) {
    return database.query<[ResultSetHeader]>(`DELETE FROM ${tableName} WHERE id = ${value} OR name = '${value}'`);
  }

  delete() {
    return Chat.delete(this._database, this.tableName, this.id || this.name);
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
}
