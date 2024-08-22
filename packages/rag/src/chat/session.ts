import type {
  AnyAI,
  AnyChatCompletionTool,
  ChatCompletionMessage,
  ChatCompletionStream,
  CreateChatCompletionParams,
  CreateChatCompletionResult,
  MergeChatCompletionTools,
} from "@singlestore/ai";
import type { AnyDatabase, Table } from "@singlestore/client";

import { ChatMessage, type ChatMessagesTable } from "./message";

export interface ChatSessionConfig
  extends Pick<ChatSession, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {
  tools: AnyChatCompletionTool[];
}

export interface ChatSessionsTable {
  columns: Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">;
}

type ExtractStreamParam<T> = T extends { stream: infer S } ? (S extends boolean | undefined ? S : undefined) : undefined;

export class ChatSession<
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
    public chatId: number | undefined,
    public name: string,
    public systemRole: string,
    public store: ChatMessage<T>["store"],
    public tableName: string,
    public messagesTableName: ChatMessage<T>["tableName"],
  ) {}

  static createTable<T extends AnyDatabase, U extends ChatSession["tableName"]>(database: T, name: U) {
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

  static async create<T extends AnyDatabase, U extends AnyAI, K extends Partial<ChatSessionConfig>>(
    database: T,
    ai: U,
    config?: K,
  ) {
    const createdAt: ChatSession["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatSessionConfig = {
      chatId: config?.chatId ?? undefined,
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
      tools: config?.tools || [],
    };

    const { chatId, name, systemRole, store, tableName, messagesTableName, tools } = _config;
    let id: ChatSession["id"];

    if (store) {
      const [rows] = await database.table<ChatSessionsTable>(tableName).insert({ createdAt, name, chatId });
      id = rows?.[0].insertId;
    }

    return new ChatSession<T, U, K["tools"]>(
      database,
      ai,
      tools,
      id,
      createdAt,
      chatId,
      name,
      systemRole,
      store,
      tableName,
      messagesTableName,
    );
  }

  static async delete(
    database: AnyDatabase,
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

  createMessage<V extends ChatMessage["role"], C extends ChatMessage["content"]>(role: V, content: C) {
    return ChatMessage.create(this._database, {
      sessionId: this.id,
      role,
      content,
      store: this.store,
      tableName: this.messagesTableName,
    });
  }

  async selectMessages<V extends Parameters<Table<ChatMessagesTable>["select"]>>(...args: V) {
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

  async createChatCompletion<
    _TParams extends Parameters<U["chatCompletions"]["create"]>[0],
    TParams extends Omit<_TParams, "toolCallHandlers" | "toolCallResultHandlers"> &
      Pick<
        CreateChatCompletionParams<ExtractStreamParam<TParams>, MergeChatCompletionTools<K, _TParams["tools"]>>,
        "toolCallHandlers" | "toolCallResultHandlers"
      > & {
        loadHistory?: boolean;
        loadDatabaseSchema?: boolean;
      },
  >({
    prompt = "",
    loadHistory = this.store,
    loadDatabaseSchema = false,
    messages = [],
    tools = [],
    ...params
  }: TParams): Promise<CreateChatCompletionResult<ExtractStreamParam<TParams>>> {
    let _messages: ChatCompletionMessage[] = [];
    const _tools: AnyChatCompletionTool[] = [...(this._tools || []), ...tools];

    if (loadDatabaseSchema || loadHistory) {
      const [databaseSchema, historyMessages] = await Promise.all([
        loadDatabaseSchema ? this._database.describe() : undefined,
        loadHistory ? this.selectMessages({ orderBy: { createdAt: "asc" } }) : undefined,
      ]);

      if (databaseSchema) {
        _messages.push({ role: "system", content: `The database schema: ${JSON.stringify(databaseSchema)}` });
      }

      if (historyMessages?.length) {
        _messages = [..._messages, ...historyMessages.map((message) => ({ role: message.role, content: message.content }))];
      }
    }

    if (messages?.length) {
      _messages = [..._messages, ...messages];
    }

    const [, response] = await Promise.all([
      this.createMessage("user", prompt),
      this._ai.chatCompletions.create({ ...params, prompt, messages: _messages, tools: _tools }),
    ]);

    const handleResponseContent = (content: string) => this.createMessage("assistant", content);

    if ("content" in response && typeof response.content === "string") {
      await handleResponseContent(response.content);
      return response as CreateChatCompletionResult<ExtractStreamParam<TParams>>;
    }

    return (async function* (): ChatCompletionStream {
      let content = "";

      for await (const chunk of response as ChatCompletionStream) {
        content += chunk.content;
        yield chunk;
      }

      await handleResponseContent(content);
    })() as CreateChatCompletionResult<ExtractStreamParam<TParams>>;
  }
}
