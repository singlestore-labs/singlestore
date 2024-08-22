import zodToJsonSchema from "zod-to-json-schema";

import type { ChatCompletionMessage, ChatCompletionStream, CreateChatCompletionParams, CreateChatCompletionResult } from ".";
import type { AnyChatCompletionTool, MergeChatCompletionTools } from "./tool";
import type { OpenAI } from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions.mjs";
import type { Stream } from "openai/streaming.mjs";

import { ChatCompletions } from ".";

/**
 * Represents the model type used in OpenAI chat completions.
 */
export type OpenAIChatCompletionModel = ChatCompletionCreateParamsBase["model"];

/**
 * Internal interface that extends the base parameters for creating an OpenAI chat completion,
 * excluding properties already defined in `CreateChatCompletionParams`.
 */
interface _OpenAICreateChatCompletionParams
  extends Omit<Partial<ChatCompletionCreateParamsBase>, keyof CreateChatCompletionParams<any, any>> {}

/**
 * Parameters for creating an OpenAI chat completion.
 *
 * @typeParam T - Indicates whether the completion should be streamed (boolean).
 * @typeParam U - An array of tools that can be used during the chat completion.
 *
 * @property {OpenAIChatCompletionModel} [model] - The model to use for generating the completion.
 */
export interface OpenAICreateChatCompletionParams<T extends boolean | undefined, U extends AnyChatCompletionTool[] | undefined>
  extends CreateChatCompletionParams<T, U>,
    _OpenAICreateChatCompletionParams {
  model?: OpenAIChatCompletionModel;
}

/**
 * Class representing chat completions using OpenAI's API, with support for tools and streaming.
 *
 * @typeParam T - An array of tools that can be used during the chat completion.
 */
export class OpenAIChatCompletions<T extends AnyChatCompletionTool[] | undefined> extends ChatCompletions<T> {
  constructor(private _openai: OpenAI) {
    super();
  }

  /**
   * Retrieves the list of models available for OpenAI chat completions.
   *
   * @returns An array of model names.
   */
  getModels(): OpenAIChatCompletionModel[] {
    // TODO: Replace with dynamic values
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

  /**
   * Creates a chat completion using OpenAI's API, with optional support for streaming and tool integration.
   *
   * @typeParam U - Indicates whether the completion should be streamed (boolean).
   * @typeParam K - An array of tools that can be used during the chat completion.
   *
   * @param {OpenAICreateChatCompletionParams<U, MergeChatCompletionTools<T, K>>} params - Parameters for creating the chat completion, including prompt, system role, messages, tools, and handlers.
   *
   * @returns A promise that resolves to either a single chat completion or a stream of chat completions, depending on the `stream` parameter.
   */
  async create<U extends boolean | undefined = false, K extends AnyChatCompletionTool[] | undefined = undefined>({
    prompt,
    systemRole,
    messages,
    tools,
    toolCallHandlers,
    toolCallResultHandlers,
    ...params
  }: OpenAICreateChatCompletionParams<U, MergeChatCompletionTools<T, K>>): Promise<CreateChatCompletionResult<U>> {
    let _messages: ChatCompletionMessage[] = [];
    if (systemRole) _messages.push({ role: "system", content: systemRole });
    if (messages?.length) _messages = [..._messages, ...messages];
    if (prompt) _messages.push({ role: "user", content: prompt });

    let _tools: AnyChatCompletionTool[] = [];
    if (this.tools?.length) _tools = [..._tools, ...this.tools];
    if (tools?.length) _tools = [..._tools, ...tools];

    const response = await this._openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      ...params,
      messages: _messages as ChatCompletionMessageParam[],
      tools: _tools.length
        ? _tools.map(({ name, description, params }) => ({
            type: "function",
            function: { name, description, parameters: params ? zodToJsonSchema(params) : undefined },
          }))
        : undefined,
    });

    const handleToolCalls = (
      toolCalls: ChatCompletionMessageToolCall[] | ChatCompletionChunk["choices"][number]["delta"]["tool_calls"] = [],
    ) => {
      type ToolCall = (typeof _tools)[number]["call"];

      return Promise.all(
        toolCalls.map(async (call) => {
          const _call = { ...call, id: call.id || "" };

          if (!call.function) {
            throw new Error(`Invalid tool call: ${JSON.stringify(call)}`);
          }

          let params: Parameters<ToolCall>[0];
          if (call.function.arguments) {
            try {
              params = JSON.parse(call.function.arguments);
            } catch (error) {
              throw new Error(`Invalid parameters provided for the "${call.function.name}" tool.`, { cause: error });
            }
          }

          const tool = _tools.find(({ name }) => name === call.function?.name);
          if (!tool) {
            throw new Error(`The "${call.function.name}" tool is undefined.`);
          }

          try {
            await toolCallHandlers?.[tool.name]?.(tool, params);
            const result = await tool.call(params);
            await toolCallResultHandlers?.[tool.name]?.(tool, result, params);
            return [{ tool, params, value: result.value }, _call] as const;
          } catch (error) {
            let _error = error;

            if (typeof error !== "string") {
              if (error instanceof Error) {
                _error = `Error: ${error.message}`;
              } else {
                try {
                  _error = JSON.stringify(error, Object.getOwnPropertyNames(error));
                } catch (error) {
                  _error = JSON.stringify(error, Object.getOwnPropertyNames(error));
                }
              }
            }

            return [{ tool, params, error: _error }, _call] as const;
          }
        }),
      );
    };

    const handleToolCallResults = (
      results: Awaited<ReturnType<typeof handleToolCalls>>,
      message?: ChatCompletionMessageParam | ChatCompletionChunk["choices"][number]["delta"],
    ) => {
      return this.create({
        ...params,
        tools,
        messages: [
          ..._messages,
          message,
          ...results.map(([result, { id }]) => {
            return {
              role: "tool",
              tool_call_id: id,
              content: "error" in result ? result.error : result.value,
            } satisfies ChatCompletionToolMessageParam;
          }),
        ] as ChatCompletionMessage[],
      });
    };

    if (typeof response === "object" && response && "choices" in response) {
      const message = response.choices[0]?.message;

      if (message && "tool_calls" in message && message.tool_calls?.length) {
        const toolCallResults = await handleToolCalls(message.tool_calls);
        return (await handleToolCallResults(toolCallResults, message)) as CreateChatCompletionResult<U>;
      }

      return { content: message?.content || "" } as CreateChatCompletionResult<U>;
    }

    /**
     * Handles the streaming of chat completion chunks, processing tool calls and yielding content.
     *
     * @param {Stream<ChatCompletionChunk>} stream - The stream of chat completion chunks.
     *
     * @returns A `ChatCompletionStream` that yields processed chat completion content.
     */
    async function* handleStream(stream: Stream<ChatCompletionChunk>): ChatCompletionStream {
      let delta: ChatCompletionChunk["choices"][number]["delta"] | undefined = undefined;

      for await (const chunk of stream) {
        const _delta = chunk.choices[0]?.delta;
        if (!delta) delta = { ..._delta, content: _delta?.content || "", tool_calls: [] };

        if (_delta && "tool_calls" in _delta && _delta.tool_calls?.length) {
          for (const toolCall of _delta.tool_calls) {
            if (!delta || !delta.tool_calls) break;
            const deltaToolCall = delta.tool_calls[toolCall.index] || { function: { arguments: "" } };
            delta.tool_calls[toolCall.index] = {
              ...deltaToolCall,
              ...toolCall,
              function: {
                ...deltaToolCall.function,
                ...toolCall.function,
                arguments: `${deltaToolCall.function?.arguments || ""}${toolCall.function?.arguments || ""}`,
              },
            };
          }
        } else {
          yield { content: _delta?.content || "" };
        }
      }

      if (delta?.tool_calls?.length) {
        const toolCallResults = await handleToolCalls(delta.tool_calls);
        const toolCallResultsStream = (await handleToolCallResults(toolCallResults, delta)) as ChatCompletionStream;
        for await (const chunk of toolCallResultsStream) yield chunk;
      }
    }

    return handleStream(response) as CreateChatCompletionResult<U>;
  }
}
