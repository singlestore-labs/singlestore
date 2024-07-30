import { OpenAI } from "openai";
import type { ChatCompletionCreateParamsBase, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { LLM } from ".";

export class OpenAILLM implements LLM {
  private _model: OpenAI;

  constructor(apiKey?: string) {
    this._model = new OpenAI({ apiKey });
  }

  async createChatCompletion(
    input: string,
    options?: Partial<Omit<ChatCompletionCreateParamsBase, "stream">> & { systemRole?: string },
  ) {
    let messages: ChatCompletionMessageParam[] = options?.messages || [
      { role: "system", content: options?.systemRole || "You are a helpful assistant" },
      { role: "user", content: input },
    ];

    return this._model.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      ...options,
      stream: true,
      messages,
    });
  }
}
