import type { AI, ChatCompletionStream, CreateChatCompletionResult } from "@singlestore/ai";
import type { Database, Table } from "@singlestore/client";

import { ChatMessage, type ChatMessagesTable } from "./message";

export interface ChatSessionConfig<T extends Database, U extends AI>
  extends Pick<ChatSession<T, U>, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {}

export interface ChatSessionsTable<T extends Database, U extends AI> {
  columns: Pick<ChatSession<T, U>, "id" | "createdAt" | "chatId" | "name">;
}

export type CreateChatSessionConfig<T extends Database, U extends AI> = Partial<ChatSessionConfig<T, U>>;

export type DeleteChatSessionFilters<T extends Database, U extends AI> = Parameters<
  Table<ChatSessionsTable<T, U>>["delete"]
>[0];

export type UpdateChatSessionValues<T extends Database, U extends AI> = Parameters<Table<ChatSessionsTable<T, U>>["update"]>[0];

export type SelectMessagesArgs<T extends Database> = Parameters<Table<ChatMessagesTable<T>>["select"]>;

export type DeleteMessagesFilter = Parameters<typeof ChatMessage.delete>[2];

export type CreateChatCompletionOptions<U extends AI> = Exclude<Parameters<U["chatCompletions"]["create"]>[1], undefined>;

export class ChatSession<T extends Database, U extends AI> {
  constructor(
    private _database: T,
    private _ai: U,
    public id: number | undefined,
    public createdAt: string | undefined,
    public chatId: number | undefined,
    public name: string,
    public systemRole: CreateChatCompletionOptions<U>["systemRole"],
    public store: ChatMessage<T>["store"],
    public tableName: string,
    public messagesTableName: ChatMessage<T>["tableName"],
  ) {}

  static createTable<T extends Database, U extends AI>(database: T, name: ChatSession<T, U>["tableName"]) {
    return database.createTable<ChatSessionsTable<T, U>>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        chatId: { type: "bigint" },
        name: { type: "varchar(128)" },
      },
    });
  }

  static async create<T extends Database, U extends AI>(database: T, ai: U, config?: CreateChatSessionConfig<T, U>) {
    const createdAt: ChatSession<T, U>["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatSessionConfig<T, U> = {
      chatId: config?.chatId ?? undefined,
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "You are a helpfull assistant",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
    };

    const { chatId, name, systemRole, store, tableName, messagesTableName } = _config;
    let id: ChatSession<T, U>["id"];

    if (store) {
      const [rows] = await database.table<ChatSessionsTable<T, U>>(tableName).insert({ createdAt, name, chatId });
      id = rows?.[0].insertId;
    }

    return new ChatSession(database, ai, id, createdAt, chatId, name, systemRole, store, tableName, messagesTableName);
  }

  static async delete<T extends Database, U extends AI>(
    database: Database,
    tableName: ChatSession<T, U>["tableName"],
    messagesTableName: ChatSession<T, U>["messagesTableName"],
    filters?: DeleteChatSessionFilters<T, U>,
  ) {
    const table = database.table<ChatSessionsTable<T, U>>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatMessage.delete(database, messagesTableName, { sessionId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  async update(values: UpdateChatSessionValues<T, U>) {
    const result = await this._database.table<ChatSessionsTable<T, U>>(this.tableName).update(values, { id: this.id });

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

  createMessage(role: ChatMessage<T>["role"], content: ChatMessage<T>["content"]) {
    return ChatMessage.create(this._database, {
      sessionId: this.id,
      role,
      content,
      store: this.store,
      tableName: this.messagesTableName,
    });
  }

  async selectMessages(...args: SelectMessagesArgs<T>) {
    const rows = await this._database.table<ChatMessagesTable<T>>(this.messagesTableName).select(...args);
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

  deleteMessages(filters: DeleteMessagesFilter = { sessionId: this.id }) {
    return ChatMessage.delete(this._database, this.messagesTableName, filters);
  }

  async createChatCompletion<T extends CreateChatCompletionOptions<U>>(
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
