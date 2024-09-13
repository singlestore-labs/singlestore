# SingleStore Client

The SingleStore Client is a package designed for interacting with the SingleStore API in Node.js environments.

## Table of Contents

- [Installation](#installation)
- [Usage Examples](#usage-examples)
  - [Create an Instance](#create-an-instance)
  - [Connect to a Workspace](#connect-to-a-workspace)
  - [Create a Database](#create-a-database)
  - [Use a Database](#use-a-database)
  - [Create a Table](#create-a-table)
  - [Insert Values](#insert-values)
  - [Find Values](#find-values)
  - [Find Values by a Condition](#find-values-by-a-condition)
  - [Update Values by a Condition](#update-values-by-a-condition)
  - [Add AI Functionality](#add-ai-functionality)
  - [Perform a Vector Search](#perform-a-vector-search)
  - [Create a Chat Completion Stream](#create-a-chat-completion-stream)
  - [Advanced Usage](#advanced-usage)

## Installation

To install the `@singlestore/client` package, run the following command:

```bash
npm install @singlestore/client
```

## Usage Examples

### Create an Instance

Instantiate the `SingleStoreClient` to interact with the SingleStore.

```ts
import { SingleStoreClient } from "@singlestore/client";

const client = new SingleStoreClient();
```

### Connect to a Workspace

Connect to a specific workspace using your workspace credentials.

```ts
const connection = client.connect({
  host: "<DATABASE_HOST>",
  user: "<DATABASE_USER>",
  password: "<DATABASE_PASSWORD>",
});
```

### Create a Database

Create a new database within the connected workspace.

```ts
const database = await connection.database.create({ name: "my_database" });
```

### Use a Database

Select and use an existing database.

```ts
const database = await connection.database.use("my_database");
```

### Create a Table

Create a table within the selected database with specified columns and attributes.

```ts
const usersTable = await database.table.create({
  name: "users",
  columns: {
    id: { type: "BIGINT", autoIncrement: true, primaryKey: true },
    name: { type: "VARCHAR(32)" },
    role: { type: "VARCHAR(32)" },
  },
});
```

### Insert Values

Insert multiple records into a table.

```ts
await usersTable.insert([
  { name: "User 1", role: "admin" },
  { name: "User 2", role: "visitor" },
]);
```

### Find Values

Retrieve all records from a table.

```ts
const users = await usersTable.find();
```

### Find Values by a Condition

Retrieve records that match specific conditions.

```ts
const admins = await usersTable.find({ where: { role: "admin" } });
```

### Update Values by a Condition

Update records that meet certain conditions.

```ts
await usersTable.update({ role: "admin" }, { name: "User 2" });
```

### Add AI Functionality

Integrate AI capabilities using the SingleStore AI package.

```ts
import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
const client = new SingleStoreClient({ ai });
```

### Perform a Vector Search

Execute a vector search on a table to find relevant records.

```ts
const results = await usersTable.vectorSearch(
  { prompt: "A 4k monitor", vectorColumn: "description_v" },
  { select: ["name", "description", "price"], limit: 1 },
);
```

### Create a Chat Completion Stream

Generate a chat completion or stream based on prompt and vector search results.

```ts
const stream = await usersTable.createChatCompletion(
  { prompt: "Find a 4k monitor", vectorColumn: "description_v", stream: true },
  { select: ["name", "description", "price"], limit: 1 },
);

const onChunk: OnChatCompletionChunk = (chunk) => console.log(chunk);

const chatCompletion = await ai.chatCompletions.handleStream(stream, onChunk);
console.log(chatCompletion);
```

### Advanced Usage

A more complex example demonstrating advanced queries and table joins.

```ts
interface StoreDatabase {
  name: "store_database";
  tables: {
    products: {
      id: number;
      name: string;
      description: string;
      price: number;
      category_id: number;
      description_v: string;
    };
    categories: {
      id: number;
      name: string;
    };
  };
}

const client = new SingleStoreClient({ ai });

const connection = client.connect({
  host: "<DATABASE_HOST>",
  user: "<DATABASE_USER>",
  password: "<DATABASE_PASSWORD>",
});

const database = connection.database.use<StoreDatabase>("store_database");

const products = await database.table.use("products").find({
  select: ["id", "name", "description", "price", "category.name"],
  join: [
    {
      table: "categories",
      as: "category",
      on: ["category_id", "=", "id"],
    },
  ],
  where: {
    "category.id": 1,
    "price": { gte: 500 },
  },
  orderBy: { price: "desc" },
  limit: 5,
});

console.log(products);
```
