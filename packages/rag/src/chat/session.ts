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

/**
 * Interface for configuring a `ChatSession` instance.
 *
 * This interface is a subset of the `ChatSession` class properties, excluding the `id`, `createdAt`, and `_database` fields.
 *
 * @property {number} chatId - The unique identifier for the chat session.
 * @property {string} name - The name of the chat session.
 * @property {string} systemRole - The system role for the chat session.
 * @property {boolean} store - Whether to store the session and its messages in the database.
 * @property {string} tableName - The name of the table where the session is stored.
 * @property {string} messagesTableName - The name of the table where the session's messages are stored.
 * @property {AnyChatCompletionTool[]} tools - The tools available in the chat session.
 */
export interface ChatSessionConfig
  extends Pick<ChatSession, "chatId" | "name" | "systemRole" | "store" | "tableName" | "messagesTableName"> {
  tools: AnyChatCompletionTool[];
}

/**
 * Interface representing the schema of the chat sessions table.
 *
 * @property {Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">} columns - The columns of the chat sessions table.
 */
export interface ChatSessionsTable {
  columns: Pick<ChatSession, "id" | "createdAt" | "chatId" | "name">;
}

/**
 * Type utility to extract the stream parameter from the `CreateChatCompletionParams` type.
 *
 * @typeParam T - The type that may contain the `stream` parameter.
 *
 * If the `stream` parameter exists and is of type `boolean` or `undefined`, it returns the type. Otherwise, it returns `undefined`.
 */
type ExtractStreamParam<T> = T extends { stream: infer S } ? (S extends boolean | undefined ? S : undefined) : undefined;

/**
 * Class representing a chat session, providing methods to manage the session and its messages in the database.
 *
 * @typeParam TDatabase - The type of the database, which extends `AnyDatabase`.
 * @typeParam TAi - The type of AI functionalities integrated with the chat session, which extends `AnyAI`.
 * @typeParam TChatCompletionTool - The type of tools available in the chat session, which can be `undefined`.
 *
 * @property {TDatabase} _database - The database instance where the chat session and its messages are stored.
 * @property {TAi} _ai - The AI instance used in the chat session.
 * @property {TChatCompletionTool} _tools - The tools available in the chat session.
 * @property {number | undefined} id - The unique identifier of the chat session.
 * @property {string | undefined} createdAt - The timestamp when the chat session was created.
 * @property {number | undefined} chatId - The unique identifier for the chat session.
 * @property {string} name - The name of the chat session.
 * @property {string} systemRole - The system role for the chat session.
 * @property {boolean} store - Whether the session and its messages are stored in the database.
 * @property {string} tableName - The name of the table where the session is stored.
 * @property {string} messagesTableName - The name of the table where the session's messages are stored.
 */
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

  /**
   * Creates a table to store chat sessions.
   *
   * @typeParam TDatabase - The type of the database.
   * @typeParam TName - The name of the table to be created.
   *
   * @param {TDatabase} database - The database instance where the table will be created.
   * @param {TName} name - The name of the table.
   *
   * @returns {Promise<Table<ChatSessionsTable>>} A promise that resolves to the created table instance.
   */
  static createTable<TDatabase extends AnyDatabase, TName extends ChatSession["tableName"]>(
    database: TDatabase,
    name: TName,
  ): Promise<Table<TName, ChatSessionsTable>> {
    return database.createTable<TName, ChatSessionsTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        chatId: { type: "bigint" },
        name: { type: "varchar(128)" },
      },
    });
  }

  /**
   * Creates a new chat session instance and optionally stores it in the database.
   *
   * @typeParam TDatabase - The type of the database.
   * @typeParam TAi - The type of AI functionalities integrated with the chat session.
   * @typeParam TConfig - The configuration object for the chat session.
   *
   * @param {TDatabase} database - The database instance where the session may be stored.
   * @param {TAi} ai - The AI instance used in the chat session.
   * @param {TConfig} [config] - The configuration object for the chat session.
   *
   * @returns {Promise<ChatSession<TDatabase, TAi, TConfig["tools"], TConfig["tableName"] extends string ? TConfig["tableName"] : string, TConfig["messagesTableName"] extends string ? TConfig["messagesTableName"] : string>>} A promise that resolves to the created `ChatSession` instance.
   */
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

  /**
   * Deletes chat sessions and their associated messages from the database based on the provided where clauses.
   *
   * @param {AnyDatabase} database - The database instance where the sessions are stored.
   * @param {ChatSession["tableName"]} tableName - The name of the table where the sessions are stored.
   * @param {ChatSession["messagesTableName"]} messagesTableName - The name of the table where the session's messages are stored.
   * @param {Parameters<Table<ChatSessionsTable>["delete"]>[0]} [where] - The where clauses to apply to the delete operation.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]][]>} A promise that resolves when the delete operation is complete.
   */
  static async delete(
    database: AnyDatabase,
    tableName: ChatSession["tableName"],
    messagesTableName: ChatSession["messagesTableName"],
    where?: Parameters<Table<ChatSession["tableName"], ChatSessionsTable>["delete"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]][]> {
    const table = database.table<ChatSessionsTable>(tableName);
    const deletedRowIds = await table.find({ select: ["id"], where });

    return Promise.all([
      table.delete(where),
      ChatMessage.delete(database, messagesTableName, { sessionId: { in: deletedRowIds.map(({ id }) => id!) } }),
    ]);
  }

  /**
   * Updates the current chat session instance in the database with the specified values.
   *
   * @param {Parameters<Table<ChatSessionsTable>["update"]>[0]} values - The values to update in the chat session.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the update operation is complete.
   */
  async update(
    values: Parameters<Table<TTableName, ChatSessionsTable>["update"]>[0],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._database.table<ChatSessionsTable>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  /**
   * Deletes the current chat session instance and its associated messages from the database.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]][]>} A promise that resolves when the delete operation is complete.
   */
  delete(): Promise<[ResultSetHeader, FieldPacket[]][]> {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { id: this.id });
  }

  /**
   * Creates a new chat message within the current session and optionally stores it in the database.
   *
   * @typeParam TRole - The role of the message sender.
   * @typeParam TContent - The content of the chat message.
   *
   * @param {TRole} role - The role of the message sender.
   * @param {TContent} content - The content of the chat message.
   *
   * @returns {Promise<ChatMessage<TDatabase, TMessagesTableName>>} A promise that resolves to the created `ChatMessage` instance.
   */
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

  /**
   * Finds chat messages from the current session based on the provided filters and options.
   *
   * @param {params} params - The parameters defining the filters and options for finding messages.
   *
   * @returns {Promise<ChatMessage<TDatabase, TMessagesTableName>[]>} A promise that resolves to an array of `ChatMessage` instances representing the found messages.
   */
  async findMessages(
    params?: Parameters<Table<TMessagesTableName, ChatMessagesTable, InferDatabaseType<TDatabase>>["find"]>[0],
  ): Promise<ChatMessage<TDatabase, TMessagesTableName>[]> {
    const rows = await this._database.table<ChatMessagesTable>(this.messagesTableName).find(params);

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

  /**
   * Deletes chat messages from the current session based on the provided filters.
   *
   * @param {Parameters<typeof ChatMessage.delete>[2]} [filters] - The filters to apply to the delete operation. Defaults to deleting messages from the current session.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the delete operation is complete.
   */
  deleteMessages(
    filters: Parameters<typeof ChatMessage.delete>[2] = { sessionId: this.id },
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return ChatMessage.delete(this._database, this.messagesTableName, filters);
  }

  /**
   * Creates a chat completion based on the provided parameters, optionally loading message history and database schema.
   *
   * @typeParam _TParams - The parameters for creating a chat completion.
   * @typeParam TParams - The final set of parameters passed to the `createChatCompletion` method.
   *
   * @param {TParams} params - The parameters for creating the chat completion.
   *
   * @returns {Promise<CreateChatCompletionResult<ExtractStreamParam<TParams>>>} A promise that resolves to the result of the chat completion.
   */
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
