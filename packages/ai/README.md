# SingleStore AI

A module that enhances the [`@singlestore/client`](https://github.com/singlestore-labs/singlestore/tree/main/packages/client) package with AI functionality, allowing you to integrate AI features like embeddings and chat completions.

<details>
<summary>

## Table of Contents

</summary>

- [Installation](#installation)
- [Usage](#usage)
  - [Initialization](#initialization)
    - [Default](#default)
    - [With Custom Embeddings Manager](#with-custom-embeddings-manager)
    - [With Custom Chat Completions Manager](#with-custom-chat-completions-manager)
    - [With Custom Chat Completion Tools](#with-custom-chat-completion-tools)
    - [Additional Notes](#additional-notes)
  - [Embeddings](#embeddings)
    - [Get Embedding Models](#get-embedding-models)
    - [Create Embeddings](#create-embeddings)
      - [Create Single Embedding](#create-single-embedding)
      - [Create Multiple Embeddings](#create-multiple-embeddings)
      - [Additional Notes](#additional-notes)
  - [Chat Completions](#chat-completions)
    - [Get Chat Completion Models](#get-chat-completion-models)
    - [Create Chat Completion](#create-chat-completion)
      - [As String](#as-string)
      - [As Stream](#as-stream)
      - [Additional Notes](#additional-notes-1)

</details>

## Installation

```bash
npm install @singlestore/ai
```

## Usage

### Initialization

The `AI` class can be initialized in various ways depending on your requirements. You can start with the default setup, or extend it with custom managers for embeddings and chat completions, or even add custom tools.

#### Default

This is the simplest way to initialize the `AI` class, using an OpenAI API key.

```ts
import { AI } from "@singlestore/ai";

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
```

#### With Custom Embeddings Manager

You can define a custom embeddings manager by extending the `EmbeddingsManager` class to handle how embeddings are created and models are selected.

```ts
import { type CreateEmbeddingsParams, type Embedding, EmbeddingsManager } from "@singlestore/ai/embeddings";

class CustomEmbeddingsManager extends EmbeddingsManager {
  getModels(): string[] {
    return ["<MODEL_NAME>"];
  }

  async create(input: string | string[], params?: CreateEmbeddingsParams): Promise<Embedding[]> {
    const embeddings: Embedding[] = await customFnCall();
    return embeddings;
  }
}

const ai = new AI({
  openAIApiKey: "<OPENAI_API_KEY>",
  embeddingsManager: new CustomEmbeddingsManager(),
});
```

#### With Custom Chat Completions Manager

You can define a custom chat completions manager by extending the `ChatCompletionsManager` class. This allows you to modify how chat completions are handled, whether in a streaming or non-streaming fashion.

```ts
import {
  type AnyChatCompletionTool,
  ChatCompletionsManager,
  type CreateChatCompletionParams,
  type CreateChatCompletionResult,
  type MergeChatCompletionTools,
} from "@singlestore/ai/chat-completions";

type ChatCompletionTools = undefined; // If an array of custom tools is created, use `typeof tools`.

class CustomChatCompletionsManager extends ChatCompletionsManager<ChatCompletionTools> {
  getModels(): Promise<string[]> | string[] {
    return ["<MODEL_NAME>"];
  }

  create<TStream extends boolean, TTools extends AnyChatCompletionTool[] | undefined>(
    params: CreateChatCompletionParams<TStream, MergeChatCompletionTools<ChatCompletionTools, TTools>>,
  ): Promise<CreateChatCompletionResult<TStream>> {
    if (params.stream) {
      const stream = customFnCall();
      return stream as Promise<CreateChatCompletionResult<TStream>>;
    }

    const chatCompletion = await customFnCall();

    return chatCompletion as Promise<CreateChatCompletionResult<TStream>>;
  }
}

const ai = new AI({
  openAIApiKey: "<OPENAI_API_KEY>",
  chatCompletionsManager: new CustomChatCompletionsManager(),
});
```

#### With Custom Chat Completion Tools

You can also create custom tools to extend the functionality of the chat completions by defining them with the `ChatCompletionTool` class.

```ts
import { ChatCompletionTool } from "@singlestore/ai/chat-completions";
import { z } from "zod";

const customTool = new ChatCompletionTool({
  name: "<TOOL_NAME>",
  description: "<TOOL_DESCRIPTION>",
  params: z.object({ paramName: z.string().describe("<PARAM_DESCRIPTION>") }),
  call: async (params) => {
    const value = await anyFnCall(params);
    return { name: "<TOOL_NAME>", params, value: JSON.stringify(value) };
  },
});

const ai = new AI({
  tools: [customTool],
  ...
});
```

#### Additional Notes

- If you declare a custom embeddings manager and a custom chat completions manager, the `openAIApiKey` parameter is not required.
- Custom managers and tools allow for extensive customization, giving you the flexibility to integrate AI functionality tailored to your specific needs.

---

### Embeddings

#### Get Embedding Models

```ts
const models = ai.embeddings.getModels();
```

---

#### Create Embeddings

##### Create Single Embedding

```ts
const embeddings = await ai.embeddings.create("<INPUT>", {
  model: "<MODEL_NAME>", // Optional
  dimensions: "<DIMENSION>", // Optional
});
```

##### Create Multiple Embeddings

```ts
const embeddings = await ai.embeddings.create(["<INPUT>", "<INPUT_2>"], ...);
```

##### Additional Notes

- If a custom `EmbeddingsManager` is provided, all the parameters can still be passed to the `ai.embeddings.create` method, allowing for custom handling and logic while preserving the same interface.

---

### Chat Completions

#### Get Chat Completion Models

```ts
const models = ai.chatCompletions.getModels();
```

#### Create Chat Completion

The `create` method allows you to generate chat completions either as a complete string or in a streamed fashion, depending on the `stream` option.

##### As String

Performs a chat completion and returns the result as a complete string.

```ts
const chatCompletion = await ai.chatCompletions.create({
  stream: false,
  prompt: "<PROMPT>",
  model: "<MODEL_NAME>", // Optional
  systemRole: "<SYSTEM_ROLE>", // Optional
  messages: [{ role: "user", content: "<CONTENT>" }], // Optional
});
```

##### As Stream

Performs a chat completion and returns the result as a stream of data chunks.

```ts
const stream = await ai.chatCompletions.create({
  stream: true,
  prompt: "<PROMPT>",
  model: "<MODEL_NAME>", // Optional
  systemRole: "<SYSTEM_ROLE>", // Optional
  messages: [{ role: "user", content: "<CONTENT>" }], // Optional
  tools: [...] // Optional
});

const chatCompletion = await ai.chatCompletions.handleStream(stream, async (chunk) => {
  await customFnCall(chunk);
});
```

##### Additional Notes

- When using `stream: true`, the `handleStream` function processes the stream and accepts a callback function as the second argument. The callback handles each new chunk of data as it arrives.
- You can use the messages array to provide additional context for the chat completion, such as user messages or system instructions.
- If a custom `ChatCompletionsManager` is provided, all the parameters can still be passed to the `ai.chatCompletions.create` method, allowing for custom handling and logic while preserving the same interface.

---
