import type { AI, ChatCompletionCreateOptions, ChatCompletionCreateReturnType, ChatCompletionStream } from "@singlestore/ai";
import type { WorkspaceDatabase, WorkspaceTable } from "@singlestore/client";
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
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        chatId: { type: "bigint" },
        name: { type: "varchar(128)" },
      },
    });
  }

  static async create<T extends WorkspaceDatabase, U extends AI = AI>(database: T, ai: U, config?: Partial<ChatSessionConfig>) {
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
    database: WorkspaceDatabase,
    tableName: ChatSession["tableName"],
    messagesTableName: ChatSession["messagesTableName"],
    filters?: Parameters<WorkspaceTable<ChatSessionsTable>["delete"]>[0],
  ) {
    const table = database.table<ChatSessionsTable>(tableName);
    const deletedRowIds = await table.select(filters, { columns: ["id"] });

    return Promise.all([
      table.delete(filters),
      ChatMessage.delete(database, messagesTableName, { sessionId: { in: deletedRowIds.map(({ id }) => id) } }),
    ]);
  }

  async update(data: Parameters<WorkspaceTable<ChatSessionsTable>["update"]>[0]) {
    const result = await this._database.table<ChatSessionsTable>(this.tableName).update(data, { id: this.id });

    for (const [key, value] of Object.entries(data)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete() {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { id: this.id });
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

  async selectMessages(...args: Parameters<WorkspaceTable<ChatMessagesTable>["select"]>) {
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

  async createChatCompletion<T extends Exclude<Parameters<U["chatCompletions"]["create"]>[1], undefined>>(
    prompt: string,
    options?: T,
  ): Promise<ChatCompletionCreateReturnType<T>> {
    const [, response] = await Promise.all([
      this.createMessage("user", prompt),
      this._ai.chatCompletions.create(prompt, options),
    ]);

    const handleResponseContent = async (content: string) => {
      await this.createMessage("assistant", content);
    };

    if (typeof response === "string") {
      await handleResponseContent(response);
      return response as ChatCompletionCreateReturnType<T>;
    }

    return (async function* (): ChatCompletionStream {
      let content = "";

      for await (const chunk of response as ChatCompletionStream) {
        content += chunk;
        yield chunk;
      }

      await handleResponseContent(content);
    })() as ChatCompletionCreateReturnType<T>;
  }
}
