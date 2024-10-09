import type { AnyAI } from "@singlestore/ai";
import type { AnyDatabase } from "@singlestore/client";

import { ChatManager } from "./chat/manager";

export interface RAGConfig<TAI extends AnyAI> {
  database: AnyDatabase;
  ai: TAI;
}

export class RAG<TAI extends AnyAI> {
  private _database: AnyDatabase;
  private _ai: TAI;
  chat: ChatManager<TAI>;

  constructor(config: RAGConfig<TAI>) {
    this._database = config.database;
    this._ai = config.ai;
    this.chat = new ChatManager(this._database, this._ai);
  }

  getModels() {
    return this._ai.chatCompletions.getModels();
  }
}
