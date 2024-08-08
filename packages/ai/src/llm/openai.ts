import type { OpenAI } from "openai";
import type { ChatCompletionCreateParams, ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Stream as OpenAIStream } from "openai/streaming.mjs";
import type { LLM, ChatCompletionStream, ChatCompletionMessage, ChatCompletionOptions } from ".";
import type { ChatModel } from "openai/resources/index.mjs";

type CreateChatCompletionOptions = Partial<
  ChatCompletionOptions<ChatModel> & Omit<ChatCompletionCreateParams, keyof ChatCompletionOptions>
>;

export class OpenAILLM implements LLM {
  constructor(private _openai: OpenAI) {}

  async getModels(): Promise<ChatModel[]> {
    const list = await this._openai.models.list();
    return list.data.map((model) => model.id as ChatModel);
  }

  async createChatCompletion<
    T extends CreateChatCompletionOptions,
    _ReturnType = T extends { stream: true } ? ChatCompletionStream : string,
  >(prompt: string, options?: T): Promise<_ReturnType> {
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

    const isStreamResponse = (_response: any): _response is OpenAIStream<ChatCompletionChunk> => !!_options?.stream;
    if (isStreamResponse(response)) {
      async function* asyncIterableFromStream(stream: OpenAIStream<ChatCompletionChunk>): ChatCompletionStream {
        for await (const chunk of stream) {
          yield chunk.choices[0]?.delta.content || "";
        }
      }

      return asyncIterableFromStream(response) as _ReturnType;
    }

    return (response.choices[0]?.message.content || "") as _ReturnType;
  }

  async handleChatCompleitonStream(
    stream: ChatCompletionStream,
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
