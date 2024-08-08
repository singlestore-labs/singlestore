import type { AI, ChatCompletionCreateOptions } from "@singlestore/ai";
import type { WorkspaceDatabase } from "@singlestore/client";
import { ChatMessage, type ChatMessagesTable } from "./message";
import type { Chat } from ".";

export interface ChatSessionConfig
  extends Pick<ChatSession, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {}

export interface ChatSessionsTable {
  columns: Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">;
}

export class ChatSession<T extends WorkspaceDatabase = WorkspaceDatabase, U extends AI = AI> {
  constructor(
    private _database: T,
    private _ai: U,
    public id: number | undefined,
    public createdAt: string | undefined,
    public chatId: Chat["id"],
    public name: string,
    public systemRole: ChatCompletionCreateOptions["systemRole"],
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

  static async create<T extends WorkspaceDatabase, U extends AI = AI>(database: T, ai: U, config?: Partial<ChatSessionConfig>) {
    const createdAt: ChatSession["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 19);

    const _config: ChatSessionConfig = {
      chatId: config?.chatId ?? undefined,
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "You are a helpfull assistant",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
    };

    const { chatId, name, systemRole, store, tableName, messagesTableName } = _config;
    let id: ChatSession["id"];

    if (store) {
      const [rows] = await database.table<ChatSessionsTable>(tableName).insert({ createdAt, name, chatId });
      id = rows?.[0].insertId;
    }

    return new ChatSession(database, ai, id, createdAt, chatId, name, systemRole, store, tableName, messagesTableName);
  }

  static delete(database: WorkspaceDatabase, tableName: ChatSession["tableName"], id: ChatSession["id"]) {
    return database.table<ChatSessionsTable>(tableName).delete({ id });
  }

  delete() {
    return ChatSession.delete(this._database, this.tableName, this.id);
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

  deleteMessage(id: ChatMessage["id"]) {
    return ChatMessage.delete(this._database, this.messagesTableName, id);
  }
}
