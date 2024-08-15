import zodToJsonSchema from "zod-to-json-schema";

import type { ChatCompletionStream, CreateChatCompletionOptions, CreateChatCompletionResult } from ".";
import type { OpenAI } from "openai";
import type { FunctionToolCallDelta } from "openai/resources/beta/threads/runs/steps.mjs";
import type {
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions.mjs";
import type { ChatCompletionTool } from "openai/src/resources/index.js";

import { ChatCompletions } from ".";

type _OpenAICreateChatCompletionOptions = Omit<Partial<ChatCompletionCreateParamsBase>, keyof CreateChatCompletionOptions>;

export type OpenAIChatCompletionModel = ChatCompletionCreateParamsBase["model"];

export interface OpenAICreateChatCompletionOptions extends CreateChatCompletionOptions, _OpenAICreateChatCompletionOptions {
  model?: OpenAIChatCompletionModel;
}

export class OpenAIChatCompletions extends ChatCompletions {
  constructor(private _openai: OpenAI) {
    super();
  }

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

  async create<T extends OpenAICreateChatCompletionOptions>(
    prompt: string,
    options?: T,
  ): Promise<CreateChatCompletionResult<T>> {
    const { systemRole = "You are a helpful assistant", messages = [], tools = [], ..._options } = options ?? ({} as T);

    const _messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemRole },
      ...((messages || []) as ChatCompletionMessageParam[]),
      { role: "user", content: prompt },
    ];

    const _tools: ChatCompletionTool[] = [...this._tools, ...tools].map(({ name, description, schema }) => ({
      type: "function",
      function: { name, description, parameters: zodToJsonSchema(schema) },
    }));

    const response = await this._openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      ..._options,
      messages: _messages,
      tools: _tools,
    });

    const handleToolCalls = async (toolCalls: ChatCompletionMessageToolCall[] | FunctionToolCallDelta[]) => {
      toolCalls.forEach((tool) => console.log(tool));
    };

    if (typeof response === "object" && response && "choices" in response) {
      const message = response.choices[0]?.message;

      if (message && "tool_calls" in message && message.tool_calls?.length) {
        await handleToolCalls(message.tool_calls);
      }

      return (message?.content || "") as CreateChatCompletionResult<T>;
    }

    return (async function* (): ChatCompletionStream {
      const defaultToolCallRecord = { function: { arguments: "" } } as FunctionToolCallDelta;
      const toolCallRecords: Record<number, FunctionToolCallDelta> = {};

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;

        if (delta && "tool_calls" in delta && delta.tool_calls?.length) {
          delta.tool_calls.forEach((toolCall) => {
            const toolCallRecord = toolCallRecords[toolCall.index] ?? defaultToolCallRecord;
            toolCallRecords[toolCall.index] = {
              ...toolCallRecord,
              ...toolCall,
              function: {
                ...toolCallRecord.function,
                ...toolCall.function,
                arguments: `${toolCallRecord.function?.arguments || ""}${toolCall.function?.arguments || ""}`,
              },
            };
          });
        }

        yield delta?.content || "";
      }

      await handleToolCalls(Object.values(toolCallRecords));
    })() as CreateChatCompletionResult<T>;
  }
}
