# SingleStore RAG

A module that enhances the [`@singlestore/client`](https://github.com/singlestore-labs/singlestore/tree/main/packages/client) package with Retrieval-Augmented Generation (RAG) functionality, enabling seamless integration of advanced RAG features into a chat application.

<details>
<summary>

## Table of Contents

</summary>

- [Installation](#installation)
- [Example Apps](#example-apps)
- [Usage](#usage)
  - [Initialization](#initialization)
    - [Additional Notes](#additional-notes)
  - [RAG](#rag)
    - [Get Models](#get-models)
  - [Chat](#chat)
    - [Create Chat](#create-chat)
      - [Additional Notes](#additional-notes-1)
    - [Find Chat](#find-chat)
      - [All Chats](#all-chats)
      - [By Condition](#by-condition)
      - [With Advanced Filtering](#with-advanced-filtering)
    - [Update Chat](#update-chat)
      - [By Condition](#by-condition-1)
      - [Specific](#specific)
    - [Delete Chat](#delete-chat)
      - [By Condition](#by-condition-2)
      - [Specific](#specific-1)
  - [Chat Session](#chat-session)
    - [Create Chat Session](#create-chat-session)
    - [Find Chat Session](#find-chat-session)
      - [All Chat Sessions](#all-chat-sessions)
      - [By Condition](#by-condition-3)
      - [With Advanced Filtering](#with-advanced-filtering-1)
    - [Update Chat Session](#update-chat-session)
      - [By Condition](#by-condition-4)
      - [Specific](#specific-2)
    - [Delete Chat Session](#delete-chat-session)
      - [By Condition](#by-condition-5)
      - [Specific](#specific-3)
    - [Submit](#submit)
  - [Chat Message](#chat-message)
    - [Create Chat Message](#create-chat-message)
    - [Find Chat Message](#find-chat-message)
      - [All Chat Messages](#all-chat-messages)
      - [By Condition](#by-condition-6)
      - [With Advanced Filtering](#with-advanced-filtering-2)
    - [Update Chat Message](#update-chat-message)
      - [By Condition](#by-condition-7)
      - [Specific](#specific-4)
    - [Delete Chat Message](#delete-chat-message)
      - [By Condition](#by-condition-8)
      - [Specific](#specific-5)
  - [Tools](#tools)

</details>

## Installation

```bash
npm install @singlestore/rag @singlestore/ai @singlestore/client
```

## Example Apps

- [Terminal Chat](https://github.com/singlestore-labs/singlestore/blob/main/examples/rag)

## Usage

### Initialization

To initialize `RAG`, you need to create instances of the `AI` class from `@singlestore/ai` and the `SingleStoreClient` from `@singlestore/client`. After that, establish a connection to your workspace and select the database where the required tables for the RAG application will be created to store chats, chat sessions and chat messages.

```ts
import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";
import { RAG } from "@singlestore/rag";

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
const client = new SingleStoreClient({ ai });

const connection = client.connect({
  host: "<WORKSPACE_HOST>",
  user: "<WORKSPACE_USER>",
  password: "<WORKSPACE_PASSWORD>",
});

const database = connection.database.use("<DATABASE_NAME>");
const rag = new RAG({ database, ai });
```

#### Additional Notes

- It is possible to use custom LLMs instead of OpenAI. For more information, please refer to [this guide](https://github.com/singlestore-labs/singlestore/tree/main/packages/ai#with-custom-embeddings-manager).

---

### RAG

#### Get Models

Returns the list of available models that can be used in the `ChatSession.submit` method.

```ts
const models = await rag.getModels();
```

---

### Chat

#### Create Chat

Creates a chat where sessions and messages will be stored.

```ts
const chat = await rag.chat.create({
  name: "<CHAT_NAME>", // Optional
  systemRole: "<SYSTEM_ROLE>", // Optional
  tableName: "<TABLE_NAME>", // Optional; `chats` by default
  sessionsTableName: "<SESSIONS_TABLE_NAME>", // Optional; `chat_sessions` by default
  messagesTableName: "<MESSAGES_TABLE_NAME>", // Optional; `chat_messages` by default
  store: true, // Optional; `false` by default,
  tools: toolsList, // Optional
});
```

##### Additional Notes

- The `store` parameter determines whether the chat, sessions, and messages should be persisted in the database.
- The `tools` parameter accepts an array of tools that the LLM can use when executing the `ChatSession.submit `method. For more information, please refer to [this guide](https://github.com/singlestore-labs/singlestore/tree/main/packages/ai#with-custom-chat-completion-tools).

---

#### Find Chat

Retrieves chat records, either all available chats or those that match specified conditions. You can control the result set using filters, ordering, pagination, and other optional parameters.

##### All Chats

Fetches all chat records without any filtering.

```ts
const chats = await rag.chat.find();
```

##### By Condition

Fetches a specific chat record based on a provided condition, such as `id`.

```ts
const chat = await rag.chat.find({ where: { id: "<ID>" } });
```

##### With Advanced Filtering

Fetches chat records with additional filtering options. You can apply conditions (`where`), sorting (`orderBy`), pagination (`limit`, `offset`), and provide custom parameters such as `tableName` and `tools`.

```ts
const chats = await rag.chat.find(
  {
    where: { columnName: "COLUMN_VALUE" }, // Optional
    orderBy: { columnName: "asc" }, // Optional
    limit: 10, // Optional
    offset: 0, // Optional
  }, // Optional
  {
    tableName: "chats", // Optional; `chats` by default
    tools: customToolsList, // Optional
  },
);
```

---

#### Update Chat

Allows to modify chat details, either by specifying conditions for matching multiple records or by targeting a specific chat instance.

##### By Condition

Updates chat records that meet the specified conditions. You can provide any combination of parameters in the `where` clause to filter which chats to update.

```ts
await rag.chat.update(
  "chats",
  // Updated values
  {
    name: "<NEW_CHAT_NAME>", // Optional
    systemRole: "<NEW_CHAT_SYSTEM_ROLE>", // Optional
    sessionsTableName: "<NEW_SESSIONS_TABLE_NAME>", // Optional
    messagesTableName: "<NEW_MESSAGES_TABLE_NAME>", // Optional
    createdAt: "NEW_CREATED_AT", // Optional
  },
  // Where condition
  {
    id: "<CHAT_ID>", // Optional
    name: "<CHAT_NAME>", // Optional
    systemRole: "<SYSTEM_ROLE>", // Optional
    sessionsTableName: "<SESSIONS_TABLE_NAME>", // Optional
    messagesTableName: "<MESSAGES_TABLE_NAME>", // Optional
  },
);
```

##### Specific

Updates a specific chat instance by directly providing the new values for the chat's fields. Each field is optional and only provided fields will be updated.

```ts
await chat.update({
  name: "<NEW_CHAT_NAME>", // Optional
  systemRole: "<NEW_CHAT_SYSTEM_ROLE>", // Optional
  sessionsTableName: "<NEW_SESSIONS_TABLE_NAME>", // Optional
  messagesTableName: "<NEW_MESSAGES_TABLE_NAME>", // Optional
  createdAt: "NEW_CREATED_AT", // Optional
});
```

---

#### Delete Chat

Deletes chat records from the database. You can delete chats based on specific conditions or directly target a specific chat instance.

##### By Condition

Deletes chats, sessions, and messages that match the specified conditions.

```ts
await rag.chat.delete(
  "chats",
  "chat_sessions",
  "chat_messages",
  // Where condition
  {
    id: "<CHAT_ID>", // Optional
    name: "<CHAT_NAME>", // Optional
    systemRole: "<SYSTEM_ROLE>", // Optional
    sessionsTableName: "<SESSIONS_TABLE_NAME>", // Optional
    messagesTableName: "<MESSAGES_TABLE_NAME>", // Optional
  },
);
```

##### Specific

Deletes a specific chat instance, including its associated sessions and messages.

```ts
await chat.delete();
```

---

### Chat Session

#### Create Chat Session

Initializes a new chat session. You can optionally provide a name for the session, or create a session with default parameters.

```ts
const session = await chat.session.create(
  {
    name: "<CHAT_SESSION_NAME>", // Optional
  }, // Optional
);
```

#### Find Chat Session

Retrieves session records, either all available sessions or those that match specified conditions. You can control the result set using filters, ordering, pagination, and other optional parameters.

##### All Chat Sessions

Fetches all session records without any filtering.

```ts
const sessions = await chat.session.find();
```

##### By Condition

Fetches a specific session record based on a provided condition, such as `id`.

```ts
const session = await chat.session.find({ where: { id: "<ID>" } });
```

##### With Advanced Filtering

Fetches session records with additional filtering options. You can apply conditions (`where`), sorting (`orderBy`), pagination (`limit`, `offset`).

```ts
const sessions = await chat.session.find(
  {
    where: { columnName: "COLUMN_VALUE" }, // Optional
    orderBy: { columnName: "asc" }, // Optional
    limit: 10, // Optional
    offset: 0, // Optional
  }, // Optional
);
```

---

#### Update Chat Session

Allows to modify chat session details, either by specifying conditions for matching multiple records or by targeting a specific chat instance.

##### By Condition

Updates chat session records that meet the specified conditions. You can provide any combination of parameters in the `where` clause to filter which chats to update.

```ts
await chat.session.update(
  // Updated values
  {
    chatID: "<NEW_CHAT_ID>", // Optional
    name: "<NEW_SESSION_NAME>", // Optional
    createdAt: "<NEW_CREATED_AT>", // Optional
  },
  // Where condition
  {
    id: "<ID>", // Optional
    name: "<SESSION_NAME>", // Optional
    createdAt: "<SESSION_CREATED_AT>", // Optional
  },
);
```

##### Specific

Updates a specific chat session instance.

```ts
await session.update({
  chatID: "<NEW_CHAT_ID>", // Optional
  name: "<NEW_CHAT_NAME>", // Optional
  createdAt: "<NEW_CREATED_AT>", // Optional
});
```

---

#### Delete Chat Session

Deletes chat session records from the database. You can delete chat sessions based on specific conditions or directly target a specific chat session instance.

##### By Condition

Deletes chat sessions, and messages that match the specified conditions.

```ts
await chat.session.delete({
  // Where condition
  id: "<CHAT_SESSION_ID>",
  name: "<CHAT_SESSION_NAME>",
  createdAt: "<CREATED_AT>",
});
```

##### Specific

Deletes a specific chat instance, including its associated messages.

```ts
await session.delete();
```

---

#### Submit

This method is used to initiate a chat session with a given `prompt`, `model`, and various configuration options. You can specify settings such as the `model` to be used, the history of the chat, database schema loading, and custom tools for function calling. Additionally, it supports streaming responses and handling tool calls and their results

```ts
const customToolsList = [describeDatabaseChatTool(database)];

const stream = await session.submit({
  model: "gpt-4o-mini", // Optional; specifies the LLM model to use
  prompt: "<PROMPT>", // The prompt to be sent to the LLM
  systemRole: "<SYSTEM_ROLE>", // Optional; defines the role of the system (e.g., instructions or persona)
  temperature: 0, // Optional; controls the randomness of the output (0 = deterministic, 1 = more creative)
  stream: true, // Optional; enables streaming of responses; `false` by default
  loadHistory: true, // Optional; loads the chat history into the session; `false` by default
  loadDatabaseSchema: true, // Optional; loads the database schema into the session; `false` by default
  messages: [], // Optional; array of messages to preload into the session; `[]` by default
  maxMessagesLength: 2048, // Optional; limits the total length of messages; `2048` by default
  tools: customToolsList, // Optional; list of tools to be used by the LLM during the session; `[]` by default
  onMessagesLengthSlice: () => {}, // Optional; callback triggered when messages length is sliced
  onMessageLengthExceededError: (error) => {}, // Optional; callback for when message length exceeds the limit
  onMessagesLengthExceededError: (error) => {}, // Optional; callback for when messages length exceed the limit
  toolCallHandlers: { toolName: async (tool, toolParams) => {} }, // Optional; handles calls to custom tools
  toolCallResultHandlers: { toolName: async (tool, toolResult, toolParams) => {} }, // Optional; handles the result of tool calls
});

const chatCompletion = await ai.chatCompletions.handleStream(stream, async (chunk) => {
  console.log(chunk); // Process each chunk of the streaming response
});
```

### Chat Message

#### Create Chat Message

```ts
const message = await session.message.create({
  role: "user", // Supported values: `user` | `assistant` | `system`
  content: "<CONTENT>",
});
```

---

#### Find Chat Message

Retrieves chat message records, either all available messages or those that match specified conditions. You can control the result set using filters, ordering, pagination, and other optional parameters.

##### All Chat Messages

Fetches all chat message records without any filtering.

```ts
const messages = await chat.message.find();
```

##### By Condition

Fetches a specific message record based on a provided condition, such as `id`.

```ts
const message = await chat.message.find({ where: { id: "<ID>" } });
```

##### With Advanced Filtering

Fetches chat message records with additional filtering options. You can apply conditions (`where`), sorting (`orderBy`), pagination (`limit`, `offset`).

```ts
const messages = await chat.message.find(
  {
    where: { columnName: "COLUMN_VALUE" }, // Optional
    orderBy: { columnName: "asc" }, // Optional
    limit: 10, // Optional
    offset: 0, // Optional
  }, // Optional
);
```

---

#### Update Chat Message

Allows to modify chat message details, either by specifying conditions for matching multiple records or by targeting a specific chat instance.

##### By Condition

Updates chat message records that meet the specified conditions. You can provide any combination of parameters in the `where` clause to filter which chats to update.

```ts
await session.message.update(
  // Updated values
  {
    sessionID: "<NEW_SESSION_ID>", // Optional
    role: "<NEW_ROLE>", // Optional; Supported values: `user` | `assistant` | `system`
    content: "<NEW_CONTENT>", // Optional
    createdAt: "<NEW_CREATED_AT>", // Optional
  },
  // Where condition
  {
    id: "<ID>", // Optional
    role: "<MESSAGE_ROLE>", // Optional
    content: "<MESSAGE_CONTENT>", // Optional
    createdAt: "<MESSAGE_CREATED_AT>", // Optional
  },
);
```

##### Specific

Updates a specific chat message instance.

```ts
await message.update({
  sessionID: "<NEW_SESSION_ID>", // Optional
  role: "<NEW_ROLE>", // Optional; Supported values: `user` | `assistant` | `system`
  content: "<NEW_CONTENT>", // Optional
  createdAt: "<NEW_CREATED_AT>", // Optional
});
```

---

#### Delete Chat Message

Deletes chat message records from the database. You can delete chat messages based on specific conditions or directly target a specific chat message instance.

##### By Condition

Deletes chat messages that match the specified conditions.

```ts
await session.message.delete(
  // Where condition
  {
    id: "<CHAT_ID>", // Optional
    role: "<CHAT_ROLE>", // Optional
    content: "<CHAT_CONTENT>", // Optional
    createdAt: "<CHAT_CREATED_AT>", // Optional
  },
);
```

##### Specific

Deletes a specific chat message instance.

```ts
await message.delete();
```

---

### Tools

You can create custom tools to extend the functionality of the LLM when creating or finding chats, or when calling the `ChatSession.submit` method. These tools can also integrate with function calling, allowing the LLM to execute specific functions during interactions. For detailed information on how to create a tool, refer to [this guide](https://github.com/singlestore-labs/singlestore/tree/main/packages/ai#with-custom-chat-completion-tools).

Additionally, this package includes ready-to-use tools, which you can find [here](https://github.com/singlestore-labs/singlestore/blob/main/packages/rag/src/chat/tools.ts).

Below are examples of how to use tools:

```ts
import { ChatCompletionTool } from "@singlestore/ai";
import { describeDatabaseChatTool, textToSQLChatTool, vectorSearchChatTool } from "@singlestore/rag";
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

const tools = [
  customTool,
  describeDatabaseChatTool(database),
  textToSQLChatTool(database, ai, { model: "gpt-4o-mini" }),
  vectorSearchChatTool(database),
];

const chat = await rag.chat.create({ tools });
// OR
const chats = await rag.chat.find({}, { tools });
// OR
const chatCompletion = await session.submit({ tools });
```
