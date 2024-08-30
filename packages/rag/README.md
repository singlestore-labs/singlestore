# SingleStoreRAG

A module that enhances the `@singlestore/client` package with Retrieval-Augmented Generation (RAG) functionality, enabling seamless integration of advanced RAG features into a chat application.

## Table of Contents

- [Installation](#installation)
- [Usage Examples](#usage-examples)
  - [Basic Usage](#basic-usage)
  - [Advanced Usage](#advanced-usage)

## Installation

To install the `@singlestore/rag` package, run the following command:

```bash
npm install @singlestore/rag
```

## Usage Examples

### Basic Usage

A simple example demonstrating how to set up a chat session using the RAG module.

```ts
import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";
import { RAG } from "@singlestore/rag";

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
const client = new SingleStoreClient({ ai });

const workspace = client.workspace({
  host: "<DATABASE_HOST>",
  user: "<DATABASE_USER>",
  password: "<DATABASE_PASSWORD>",
});

const database = workspace.database("<DATABASE_NAME>");
const rag = new RAG({ database, ai });
const chat = await rag.createChat();
const session = await chat.createSession();
const response = await session.createChatCompletion({ prompt: "Hi!" });
console.log(response);
```

### Advanced Usage

An advanced example showcasing the use of custom tools and chat completions with streaming.

```ts
import { AI, ChatCompletionTool, type OnChatCompletionChunk } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";
import { RAG } from "@singlestore/rag";
import z from "zod";

interface StoreDatabase {
  name: "store_database";
  tables: {
    products: {
      name: "products";
      columns: {
        id: number;
        name: string;
        description: string;
        price: number;
        description_v: string;
      };
    };
  };
}

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
const client = new SingleStoreClient({ ai });

const workspace = client.workspace<{
  databases: { store_database: StoreDatabase };
}>({
  host: "<DATABASE_HOST>",
  user: "<DATABASE_USER>",
  password: "<DATABASE_PASSWORD>",
});

const database = workspace.database("store_database");

const rag = new RAG({ database, ai });

const findProductTool = new ChatCompletionTool({
  name: "find_product",
  description: "Useful for finding and displaying information about a product.",
  params: z.object({ query: z.string().describe("Query for product search") }),
  call: async (params) => {
    const product = await database.table("products").vectorSearch(
      {
        prompt: params.query,
        vectorColumn: "description_v",
      },
      {
        select: ["id", "name", "description", "price"],
        limit: 1,
      },
    );

    return { name: "find_product", params, value: JSON.stringify(product) };
  },
});

const chat = await rag.createChat({
  name: "Assistant",
  systemRole: "You are a helpful store assistant.",
  store: true,
  tools: [findProductTool],
});

const session = await chat.createSession();

const stream = await session.createChatCompletion({
  prompt: "Find a 4k monitor.",
  loadHistory: true,
  stream: true,
});

const onChunk: OnChatCompletionChunk = (chunk) => {
  console.log("Chunk: ", chunk);
};

const response = await ai.chatCompletions.handleStream(stream, onChunk);
console.log(response);
```
