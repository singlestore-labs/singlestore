import type { OpenAI } from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Stream as OpenAIStream } from "openai/streaming.mjs";
import type {
  ChatCompletions,
  ChatCompletionStream,
  ChatCompletionMessage,
  ChatCompletionCreateOptions,
  ChatCompletionCreateReturnType,
} from ".";

export type OpenAIChatCompletionModel =
  | "gpt-4o"
  | "gpt-4o-2024-05-13"
  | "gpt-4o-2024-08-06"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4-turbo"
  | "gpt-4-turbo-2024-04-09"
  | "gpt-4-turbo-preview"
  | "gpt-4-0125-preview"
  | "gpt-4-1106-preview"
  | "gpt-4"
  | "gpt-4-0613"
  | "gpt-3.5-turbo-0125"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-1106"
  | "gpt-3.5-turbo-instruct";

export type OpenAIChatCompletionsCreateOptions = ChatCompletionCreateOptions<OpenAIChatCompletionModel> &
  Omit<Parameters<OpenAI["chat"]["completions"]["create"]>[0], keyof ChatCompletionCreateOptions>;

export class OpenAIChatCompletions implements ChatCompletions {
  constructor(private _openai: OpenAI) {}

  getModels(): OpenAIChatCompletionModel[] {
    return [
      "gpt-4o",
      "gpt-4o-2024-05-13",
      "gpt-4o-2024-08-06",
      "gpt-4o-mini",
      "gpt-4o-mini-2024-07-18",
      "gpt-4-turbo",
      "gpt-4-turbo-2024-04-09",
      "gpt-4-turbo-preview",
      "gpt-4-0125-preview",
      "gpt-4-1106-preview",
      "gpt-4",
      "gpt-4-0613",
      "gpt-3.5-turbo-0125",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-1106",
      "gpt-3.5-turbo-instruct",
    ];
  }

  async create<T extends Partial<OpenAIChatCompletionsCreateOptions>>(
    prompt: string,
    options?: T,
  ): Promise<ChatCompletionCreateReturnType<T>> {
    const { systemRole = "You are a helpful assistant", history = [], ..._options } = options ?? ({} as T);

    const messages: ChatCompletionMessage[] = _options?.messages || [
      { role: "system", content: systemRole },
      ...(history || []),
      { role: "user", content: prompt },
    ];

    const response = await this._openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      ..._options,
      messages,
    });

    if (typeof response === "object" && response && "choices" in response) {
      return (response.choices[0]?.message.content || "") as ChatCompletionCreateReturnType<T>;
    }

    return (async function* (): ChatCompletionStream {
      for await (const chunk of response) {
        yield chunk.choices[0]?.delta.content || "";
      }
    })() as ChatCompletionCreateReturnType<T>;
  }

  async handleStream(stream: ChatCompletionStream, onChunk?: (chunk: string) => Promise<void> | void): Promise<string> {
    let text = "";

    for await (const chunk of stream) {
      text += chunk;
      await onChunk?.(chunk);
    }

    return text;
  }
}
