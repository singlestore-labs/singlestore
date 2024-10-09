import {
  type AnyAI,
  type AnyChatCompletionTool,
  type ChatCompletionMessage,
  type ChatCompletionStream,
  type CreateChatCompletionParams,
  type CreateChatCompletionResult,
  type MergeChatCompletionTools,
  MessageLengthExceededError,
  MessagesLengthExceededError,
} from "@singlestore/ai";

import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

import { ChatMessage, ChatMessageManager } from "../message";

export interface ChatSessionSchema<TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  chatID: number;
  id: number;
  name: string;
  systemRole: string;
  store: boolean;
  tableName: TableName;
  messagesTableName: TableName;
  createdAt: string;
  tools: TTools;
}

export interface ChatSessionTable extends Pick<ChatSessionSchema, "chatID" | "id" | "name" | "createdAt"> {}

type ExtractStreamParam<T> = T extends { stream: infer S } ? (S extends boolean | undefined ? S : undefined) : undefined;

export class ChatSession<TAI extends AnyAI, TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  message: ChatMessageManager;

  constructor(
    private _database: AnyDatabase,
    private _ai: TAI,
    public chatID: ChatSessionSchema["chatID"] | undefined,
    public id: ChatSessionSchema["id"] | undefined,
    public name: ChatSessionSchema["name"],
    public systemRole: ChatSessionSchema["systemRole"],
    public store: ChatSessionSchema["store"],
    public tableName: ChatSessionSchema["tableName"],
    public messagesTableName: ChatSessionSchema["messagesTableName"],
    public createdAt: ChatSessionSchema["createdAt"] | undefined,
    private _tools: TTools,
  ) {
    this.message = new ChatMessageManager(this._database, this.messagesTableName, this.store, this.id);
  }

  static async update(
    database: AnyDatabase,
    tableName: TableName = "chat_sessions",
    ...args: Parameters<Table<TableName, ChatSessionTable, DatabaseType, AnyAI>["update"]>
  ) {
    return database.table.use<TableName, ChatSessionTable>(tableName).update(...args);
  }

  static async delete(
    database: AnyDatabase,
    tableName: TableName = "chat_sessions",
    messagesTableName: TableName = "chat_messages",
    ...[where]: Parameters<Table<TableName, ChatSessionTable, DatabaseType, AnyAI>["delete"]>
  ) {
    const table = database.table.use<TableName, ChatSessionTable>(tableName);
    const deletedRowIds = await table.find({ select: ["id"], where });

    return Promise.all([
      table.delete(where),
      ChatMessage.delete(database, messagesTableName, { sessionID: { in: deletedRowIds.map(({ id }) => id!) } }),
    ]);
  }

  async update(...[values]: Parameters<typeof ChatSession.update> extends [any, any, ...infer Rest, any] ? Rest : never) {
    const result = await ChatSession.update(this._database, this.tableName, values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  async delete() {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { id: this.id });
  }

  async submit<
    TParams extends Omit<Parameters<TAI["chatCompletions"]["create"]>[0], "toolCallHandlers" | "toolCallResultHandlers"> &
      Pick<
        CreateChatCompletionParams<
          ExtractStreamParam<TParams>,
          MergeChatCompletionTools<TTools, Parameters<TAI["chatCompletions"]["create"]>[0]["tools"]>
        >,
        "toolCallHandlers" | "toolCallResultHandlers"
      > & {
        loadHistory?: boolean;
        loadDatabaseSchema?: boolean;
        maxMessagesLength?: number;
        onMessagesLengthSlice?: () => Promise<void> | void;
        onMessageLengthExceededError?: (error: MessageLengthExceededError) => Promise<void> | void;
        onMessagesLengthExceededError?: (error: MessagesLengthExceededError) => Promise<void> | void;
      },
  >({
    prompt = "",
    systemRole,
    loadHistory = false,
    loadDatabaseSchema = false,
    messages = [],
    maxMessagesLength = 2048,
    tools = [],
    onMessagesLengthSlice,
    onMessageLengthExceededError,
    onMessagesLengthExceededError,
    ...params
  }: TParams): Promise<CreateChatCompletionResult<ExtractStreamParam<TParams>>> {
    let _messages: ChatCompletionMessage[] = [];
    const _tools: AnyChatCompletionTool[] = [...(this._tools || []), ...tools];

    if (loadDatabaseSchema || loadHistory) {
      const [databaseSchema, historyMessages] = await Promise.all([
        loadDatabaseSchema ? this._database.describe() : undefined,
        loadHistory
          ? this.message.find({
              orderBy: { createdAt: "desc" },
              limit: maxMessagesLength,
            })
          : undefined,
      ]);

      if (databaseSchema) {
        _messages.push({
          role: "system",
          content: `The database schema: ${JSON.stringify(databaseSchema)}`,
        });
      }

      if (historyMessages?.length) {
        _messages = [
          ..._messages,
          ...historyMessages
            .map((message) => ({
              role: message.role,
              content: message.content,
            }))
            .reverse(),
        ];
      }
    }

    if (messages?.length) {
      _messages = [..._messages, ...messages];
    }

    if (typeof maxMessagesLength === "number" && _messages.length >= maxMessagesLength) {
      _messages = _messages.slice(-maxMessagesLength);

      if (prompt && _messages[_messages.length - 1]?.role === "user" && _messages[_messages.length - 1]?.content === prompt) {
        prompt = "";
      } else if (prompt && _messages.length + 1 > maxMessagesLength) {
        _messages = _messages.slice(1);
      }

      if (systemRole && _messages[0]?.role === "system" && _messages[0]?.content === systemRole) {
        systemRole = undefined;
      } else if (systemRole && _messages.length + 1 >= maxMessagesLength) {
        _messages = _messages.slice(1);
      }

      await onMessagesLengthSlice?.();
    }

    let response;

    try {
      response = await this._ai.chatCompletions.create({
        ...params,
        prompt,
        systemRole,
        messages: _messages,
        tools: _tools,
      });
    } catch (error) {
      if (error instanceof MessagesLengthExceededError) {
        await onMessagesLengthExceededError?.(error);

        return this.submit({
          ...params,
          prompt,
          systemRole,
          loadHistory: false,
          loadDatabaseSchema: false,
          messages: _messages,
          maxMessagesLength: error.maxLength,
          tools: _tools,
        } as TParams);
      }

      if (error instanceof MessageLengthExceededError) {
        await onMessageLengthExceededError?.(error);
      }

      throw error;
    }

    await this.message.create({ role: "user", content: prompt });

    const handleResponseContent = (content: string) => {
      return this.message.create({ role: "assistant", content });
    };

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
