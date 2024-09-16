# SingleStoreAI

A module that enhances the `@singlestore/client` package with AI functionality, allowing you to integrate advanced AI features like embeddings and chat completions.

## Table of Contents

- [Installation](#installation)
- [Usage Examples](#usage-examples)
  - [Create an Instance](#create-an-instance)
  - [Generate Embeddings](#generate-embeddings)
  - [Create a Chat Completion](#create-a-chat-completion)
  - [Stream Chat Completions](#stream-chat-completions)
  - [Develop a Chat Completion Tool](#develop-a-chat-completion-tool)
  - [Custom Chat Completions](#custom-chat-completions)
  - [Custom Embeddings](#custom-embeddings)

## Installation

To install the `@singlestore/ai` package, run the following command:

```bash
npm install @singlestore/ai
```

## Usage Examples

### Create an Instance

First, create an instance of the `SingleStoreAI` class using your OpenAI API key.

```ts
import { AI } from "@singlestore/ai";

const ai = new SingleStoreAI({ openAIApiKey: "<OPENAI_API_KEY>" });
```

### Generate Embeddings

Generate embeddings for a given input text using the `create` method.

```ts
const input = "Hi!";
const embeddings = await ai.embeddings.create(input);
console.log(embeddings);
```

### Create a Chat Completion

Create a chat completion.

```ts
const prompt = "Hi, how are you?";
const chatCompletion = await ai.chatCompletions.create({
  prompt,
  model: "gpt-4o",
  systemRole: "You are a helpful assistant",
});
console.log(chatCompletion);
```

### Stream Chat Completions

Stream chat completions to handle responses in real time.

```ts
const prompt = "Hi, how are you?";

const stream = await ai.chatCompletions.create({
  prompt,
  model: "gpt-4o",
  systemRole: "You are a helpful assistant",
  stream: true,
});

const onChunk: OnChatCompletionChunk = (chunk) => {
  console.log("onChunk:", chunk);
};

const chatCompletion = await ai.chatCompletions.handleStream(stream, onChunk);
console.log(chatCompletion);
```

### Develop a Chat Completion Tool

Create a custom chat completion tool to handle specific tasks.

```ts
import { AI, ChatCompletionTool } from "@singlestore/ai";
import { z } from "zod";

const findCityInfoTool = new ChatCompletionTool({
  name: "find_city_info",
  description: "Useful for finding and displaying information about a city.",
  params: z.object({ name: z.string().describe("The city name") }),
  call: async (params) => {
    const info = `${params.name} is known as a great city!`;
    return { name: "find_city_info", params, value: JSON.stringify(info) };
  },
});

const ai = new AI({
  openAIApiKey: "<OPENAI_API_KEY>",
  chatCompletionTools: [findCityInfoTool],
});

const chatCompletion = await ai.chatCompletions.create({ prompt: "Find info about Vancouver." });
console.log(chatCompletion);
```

### Custom Chat Completions

Extend the ChatCompletions class to use a custom LLM for creating chat completions.

```ts
import { AI, type AnyChatCompletionTool, ChatCompletions } from "@singlestore/ai";

class CustomChatCompletionsManager<
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined,
> extends ChatCompletions<TChatCompletionTool> {
  constructor() {
    super();
  }

  getModels(): Promise<string[]> | string[] {
    // Your implementation
    return [];
  }

  async create<TStream extends boolean | undefined>(
    params: CreateChatCompletionParams<TStream, TChatCompletionTool>,
  ): Promise<CreateChatCompletionResult<TStream>> {
    // Your implementation
    return {} as CreateChatCompletionResult<TStream>;
  }
}

const ai = new AI({
  openAIApiKey: "<OPENAI_API_KEY>",
  chatCompletions: new CustomChatCompletionsManager(),
});
```

### Custom Embeddings

Create a custom embeddings class to use a custom LLM for creating embeddings.

```ts
import { AI, Embeddings } from "@singlestore/ai";

class CustomEmbeddingsManager extends Embeddings {
  constructor() {
    super();
  }

  getModels(): string[] {
    // Your implementation
    return [];
  }

  async create(input: string | string[], params?: CreateEmbeddingsParams): Promise<Embedding[]> {
    // Your implementation
    return [];
  }
}

const ai = new AI({
  openAIApiKey: "<OPENAI_API_KEY>",
  embeddings: new CustomEmbeddingsManager(),
});
```
