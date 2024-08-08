import type { AI, ChatCompletionOptions } from "@singlestore/ai";
import type { WorkspaceDatabase } from "@singlestore/client";
import { ChatMessage } from "./message";
import type { Chat } from ".";

export interface ChatSessionConfig
  extends Pick<ChatSession, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {}

export interface ChatSessionsTable {
  columns: Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">;
}

export class ChatSession<T extends WorkspaceDatabase = WorkspaceDatabase> {
  constructor(
    private _database: T,
    private _ai: AI,
    public id: number | undefined,
    public createdAt: string | undefined,
    public chatId: Chat["id"],
    public name: string,
    public systemRole: ChatCompletionOptions["systemRole"],
    public store: ChatMessage["store"],
    public tableName: string,
    public messagesTableName: ChatMessage["tableName"],
  ) {}

  static createTable(database: WorkspaceDatabase, name: ChatSession["tableName"]) {
    return database.createTable<ChatSessionsTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true },
        createdAt: { type: "DATETIME", default: "CURRENT_TIMESTAMP()" },
        chatId: { type: "bigint" },
        name: { type: "varchar(128)" },
      },
      clauses: ["KEY(id)", "SHARD KEY (name)", `CONSTRAINT ${name}_name_uk UNIQUE (name)`],
    });
  }

  static async create<T extends WorkspaceDatabase>(database: T, ai: AI, config?: Partial<ChatSessionConfig>) {
    const createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 19);

    const _config = Object.assign(
      {
        chatId: undefined,
        name: createdAt,
        systemRole: "You are a helpfull assistant",
        store: true,
        tableName: "chat_sessions",
        messagesTableName: "chat_messages",
      } satisfies ChatSessionConfig,
      config,
    );

    const { chatId, name, systemRole, store, tableName, messagesTableName } = _config;
    let id: ChatSession["id"];

    if (store) {
      const [rows] = await database.table<ChatSessionsTable>(tableName).insert({ createdAt, name, chatId });
      id = rows?.[0].insertId;
    }

    return new ChatSession(database, ai, id, createdAt, chatId, name, systemRole, store, tableName, messagesTableName);
  }

  createMessage(role: ChatMessage["role"], content: ChatMessage["content"]) {
    return ChatMessage.create(this._database, {
      sessionId: this.id,
      role,
      content,
      store: this.store,
      tableName: this.messagesTableName,
    });
  }
}
