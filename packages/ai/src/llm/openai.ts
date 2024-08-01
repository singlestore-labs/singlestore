import type { OpenAI } from "openai";
import type {
  ChatCompletionCreateParams,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming.mjs";
import type { LLM } from ".";

type CreateChatCompletionOptions = Partial<Omit<ChatCompletionCreateParams, "input">> & {
  systemRole?: string;
  history?: ChatCompletionMessageParam[];
};

export class OpenAILLM implements LLM {
  constructor(private _openai: OpenAI) {}

  async createChatCompletion<
    T extends CreateChatCompletionOptions,
    _ReturnType = T extends { stream: true } ? AsyncIterable<string> : string,
  >(prompt: string, options?: T): Promise<_ReturnType> {
    const { systemRole = "You are a helpful assistant", history = [], ..._options } = options ?? ({} as T);

    const messages: ChatCompletionMessageParam[] = _options?.messages || [
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

    const isStreamResponse = (_response: any): _response is Stream<ChatCompletionChunk> => !!_options?.stream;
    if (isStreamResponse(response)) {
      async function* asyncIterableFromStream(stream: Stream<ChatCompletionChunk>): AsyncIterable<string> {
        for await (const chunk of stream) {
          yield chunk.choices[0]?.delta.content || "";
        }
      }

      return asyncIterableFromStream(response) as _ReturnType;
    }

    return (response.choices[0]?.message.content || "") as _ReturnType;
  }

  async handleChatCompleitonStream(
    stream: AsyncIterable<string>,
    onChunk?: (chunk: string) => Promise<void> | void,
  ): Promise<string> {
    let text = "";

    for await (const chunk of stream) {
      text += chunk;
      await onChunk?.(chunk);
    }

    return text;
  }
}
