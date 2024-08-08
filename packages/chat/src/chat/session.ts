import type { AI, ChatCompletionOptions } from "@singlestore/ai";
import type { WorkspaceDatabase } from "@singlestore/client";

export interface ChatSessionConfig {
  chatId: number | undefined;
  name: string;
  systemRole: ChatCompletionOptions["systemRole"];
  store: boolean;
  tableName: string;
  messagesTableName: string;
}

export interface ChatSessionsTable {
  columns: Omit<ChatSessionConfig, "systemRole" | "store" | "tableName" | "messagesTableName"> & {
    id: number;
    createdAt: string;
  };
}

export class ChatSession<T extends WorkspaceDatabase = WorkspaceDatabase, U extends ChatSessionConfig = ChatSessionConfig> {
  chatId;
  name;
  systemRole;
  store;
  tableName;
  messagesTableName;

  constructor(
    private _database: T,
    private _ai: AI,
    public id: ChatSessionsTable["columns"]["id"] | undefined,
    public createdAt: ChatSessionsTable["columns"]["createdAt"] | undefined,
    config: U,
  ) {
    this.chatId = config.chatId;
    this.name = config.name;
    this.systemRole = config.systemRole;
    this.store = config.store;
    this.tableName = config.tableName;
    this.messagesTableName = config.messagesTableName;
  }

  static createTable(database: WorkspaceDatabase, name: string) {
    return database.createTable<ChatSessionsTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true },
        createdAt: { type: "DATETIME", default: "CURRENT_TIMESTAMP()" },
        name: { type: "varchar(128)" },
        chatId: { type: "bigint" },
      },
      clauses: ["KEY(id)", "SHARD KEY (name)", `CONSTRAINT ${name}_name_uk UNIQUE (name)`],
    });
  }

  static async create<T extends WorkspaceDatabase, U extends ChatSessionConfig>(database: T, ai: AI, config: U) {
    let id: ChatSession["id"];
    let createdAt: ChatSession["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (config.store) {
      const insertedChatSession = await database
        .table<ChatSessionsTable>(config.tableName)
        .insert({ createdAt, name: config.name, chatId: config.chatId });
      id = insertedChatSession[0]?.[0].insertId;
    }

    return new ChatSession(database, ai, id, createdAt, config);
  }
}
