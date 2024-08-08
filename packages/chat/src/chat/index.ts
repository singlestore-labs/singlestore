import { nanoid } from "nanoid";

import type { AI, ChatCompletionOptions } from "@singlestore/ai";
import type { ResultSetHeader, WorkspaceDatabase } from "@singlestore/client";
import { ChatSession } from "./session";

export interface ChatConfig {
  name: string;
  systemRole: ChatCompletionOptions["systemRole"];
  store: boolean;
  tableName: string;
  sessionsTableName: string;
  messagesTableName: string;
}

export interface ChatsTable {
  columns: ChatConfig & {
    id: number;
    createdAt: string;
  };
}

export class Chat<T extends WorkspaceDatabase = WorkspaceDatabase, U extends ChatConfig = ChatConfig> {
  name;
  systemRole;
  store;
  tableName;
  sessionsTableName;
  messagesTableName;

  constructor(
    private _database: T,
    private _ai: AI,
    public id: ChatsTable["columns"]["id"] | undefined,
    public createdAt: ChatsTable["columns"]["createdAt"] | undefined,
    config: U,
  ) {
    this.name = config.name;
    this.systemRole = config.systemRole;
    this.store = config.store;
    this.tableName = config.tableName;
    this.sessionsTableName = config.sessionsTableName;
    this.messagesTableName = config.messagesTableName;
  }

  private static _createTable(database: WorkspaceDatabase, name: string) {
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

  static async create<T extends WorkspaceDatabase, U extends ChatConfig>(database: T, ai: AI, config?: Partial<U>) {
    let id: Chat["id"];
    let createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 19);

    const _config = Object.assign(
      {
        name: nanoid(),
        systemRole: "You are a helpfull assistant",
        store: true,
        tableName: "chats",
        sessionsTableName: "chat_sessions",
        messagesTableName: "chat_messages",
      } satisfies ChatConfig,
      config,
    );

    if (_config.store) {
      const [chatsTable] = await Promise.all([
        Chat._createTable(database, _config.tableName),
        ChatSession.createTable(database, _config.sessionsTableName),
      ]);
      const insertedChat = await chatsTable.insert({ ..._config, createdAt });
      id = insertedChat[0]?.[0].insertId;
    }

    return new Chat(database, ai, id, createdAt, _config);
  }

  static delete(database: WorkspaceDatabase, tableName: Chat["tableName"], value: Chat["id"] | Chat["name"]) {
    return database.query<[ResultSetHeader]>(`DELETE FROM ${tableName} WHERE id = ${value} OR name = '${value}'`);
  }

  delete() {
    return Chat.delete(this._database, this.tableName, this.id || this.name);
  }

  createSession(name: ChatSession["name"] = nanoid()) {
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
