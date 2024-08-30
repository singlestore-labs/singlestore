import type {
  AnyAI,
  AnyChatCompletionTool,
  ChatCompletionMessage,
  ChatCompletionStream,
  CreateChatCompletionParams,
  CreateChatCompletionResult,
  MergeChatCompletionTools,
} from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, InferDatabaseType, ResultSetHeader, Table } from "@singlestore/client";

import { ChatMessage, type ChatMessagesTable } from "./message";

export interface ChatSessionConfig
  extends Pick<ChatSession, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {
  tools: AnyChatCompletionTool[];
}

export interface ChatSessionsTable<TName extends string = string> {
  name: TName;
  columns: Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">;
}

type ExtractStreamParam<T> = T extends { stream: infer S } ? (S extends boolean | undefined ? S : undefined) : undefined;

export class ChatSession<
  TDatabase extends AnyDatabase = AnyDatabase,
  TAi extends AnyAI = AnyAI,
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined = undefined,
  TTableName extends string = string,
  TMessagesTableName extends string = string,
> {
  constructor(
    private _database: TDatabase,
    private _ai: TAi,
    private _tools: TChatCompletionTool,
    public id: number | undefined,
    public createdAt: string | undefined,
    public chatId: number | undefined,
    public name: string,
    public systemRole: string,
    public store: ChatMessage<TDatabase>["store"],
    public tableName: TTableName,
    public messagesTableName: TMessagesTableName,
  ) {}

  static createTable<TDatabase extends AnyDatabase, TName extends ChatSession["tableName"]>(
    database: TDatabase,
    name: TName,
  ): Promise<Table<ChatSessionsTable<TName>, InferDatabaseType<TDatabase>>> {
    return database.createTable<ChatSessionsTable<TName>>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        chatId: { type: "bigint" },
        name: { type: "varchar(128)" },
      },
    });
  }

  static async create<TDatabase extends AnyDatabase, TAi extends AnyAI, TConfig extends Partial<ChatSessionConfig>>(
    database: TDatabase,
    ai: TAi,
    config?: TConfig,
  ): Promise<
    ChatSession<
      TDatabase,
      TAi,
      TConfig["tools"],
      TConfig["tableName"] extends string ? TConfig["tableName"] : string,
      TConfig["messagesTableName"] extends string ? TConfig["messagesTableName"] : string
    >
  > {
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

    let id: ChatSession["id"];

    if (_config.store) {
      const [rows] = await database
        .table<ChatSessionsTable>(_config.tableName)
        .insert({ createdAt, name: _config.name, chatId: _config.chatId });
      id = rows?.[0].insertId;
    }

    return new ChatSession(
      database,
      ai,
      _config.tools,
      id,
      createdAt,
      _config.chatId,
      _config.name,
      _config.systemRole,
      _config.store,
      _config.tableName,
      _config.messagesTableName,
    );
  }

  static async delete(
    database: AnyDatabase,
    tableName: ChatSession["tableName"],
    messagesTableName: ChatSession["messagesTableName"],
    where?: Parameters<Table<ChatSessionsTable>["delete"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]][]> {
    const table = database.table<ChatSessionsTable>(tableName);
    const deletedRowIds = await table.find({ select: ["id"], where });

    return Promise.all([
      table.delete(where),
      ChatMessage.delete(database, messagesTableName, { sessionId: { in: deletedRowIds.map(({ id }) => id!) } }),
    ]);
  }

  async update(
    values: Parameters<Table<ChatSessionsTable<TTableName>>["update"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._database.table<ChatSessionsTable, TTableName>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete(): Promise<[ResultSetHeader, FieldPacket[]][]> {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { id: this.id });
  }

  createMessage<TRole extends ChatMessage["role"], TContent extends ChatMessage["content"]>(
    role: TRole,
    content: TContent,
  ): Promise<ChatMessage<TDatabase, TMessagesTableName>> {
    return ChatMessage.create(this._database, {
      sessionId: this.id,
      role,
      content,
      store: this.store,
      tableName: this.messagesTableName,
    });
  }

  async findMessages(
    params?: Parameters<Table<ChatMessagesTable<TMessagesTableName>>["find"]>[0],
  ): Promise<ChatMessage<TDatabase, TMessagesTableName>[]> {
    const rows = await this._database.table(this.messagesTableName).find(params);

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

  deleteMessages(
    filters: Parameters<typeof ChatMessage.delete>[2] = { sessionId: this.id },
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return ChatMessage.delete(this._database, this.messagesTableName, filters);
  }

  async createChatCompletion<
    _TParams extends Parameters<TAi["chatCompletions"]["create"]>[0],
    TParams extends Omit<_TParams, "toolCallHandlers" | "toolCallResultHandlers"> &
      Pick<
        CreateChatCompletionParams<
          ExtractStreamParam<TParams>,
          MergeChatCompletionTools<TChatCompletionTool, _TParams["tools"]>
        >,
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
        loadHistory ? this.findMessages({ orderBy: { createdAt: "asc" } }) : undefined,
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
