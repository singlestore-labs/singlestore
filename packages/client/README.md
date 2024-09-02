# SingleStore Client

The SingleStore Client is a package designed to use SingleStore API in Node.js environments.

## Table of Contents

- [Installation](#installation)
- [Usage Examples](#usage-examples)

## Installation

To install the `@singlestore/client` package, run the following command:

```bash
npm install @singlestore/client
```

## Usage Examples

### Create an Instance

```ts
import { SingleStoreClient } from "@singlestore/client";

const client = new SingleStoreClient({ ai });
```

### Connect to a Workspace

```ts
const workspace = client.workspace({
  host: "<DATABASE_HOST>",
  user: "<DATABASE_USER>",
  password: "<DATABASE_PASSWORD>",
});
```

### Create a Database

```ts
const database = await workspace.createDatabase({ name: "my_database" });
```

### Use a Database

```ts
const database = await workspace.database("my_database");
```

### Create a Table

```ts
const usersTable = await database.createTable({
  name: "users",
  columns: {
    id: { type: "BIGINT", autoIncrement: true, primaryKey: true },
    name: { type: "VARCHAR(32)" },
    role: { type: "VARCHAR(32)" },
  },
});
```

### Insert Values

```ts
await usersTable.insert([
  { name: "User 1", role: "admin" },
  { name: "User 2", role: "visitor" },
]);
```

### Find Values

```ts
const users = await usersTable.find();
```

### Find Values by a Condition

```ts
const admins = await usersTable.find({ where: { role: "admin" } });
```

### Update Values by a Condition

```ts
await usersTable.update({ role: "admin" }, { name: "User 2" });
```

### Add AI Functionality

```ts
import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
const client = new SingleStoreClient({ ai });
```

### Perform a Vector Search

This method returns found rows.

```ts
const results = await usersTable.vectorSearch(
  { prompt: "A 4k monitor", vectorColumn: "description_v" },
  { select: ["name", "description", "price"], limit: 1 },
);
```

### Create a Chat Compleiton Stream

This method returns a chat completion or a chat completion stream based on the prompt and vector search results.

```ts
const stream = await usersTable.createChatCompletion(
  { prompt: "Find a 4k monitor", vectorColumn: "description_v", stream: true },
  { select: ["name", "description", "price"], limit: 1 },
);

const onChunk: OnChatCompletionChunk = (chunk) => console.log(chunk);

const chatCompletion = await ai.chatCompletions.handleStream(stream, onChunk);
console.log(chatCompletion);
```

### Advanced

```ts
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
        category_id: number;
        description_v: string;
      };
    };
    categories: {
      name: "categories";
      columns: {
        id: number;
        name: string;
      };
    };
  };
}

const client = new SingleStoreClient({ ai });

const workspace = client.workspace<{
  databases: { store_database: StoreDatabase };
}>({
  host: "<DATABASE_HOST>",
  user: "<DATABASE_USER>",
  password: "<DATABASE_PASSWORD>",
});

const database = workspace.database("store_database");

const products = await database.table("products").find({
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
