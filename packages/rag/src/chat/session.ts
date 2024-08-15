import type { AI, ChatCompletionStream, CreateChatCompletionResult } from "@singlestore/ai";
import type { Database, DatabaseType, Table } from "@singlestore/client";

import { ChatMessage, type ChatMessagesTable } from "./message";

export interface ChatSessionConfig
  extends Pick<ChatSession, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {}

export interface ChatSessionsTable {
  columns: Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">;
}

export class ChatSession<T extends DatabaseType = DatabaseType, U extends AI | undefined = undefined, K extends AI = AI> {
  constructor(
    public _database: Database<T, U>,
    public _ai: K,
    public id: number | undefined,
    public createdAt: string | undefined,
    public chatId: number | undefined,
    public name: string,
    public systemRole: string,
    public store: ChatMessage<T>["store"],
    public tableName: string,
    public messagesTableName: ChatMessage<T>["tableName"],
  ) {}

  static createTable<
    T extends DatabaseType = DatabaseType,
    U extends AI | undefined = undefined,
    K extends ChatSession["tableName"] = string,
  >(database: Database<T, U>, name: K) {
    return database.createTable<ChatSessionsTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        chatId: { type: "bigint" },
        name: { type: "varchar(128)" },
      },
    });
  }

  static async create<
    T extends DatabaseType = DatabaseType,
    U extends AI | undefined = undefined,
    K extends AI = AI,
    C extends Partial<ChatSessionConfig> | undefined = undefined,
  >(database: Database<T, U>, ai: K, config?: C) {
    const createdAt: ChatSession["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

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

  static async delete(
    database: Database<any, any>,
    tableName: ChatSession["tableName"],
    messagesTableName: ChatSession["messagesTableName"],
    filters?: Parameters<Table<ChatSessionsTable>["delete"]>[0],
  ) {
    const table = database.table<ChatSessionsTable>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatMessage.delete(database, messagesTableName, { sessionId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  async update(values: Parameters<Table<ChatSessionsTable>["update"]>[0]) {
    const result = await this._database.table<ChatSessionsTable>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete() {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { id: this.id });
  }

  createMessage<T extends ChatMessage["role"], U extends ChatMessage["content"]>(role: T, content: U) {
    return ChatMessage.create(this._database, {
      sessionId: this.id,
      role,
      content,
      store: this.store,
      tableName: this.messagesTableName,
    });
  }

  async selectMessages<T extends Parameters<Table<ChatMessagesTable>["select"]>>(...args: T) {
    const rows = await this._database.table<ChatMessagesTable>(this.messagesTableName).select(...args);

    return rows.map((row) => {
      return new ChatMessage(
        this._database,
        row.id,
        row.createdAt,
        row.sessionId,
        row.role,
        row.content,
        this.store,
        this.messagesTableName,
      );
    });
  }

  deleteMessages(filters: Parameters<typeof ChatMessage.delete>[2] = { sessionId: this.id }) {
    return ChatMessage.delete(this._database, this.messagesTableName, filters);
  }

  async createChatCompletion<T extends Exclude<Parameters<K["chatCompletions"]["create"]>[1], undefined>>(
    prompt: string,
    options?: T,
  ): Promise<CreateChatCompletionResult<T>> {
    const [, response] = await Promise.all([
      this.createMessage("user", prompt),
      this._ai.chatCompletions.create(prompt, options),
    ]);

    const handleResponseContent = (content: string) => this.createMessage("assistant", content);

    if (typeof response === "string") {
      await handleResponseContent(response);
      return response as CreateChatCompletionResult<T>;
    }

    return (async function* (): ChatCompletionStream {
      let content = "";

      for await (const chunk of response as ChatCompletionStream) {
        content += chunk;
        yield chunk;
      }

      await handleResponseContent(content);
    })() as CreateChatCompletionResult<T>;
  }
}
