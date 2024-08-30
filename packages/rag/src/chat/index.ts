import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, FieldPacket, InferDatabaseType, ResultSetHeader, Table, TableType } from "@singlestore/client";

import { ChatMessage } from "./message";
import { ChatSession, type ChatSessionsTable } from "./session";

export interface ChatConfig
  extends Pick<Chat, "name" | "systemRole" | "store" | "tableName" | "sessionsTableName" | "messagesTableName"> {
  tools: AnyChatCompletionTool[];
}

export interface ChatsTable<TName extends string = string> extends TableType {
  name: TName;
  columns: Pick<Chat, "id" | "createdAt"> & Omit<ChatConfig, "tools">;
}

export type CreateChatConfig = Partial<ChatConfig>;

export class Chat<
  TDatabase extends AnyDatabase = AnyDatabase,
  TAi extends AnyAI = AnyAI,
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined = undefined,
  TTableName extends string = string,
  TSessionsTableName extends string = string,
  TMessagesTableName extends string = string,
> {
  constructor(
    private _database: TDatabase,
    private _ai: TAi,
    private _tools: TChatCompletionTool,
    public id: number | undefined,
    public createdAt: string | undefined,
    public name: string,
    public systemRole: ChatSession<TDatabase>["systemRole"],
    public store: ChatSession<TDatabase>["store"],
    public tableName: TTableName,
    public sessionsTableName: TSessionsTableName,
    public messagesTableName: TMessagesTableName,
  ) {}

  private static _createTable<TDatabase extends AnyDatabase, TName extends Chat["tableName"]>(
    database: TDatabase,
    name: TName,
  ): Promise<Table<ChatsTable<TName>, InferDatabaseType<TDatabase>>> {
    return database.createTable<ChatsTable<TName>>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
        name: { type: "varchar(128)", nullable: false },
        systemRole: { type: "text" },
        store: { type: "bool" },
        tableName: { type: "varchar(128)", nullable: false, default: "'chats'" },
        sessionsTableName: { type: "varchar(128)", nullable: false, default: "'chat_sessions'" },
        messagesTableName: { type: "varchar(128)", nullable: false, default: "'chat_messages'" },
      },
    });
  }

  static async create<TDatabase extends AnyDatabase, TAi extends AnyAI, TConfig extends CreateChatConfig>(
    database: TDatabase,
    ai: TAi,
    config?: TConfig,
  ): Promise<
    Chat<
      TDatabase,
      TAi,
      TConfig["tools"],
      TConfig["tableName"] extends string ? TConfig["tableName"] : string,
      TConfig["sessionsTableName"] extends string ? TConfig["sessionsTableName"] : string,
      TConfig["messagesTableName"] extends string ? TConfig["messagesTableName"] : string
    >
  > {
    const createdAt: Chat["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 23);

    const _config: ChatConfig = {
      name: config?.name ?? createdAt,
      systemRole: config?.systemRole ?? "",
      store: config?.store ?? true,
      tableName: config?.tableName ?? "chats",
      sessionsTableName: config?.sessionsTableName ?? "chat_sessions",
      messagesTableName: config?.messagesTableName ?? "chat_messages",
      tools: config?.tools || [],
    };

    let id: Chat["id"];

    if (_config.store) {
      const [chatsTable] = await Promise.all([
        Chat._createTable(database, _config.tableName),
        ChatSession.createTable(database, _config.sessionsTableName),
        ChatMessage.createTable(database, _config.messagesTableName),
      ]);

      const [rows] = await chatsTable.insert({
        createdAt,
        name: _config.name,
        systemRole: _config.systemRole,
        store: _config.store,
        tableName: _config.tableName,
        sessionsTableName: _config.sessionsTableName,
        messagesTableName: _config.messagesTableName,
      });

      id = rows?.[0].insertId;
    }

    return new Chat(
      database,
      ai,
      _config.tools,
      id,
      createdAt,
      _config.name,
      _config.systemRole,
      _config.store,
      _config.tableName,
      _config.sessionsTableName,
      _config.messagesTableName,
    );
  }

  static async delete(
    database: AnyDatabase,
    tableName: Chat["tableName"],
    sessionsTable: Chat["sessionsTableName"],
    messagesTableName: Chat["messagesTableName"],
    where?: Parameters<Table<ChatsTable>["delete"]>[0],
  ): Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]> {
    const table = database.table<ChatsTable>(tableName);
    const deletedRowIds = await table.find({ select: ["id"], where });

    return Promise.all([
      table.delete(where),
      ChatSession.delete(database, sessionsTable, messagesTableName, { chatId: { in: deletedRowIds.map(({ id }) => id!) } }),
    ]);
  }

  async update(values: Parameters<Table<ChatsTable<TTableName>>["update"]>[0]): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await this._database.table<ChatsTable, TTableName>(this.tableName).update(values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  delete(): Promise<[[ResultSetHeader, FieldPacket[]], [ResultSetHeader, FieldPacket[]][]]> {
    return Chat.delete(this._database, this.tableName, this.sessionsTableName, this.messagesTableName, { id: this.id });
  }

  createSession<TName extends ChatSession["name"]>(
    name?: TName,
  ): Promise<
    ChatSession<
      TDatabase,
      TAi,
      TChatCompletionTool,
      TSessionsTableName extends string ? TSessionsTableName : string,
      TMessagesTableName extends string ? TMessagesTableName : string
    >
  > {
    return ChatSession.create(this._database, this._ai, {
      chatId: this.id,
      name,
      systemRole: this.systemRole,
      store: this.store,
      tableName: this.sessionsTableName,
      messagesTableName: this.messagesTableName,
      tools: this._tools,
    });
  }

  async findSessions(
    params?: Parameters<Table<ChatSessionsTable<TSessionsTableName>>["find"]>[0],
  ): Promise<ChatSession<TDatabase, TAi, TChatCompletionTool, TSessionsTableName, TMessagesTableName>[]> {
    const rows = await this._database.table(this.sessionsTableName).find(params);

    return rows.map(
      (row) =>
        new ChatSession(
          this._database,
          this._ai,
          this._tools,
          row.id,
          row.createdAt,
          row.chatId,
          row.name,
          this.systemRole,
          this.store,
          this.sessionsTableName,
          this.messagesTableName,
        ),
    );
  }

  deleteSessions(
    filters: Parameters<typeof ChatSession.delete>[3] = { chatId: this.id },
  ): Promise<[ResultSetHeader, FieldPacket[]][]> {
    return ChatSession.delete(this._database, this.sessionsTableName, this.messagesTableName, filters);
  }
}
