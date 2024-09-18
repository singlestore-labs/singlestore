# SingleStore Client

The SingleStore Client is a package designed for interacting with the SingleStore API in Node.js environments.

<details>
<summary>

## Table of Contents

</summary>

- [Installation](#installation)
- [Usage](#usage)
  - [Initialization](#initialization)
    - [Default](#default)
    - [With Management API Access](#with-management-api-access)
    - [With AI Functionality](#with-ai-functionality)
    - [Additional Notes](#additional-notes)
  - [Organization](#organization)
    - [Get Current Organization](#get-current-organization)
  - [Workspace Group](#workspace-group)
    - [Get Workspace Group](#get-workspace-group)
      - [All Workspace Groups](#all-workspace-groups)
      - [By Workspace Group ID](#by-workspace-group-id)
      - [By Workspace Group Name](#by-workspace-group-name)
      - [Additional Notes](#additional-notes-1)
    - [Create Workspace Group](#create-workspace-group)
      - [Additional Notes](#additional-notes-2)
    - [Update Workspace Group](#update-workspace-group)
      - [By Workspace Group ID](#by-workspace-group-id-1)
      - [Selected Workspace Group](#selected-workspace-group)
      - [Additional Notes](#additional-notes-3)
    - [Delete Workspace Group](#delete-workspace-group)
      - [By Workspace Group ID](#by-workspace-group-id-2)
      - [Selected Workspace Group](#selected-workspace-group-1)
      - [Additional Notes](#additional-notes-4)
    - [Get Metrics](#get-metrics)
    - [Get Private Connections](#get-private-connections)
  - [Workspace](#workspace)
    - [Connect Workspace](#connect-workspace)
      - [Using Client](#using-client)
      - [Using Workspace Group](#using-workspace-group)
    - [Get Workspace](#get-workspace)
      - [All Workspaces](#all-workspaces)
      - [By Workspace ID](#by-workspace-id)
      - [By Workspace Name](#by-workspace-name)
      - [Additional Notes](#additional-notes-5)
    - [Create Workspace](#create-workspace)
      - [Additional Notes](#additional-notes-6)
    - [Update Workspace](#update-workspace)
      - [By Workspace ID](#by-workspace-id-1)
      - [Selected Workspace](#selected-workspace)
      - [Additional Notes](#additional-notes-7)
    - [Delete Workspace](#delete-workspace)
      - [By Workspace ID](#by-workspace-id-2)
      - [Selected Workspace](#selected-workspace-1)
    - [Get Workspace State](#get-workspace-state)
      - [By Workspace ID](#by-workspace-id-3)
      - [Selected Workspace](#selected-workspace-2)
    - [Resume Workspace](#resume-workspace)
      - [By Workspace ID](#by-workspace-id-4)
      - [Selected Workspace](#selected-workspace-3)
      - [Additional Notes](#additional-notes-8)
    - [Suspend Workspace](#suspend-workspace)
      - [By Workspace ID](#by-workspace-id-5)
      - [Selected Workspace](#selected-workspace-4)
  - [Database](#database)
    - [Use Database](#use-database)
    - [Create Database](#create-database)
    - [Drop Database](#drop-database)
      - [By Database Name](#by-database-name)
      - [Selected Database](#selected-database)
    - [Query Database](#query-database)
      - [Additional Notes](#additional-notes-9)
    - [Describe Database](#describe-database)
    - [Show Database Info](#show-database-info)
    - [Show Database Tables Info](#show-database-tables-info)
  - [Table](#table)
    - [Use Table](#use-table)
    - [Create Table](#create-table)
    - [Drop Table](#drop-table)
      - [By Table Name](#by-table-name)
      - [Selected Table](#selected-table)
    - [Truncate Table](#truncate-table)
      - [By Table Name](#by-table-name-1)
      - [Selected Table](#selected-table-1)
    - [Rename Table](#rename-table)
      - [By Table Name](#by-table-name-2)
      - [Selected Table](#selected-table-2)
    - [Show Table Info](#show-table-info)
    - [Show Table Columns Info](#show-table-columns-info)
    - [Insert Table Value](#insert-table-value)
      - [Single Value](#single-value)
      - [Multiple Values](#multiple-values)
    - [Find Table Values](#find-table-values)
      - [Find All Values](#find-all-values)
      - [Find Values By Condition](#find-values-by-condition)
      - [Additional Notes](#additional-notes-10)
    - [Update Table Values](#update-table-values)
    - [Delete Table Values](#delete-table-values)
      - [Additional Notes](#additional-notes-11)
    - [Table Vector Search](#table-vector-search)
      - [Basic](#basic)
      - [With Conitoins](#with-conditions)
      - [Additional Notes](#additional-notes-12)
    - [Create Table Chat Completion](#create-table-chat-completion)
      - [As String](#as-string)
      - [As Stream](#as-stream)
      - [With Custom Tools](#with-custom-tools)
      - [Additional Notes](#additional-notes-13)
  - [Column](#column)
    - [Use Column](#use-column)
    - [Add Column](#add-column)
    - [Modify Column](#modify-column)
      - [By Column Name](#by-column-name)
      - [Selected Column](#selected-column)
    - [Rename Column](#rename-column)
      - [By Column Name](#by-column-name-1)
      - [Selected Column](#selected-column-1)
    - [Drop Column](#drop-column)
      - [By Column Name](#by-column-name-2)
      - [Selected Column](#selected-column-2)
    - [Show Column Info](#show-column-info)
      - [By Column Name](#by-column-name-3)
      - [Selected Column](#selected-column-3)
  - [Billing](#billing)
    - [Get Billing](#get-billing)
  - [Region](#region)
    - [Get All Regions](#get-all-regions)
    - [Get Region by ID](#get-region-by-id)
    - [Get Region by Name](#get-region-by-name)
    - [Additional Notes](#additional-notes-14)
  - [Team](#team)
    - [Get Team](#get-team)
      - [Get All Teams](#get-all-teams)
      - [Get Team by ID](#get-team-by-id)
      - [Get Team by Name](#get-team-by-name)
      - [Get Team by Description](#get-team-by-description)
    - [Create Team](#create-team)
    - [Update Team](#update-team)
      - [By Team ID](#by-team-id)
      - [Selected Team](#selected-team)
    - [Delete Team](#delete-team)
      - [By Team ID](#by-team-id-1)
      - [Selected Team](#selected-team-1)
    - [Add Team Member](#add-team-member)
      - [Add Team](#add-team)
        - [By Team ID](#by-team-id-2)
        - [Selected Team](#selected-team-2)
      - [Add User](#add-user)
        - [By Team ID](#by-team-id-3)
        - [Selected Team](#selected-team-3)
    - [Remove Team Member](#remove-team-member)
      - [Remove Team](#remove-team)
        - [By Team ID](#by-team-id-4)
        - [Selected Team](#selected-team-4)
      - [Remove User](#remove-user)
        - [By Team ID](#by-team-id-5)
        - [Selected Team](#selected-team-5)
  - [Job](#job)
    - [Get Job](#get-job)
    - [Create Job](#create-job)
    - [Delete Job](#delete-job)
      - [By Job ID](#by-job-id)
      - [Selected Job](#selected-job)
    - [Get Job Executions](#get-job-executions)
      - [By Job ID](#by-job-id-1)
      - [Selected Job](#selected-job-1)
    - [Get Job Parameters](#get-job-parameters)
      - [By Job ID](#by-job-id-2)
      - [Selected Job](#selected-job-2)
    - [Get Job Runtimes](#get-job-runtimes)
  - [Secret](#secret)
    - [Get Secret](#get-secret)
      - [By Secret ID](#by-secret-id)
      - [By Secret name](#by-secret-name)
    - [Create Secret](#create-secret)
    - [Update Secret](#update-secret)
      - [By Secret ID](#by-secret-id)
      - [Selected Secret](#selected-secret)
    - [Delete Secret](#delete-secret)
      - [By Secret ID](#by-secret-id-1)
      - [Selected Secret](#selected-secret-1)
  - [Stage](#stage)
    - [Get All Stage](#get-all-stage)
    - [Get Stage Folder](#get-stage-folder)
    - [Get Stage File](#get-stage-file)
    - [Update Stage](#update-stage)
      - [By Stage Path](#by-stage-path)
      - [Selected Stage](#selected-stage)
    - [Create Stage Folder](#create-stage-folder)
      - [In Stage Path](#in-stage-path)
      - [In Selected Stage](#in-selected-stage)
    - [Delete Stage](#delete-stage)
      - [By Stage Path](#by-stage-path-1)
      - [Selected Stage](#selected-stage-1)
  - [Storage](#storage)
    - [Get Storage Regions](#get-storage-regions)
    - [Get Storage Status](#get-storage-status)

</details>

## Installation

```bash
npm install @singlestore/client
```

## Usage

### Initialization

The SingleStoreClient can be initialized in multiple ways, depending on your needs. Below are examples of how to initialize the client in various scenarios.

#### Default

Use this method if you don’t need Management API access or AI integration.

```ts
import { SingleStoreClient } from "@singlestore/client";

const client = new SingleStoreClient();
```

#### With Management API Access

This method is used when you need to access SingleStore's management API.

```ts
import { SingleStoreClient } from "@singlestore/client";

const client = new SingleStoreClient({ apiKey: "<SINGLESTORE_API_KEY>" });
```

#### With AI Functionality

If you want to integrate AI features, use this method. You need to pass an AI instance with the required API key.

```bash
npm install @singlestore/ai
```

```ts
import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";

const ai = new AI({ openAIApiKey: "<OPENAI_API_KEY>" });
const client = new SingleStoreClient({ ai });
```

#### Additional Notes

- The SingleStoreClient class is flexible, allowing you to pass only the features you need (e.g., AI, API key). It will automatically configure the services based on the provided options.
- You can also use custom LLMs instead of the pre-installed OpenAI. To do this, see the `@singlestore/ai` package [documentation](https://github.com/singlestore-labs/singlestore/tree/update_readme/packages/ai#singlestoreai).

---

### Organization

#### Get Current Organization

Returns the current organization if an API key was provided during initialization.

```ts
const organization = await client.organization.get();
```

---

### Workspace Group

#### Get Workspace Group

##### All Workspace Groups

```ts
const workspaceGroups = await client.workspaceGroup.get();
```

##### By Workspace Group ID

```ts
const workspaceGroup = await client.workspaceGroup.get({
  where: { id: "<WORKSPACE_GROUP_ID>" },
});
```

##### By Workspace Group Name

```ts
const workspaceGroup = await client.workspaceGroup.get({
  where: { name: "<WORKSPACE_GROUP_NAME>" },
});
```

##### Additional Notes

- To include terminated workspace groups, add the `includeTerminated: true` parameter to the `workspaceGroup.get` options object.
- To select specific fields from a workspace group, add the `select: ['<FIELD_NAME_TO_SELECT>']` parameter to the `workspaceGroup.get` options object.

---

#### Create Workspace Group

```ts
const { workspaceGroup, adminPassword } = await client.workspaceGroup.create({
  name: "<WORKSPACE_GROUP_NAME>",
  regionName: "US West 2 (Oregon)",
  adminPassword: "<WORKSPACE_GROUP_PASSWORD>",
  allowAllTraffic: false,
  firewallRanges: ["IP_ADDRESS"],
  dataBucketKMSKeyID: "<ID>",
  backupBucketKMSKeyID: "<ID>",
  updateWindow: { day: "mo", hour: 12 },
  expiresAt: new Date("2025-01-01"),
});
```

##### Additional Notes

- Only the `name` and `regionName` fields are required to create a workspace group. All other fields are optional.
- If the `adminPassword` value is not provided, a generated password is returned.
- To find all available `regionName` values, refer to this [link](https://github.com/singlestore-labs/singlestore/blob/a324301908b7c12751022fc7dd6edd374cbf2de0/packages/client/src/region/index.ts#L3).

---

#### Update Workspace Group

You can update a workspace group by specifying the workspace group ID or by calling the `update` method on a selected Workspace Group instance.

##### By Workspace Group ID

```ts
await client.workspaceGroup.update("<WORKSPACE_GROUP_ID>", {
  name: "<NEW_WORKSPACE_GROUP_NAME>",
  adminPassword: "<NEW_WORKSPACE_GROUP_PASSWORD>",
  allowAllTraffic: true,
  firewallRanges: ["<NEW_IP_ADDRESS>"],
  updateWindow: { day: "mo", hour: 12 },
  expiresAt: new Date("2025-01-01"),
});
```

##### Selected Workspace Group

Updates the currently selected workspace group.

```ts
await workspaceGroup.update({
  name: "<NEW_WORKSPACE_GROUP_NAME>",
  adminPassword: "<NEW_WORKSPACE_GROUP_PASSWORD>",
  allowAllTraffic: true,
  firewallRanges: ["<NEW_IP_ADDRESS>"],
  updateWindow: { day: "mo", hour: 12 },
  expiresAt: new Date("2025-01-01"),
});
```

##### Additional Notes

- All fields are optional when updating a workspace group.

---

#### Delete Workspace Group

You can delete a workspace group by specifying the workspace group ID or by calling the `delete` method on a selected Workspace Group instance.

##### By Workspace Group ID

```ts
await client.workspaceGroup.delete("<WORKSPACE_GROUP_ID>", false);
```

##### Selected Workspace Group

Deletes the currently selected workspace group.

```ts
await workspaceGroup.delete(false);
```

##### Additional Notes

- To forcibly delete a workspace group, set the optional `force` argument to `true`.

---

#### Get Metrics

```ts
const metrics = await workspaceGroup.getMetrics();
```

---

#### Get Private Connections

```ts
const privateConnections = await workspaceGroup.getPrivateConnections();
```

---

### Workspace

#### Connect Workspace

##### Using Client

```ts
const connection = client.connect({
  host: "<WORKSPACE_HOST>",
  user: "<WORKSPACE_USER>",
  password: "<WORKSPACE_PASSWORD>",
  port: <WORKSPACE_PORT>
});
```

##### Using Workspace Group

```ts
const workspace = await workspaceGroup.workspace.get({
  where: { id: "<WORKSPACE_ID>" },
});

if (workspace) {
  const connection = workspace.connect({
    user: "<WORKSPACE_USER>",
    password: "<WORKSPACE_PASSWORD>",
    port: <WORKSPACE_PORT>,
  });
}
```

---

#### Get Workspace

##### All Workspaces

```ts
const workspace = await workspaceGroup.workspace.get();
```

##### By Workspace ID

```ts
const workspace = await workspaceGroup.workspace.get({
  where: { id: "<WORKSPACE_ID>" },
});
```

##### By Workspace Name

```ts
const workspace = await workspaceGroup.workspace.get({
  where: { name: "<WORKSPACE_NAME>" },
});
```

##### Additional Notes

- To include terminated workspaces, add the `includeTerminated: true` parameter to the `workspaceGroup.workspace.get` options object.
- To select specific fields from a workspace group, add the `select: ['<FIELD_NAME_TO_SELECT>']` parameter to the `workspaceGroup.workspace.get` options object.

---

#### Create Workspace

```ts
const workspace = await workspaceGroup.workspace.create({
  name: "WORKSPACE_NAME",
  size: "S-00",
  enableKai: true,
  cacheConfig: 1,
  scaleFactor: 1,
  autoSuspend: {
    suspendType: "SCHEDULED",
    suspendAfterSeconds: 1200,
  },
});
```

##### Additional Notes

- Only the `name` field is required to create a workspace. All other fields are optional.
- To find all available `size` values, refer to this [link](https://github.com/singlestore-labs/singlestore/blob/67e9c837465c130525300a8fdff7acb9abc6e056/packages/client/src/workspace/workspace.ts#L8).

---

#### Update Workspace

##### By Workspace ID

```ts
await workspaceGroup.workspace.update("<WORKSPACE_ID>", {
  size: "S-00",
  enableKai: true,
  cacheConfig: 1,
  scaleFactor: 1,
  deploymentType: "PRODUCTION",
  autoSuspend: {
    suspendType: "SCHEDULED",
    suspendAfterSeconds: 1200,
  },
});
```

##### Selected Workspace

```ts
await workspace.update({
  size: "S-00",
  enableKai: true,
  cacheConfig: 1,
  scaleFactor: 1,
  deploymentType: "PRODUCTION",
  autoSuspend: {
    suspendType: "SCHEDULED",
    suspendAfterSeconds: 1200,
  },
});
```

##### Additional Notes

- All fields are optional when updating a workspace.

---

#### Delete Workspace

##### By Workspace ID

```ts
await workspaceGroup.workspace.delete("<WORKSPACE_ID>");
```

##### Selected Workspace

```ts
await workspace.delete();
```

---

#### Get Workspace State

##### By Workspace ID

```ts
const state = await workspaceGroup.workspace.getState("<WORKSPACE_ID>");
```

##### Selected Workspace

```ts
const state = await workspace.getState();
```

---

#### Resume Workspace

##### By Workspace ID

```ts
await workspaceGroup.workspace.resume("<WORKSPACE_ID>", { disableAutoSuspend: false });
```

##### Selected Workspace

```ts
await workspace.resume({ disableAutoSuspend: false });
```

##### Additional Notes

- The `disableAutoSuspend` parameter is optional.

---

#### Suspend Workspace

##### By Workspace ID

```ts
await workspaceGroup.workspace.suspend("<WORKSPACE_ID>");
```

##### Selected Workspace

```ts
await workspace.suspend();
```

---

### Database

#### Use Database

The `use` method allows you to interact with a specific database within the connection. You can optionally provide a generic `DatabaseSchema` to describe the database schema and its tables.

```ts
interface DatabaseSchema extends DatabaseType {
  name: "<DATABASE_NAME>";
  tables: {
    users: {
      id: number;
    };
  };
}

const database = connection.database.use<DatabaseSchema>("<DATABASE_NAME>");
```

---

#### Create Database

The `create` method allows you to create a database within the connection. You can optionally provide a generic `DatabaseSchema` to describe the database schema and its tables.

```ts
interface DatabaseSchema extends DatabaseType {
  name: "<DATABASE_NAME>";
  tables: {
    users: {
      id: number;
    };
  };
}

const database = await connection.database.create<DatabaseSchema>({
  name: "<DATABASE_NAME>",
  tables: {
    users: {
      columns: {
        id: {
          type: "BIGINT",
          autoIncrement: true, // Optional
          primaryKey: true, // Optional
          nullable: false, // Optional
          default: 0, // Optional
          clauses: ["<CUSTOM_CLAUSE>"], // Optional
        },
      },
      clauses: ["<CUSTOM_CLAUSE>"], // Optional
      fulltextKeys: ["<COLUMN_NAME>"], // Optional
      primaryKeys: ["<COLUMN_NAME>"], // Optional
    },
  },
});
```

---

#### Drop Database

##### By Database Name

```ts
await connection.database.drop("<DATABASE_NAME>");
```

##### Selected Database

```ts
await database.drop();
```

---

#### Query Database

The `query` method allows you to execute a MySQL query on the database and retrieve the result. The query result is returned as an array of rows, where each row is represented as an object with column names as keys and the corresponding values.

```ts
type RowType = { [K: string]: any }[];

const [rows] = await database.query<RowType>("<MYSQL_QUERY>");
```

##### Additional Notes

- Ensure that the query string is properly formatted to prevent SQL errors.
- The `RowType` is a flexible type that can accommodate various column structures in the query result.

---

#### Describe Database

```ts
const info = await database.describe();
```

---

#### Show Database Info

The `showInfo` method allows you to retrieve information about the database. You can optionally request extended information by setting the `isExtended` argument to `true`.

```ts
const info = await database.showInfo(true);
```

---

#### Show Database Tables Info

The `showTablesInfo` method allows you to retrieve information about the database tables. You can optionally request extended information by setting the `isExtended` argument to `true`.

```ts
const tablesInfo = await database.showTablesInfo(true);
```

---

### Table

#### Use Table

The `use` method allows you to access a specific table within the database. It optionally accepts a table name and schema, providing an interface to interact with the table for querying and manipulation.

```ts
type TableName = "<TABLE_NAME>";
type TableSchema = { [K: string]: any };

const table = database.table.use<TableName, TableSchema>("<TABLE_NAME>");
```

---

#### Create Table

The `create` method allows you to create a new table in the database. You can define the table name and schema, specifying columns and their properties such as data types, constraints, and default values.

```ts
type TableName = "<TABLE_NAME>";
type TableSchema = { id: number };

const table = await database.table.create<TableName, TableSchema>({
  name: "<TABLE_NAME>",
  columns: {
    id: {
      type: "BIGINT",
      autoIncrement: true, // Optional
      primaryKey: true, // Optional
      nullable: false, // Optional
      default: 0, // Optional
      clauses: ["<CUSTOM_CLAUSE>"], // Optional
    },
  },
});
```

---

#### Drop Table

##### By Table Name

```ts
await database.table.drop("<TABLE_NAME>");
```

##### Selected Table

```ts
await table.drop();
```

---

#### Truncate Table

##### By Table Name

```ts
await database.table.truncate("<TABLE_NAME>");
```

##### Selected Table

```ts
await table.truncate();
```

---

#### Rename Table

##### By Table Name

```ts
await database.table.rename("<TABLE_NAME>", "<TABLE_NEW_NAME>");
```

##### Selected Table

```ts
await table.rename("<TABLE_NEW_NAME>");
```

---

#### Show Table Info

The `showInfo` method allows you to retrieve information about the table. You can optionally request extended information by setting the `isExtended` argument to `true`.

```ts
const tableInfo = await table.showInfo(true);
```

---

#### Show Table Columns Info

The `showInfo` method allows you to retrieve information about the table columns.

```ts
const tableColumnsInfo = await table.showColumnsInfo();
```

---

#### Insert Table Value

The `insert` method allows you to insert data into a table. You can insert a single value or multiple values at once by providing an object or an array of objects that map column names to values.

##### Single Value

```ts
await table.insert({columnName: <VALUE>})
```

##### Multiple Values

```ts
await table.insert([{columnName: <VALUE>}, {columnName: <VALUE_2>}])
```

---

#### Find Table Values

The `find` method allows you to retrieve values from a table, with optional support for conditions, joins, grouping, ordering, and pagination. You can either fetch all values from a table or apply conditions to narrow down th

##### Find All Values

Retrieves all values from the table without any conditions.

```ts
const values = await table.find();
```

##### Find Values By Condition

Retrieves values from the table based on the specified conditions. You can customize the query with select, join, where, groupBy, orderBy, limit, and offset options.

```ts
const values = await table.find({
  select: ["<COLUMN_NAME>", "COUNT(*) AS count"], // Optional
  join: [
    {
      type: "FULL", // Supported values: "INNER" | "LEFT" | "RIGHT" | "FULL"
      table: "<JOIN_TABLE_NAME>",
      as: "<JOIN_TABLE_AS>",
      on: [
        "<COLUMN_NAME>",
        "=", // Supported values: "=" | "<" | ">" | "<=" | ">=" | "!="
        "<JOIN_COLUMN_NAME>",
      ],
    },
  ], // Optional
  where: { columnName: "<COLUMN_VALUE>" }, // Optional
  groupBy: ["<COLUMN_NAME>"], // Optional
  orderBy: {
    columnName: "asc", // Supported values: "asc" | "desc"
  }, // Optional
  limit: 10, // Optional
  offset: 10, // Optional
});
```

##### Additional Notes

- The `COUNT(*) AS count` pattern follows the `clause AS alias` structure, where `COUNT(*)` is the `clause` and `count` is the `alias`.
- Ensure that joins, conditions, and selected columns are appropriate for the table schema and the data you're trying to retrieve.

---

#### Update Table Values

The `update` method allows you to modify existing values in the table. You provide the new values to update, along with a condition to specify which rows should be updated.

```ts
await table.update(
  { columnName: "<NEW_COLUMN_VALUE>" }, // New value
  { columnName: "<COLUMN_VALUE>" }, // Where condition
);
```

---

#### Delete Table Values

The `delete` method allows you to remove rows from the table that match a specified condition.

```ts
await table.delete({ columnName: "<COLUMN_VALUE>" });
```

##### Additional Notes

- Be cautious when using the `delete` method, especially if the where condition is broad, as it could result in the removal of multiple rows.
- If no where condition is provided, all rows in the table will be deleted. It’s best practice to always provide a where clause to avoid accidental data loss.

---

#### Table Vector Search

The `vectorSearch` method allows you to perform searches using vector-based embeddings in a specified column. This is particularly useful for tasks such as semantic search, where results are based on the similarity of vector representations of text or data.

##### Basic

Performs a vector search based on a prompt, returning rows from the table that match the vector similarity.

```ts
const rows = await table.vectorSearch({
  prompt: "<PROMPT>",
  vectorColumn: "<VECTOR_COLUMN_NAME>",
  embeddingParams: {
    model: "<MODEL_NAME>", // Optional
    dimensions: "<VECTOR_DIMENSTION>", // Optional
  }, // Optional
});
```

##### With Conditions

Performs a vector search with additional conditions such as selected columns, joins, filtering, grouping, ordering, and pagination.

```ts
const rows = await table.vectorSearch(
  {
    prompt: "<PROMPT>",
    vectorColumn: "<VECTOR_COLUMN_NAME>",
    embeddingParams: {
      model: "<MODEL_NAME>", // Optional
      dimensions: "<VECTOR_DIMENSTION>", // Optional
    },
  }, // Optional
  {
    select: ["<COLUMN_NAME>"], // Optional
    join: [
      {
        type: "FULL", // Supported values: "INNER" | "LEFT" | "RIGHT" | "FULL"
        table: "<JOIN_TABLE_NAME>",
        as: "<JOIN_TABLE_AS>",
        on: [
          "<COLUMN_NAME>",
          "=", // Supported values: "=" | "<" | ">" | "<=" | ">=" | "!="
          "<JOIN_COLUMN_NAME>",
        ],
      },
    ], // Optional
    where: { columnName: "<COLUMN_VALUE>" }, // Optional
    groupBy: ["<COLUMN_NAME>"], // Optional
    orderBy: {
      columnName: "asc", // Supported values: "asc" | "desc"
    }, // Optional
    limit: 10, // Optional
    offset: 10, // Optional
  }, // Optional
);
```

##### Additional Notes

- The `vectorSearch` method returns both the table rows and a `v_score` field, which reflects the similarity score of each row to the search prompt.
- Conditions such as `select`, `join`, `where`, and others can be used to refine the results further, similar to standard SQL queries.

---

#### Create Table Chat Completion

The `createChatCompletion` method allows you to generate chat completions based on a vector search within a table. Depending on the `stream` option, you can retrieve the results either as a complete string or in a streamed fashion, with optional custom tools for enhancing functionality.

##### As String

Performs a chat completion based on a vector search and returns the result as a complete string.

```ts
const chatCompletion = await table.createChatCompletion(
  {
    model: "<MODEL_NAME>", // Optional
    prompt: "<PROMPT>",
    systemRole: "<SYSTEM_ROLE>", // Optional
    vectorColumn: "<VECTOR_COLUMN_NAME>",
    stream: false,
    temperature: 0, // Optional
    embeddingParams: {
      model: "<MODEL_NAME>", // Optional
      dimensions: "<VECTOR_DIMENSTION>", // Optional
    }, // Optional
  },
  {
    select: ["<COLUMN_NAME>"], // Optional
    where: { columnName: "<COLUMN_VALUE>" }, // Optional
    limit: 1, // Optional
  }, // Optional
);
```

##### As Stream

Performs a chat completion and returns the result as a stream of data chunks.

```ts
const stream = await table.createChatCompletion(
  {
    stream: true,
    ...
  },
);

const chatCompletion = await ai.chatCompletions.handleStream(stream, (chunk) => {
  console.log(chunk);
});
```

##### With Custom Tools

You can also integrate custom tools to extend the functionality of the chat completion.

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

await table.createChatCompletion({
  tools: [customTool],
  ...
});
```

##### Additional Notes

- The second argument of the `createChatCompletion` method accepts the same options as the second argument of the `vectorSearch` method, such as `select`, `where`, and `limit`.
- When using `stream: true`, the `handleStream` function is used to process the stream. It accepts a callback as the second argument, which handles each new chunk of data as it arrives.

---

### Column

##### Use Column

```ts
const column = table.column.use("<COLUMN_NAME>");
```

---

#### Add Column

```ts
const column = await table.column.add({
  name: "<NEW_COLUMN_NAME>",
  type: "BIGINT",
  autoIncrement: false, // Optional
  primaryKey: false, // Optional
  nullable: true, // Optional
  default: 0, // Optional
  clauses: ["<CUSTOM_CLAUSE>"], // Optional
});
```

---

#### Modify Column

##### By Column Name

```ts
await table.column.modify("<COLUMN_NAME>", {
  type: "BIGINT",
  autoIncrement: false, // Optional
  primaryKey: false, // Optional
  nullable: true, // Optional
  default: 0, // Optional
  clauses: ["<CUSTOM_CLAUSE>"], // Optional
});
```

##### Selected Column

```ts
await column.modify(...)
```

---

#### Rename Column

##### By Column Name

```ts
await table.column.rename("<COLUMN_NAME>", "<NEW_COLUMN_NAME>");
```

##### Selected Column

```ts
await column.modify("<NEW_COLUMN_NAME>");
```

---

#### Drop Column

##### By Column Name

```ts
await table.column.drop("<COLUMN_NAME>");
```

##### Selected Column

```ts
await column.drop();
```

---

#### Show Column Info

##### By Column Name

```ts
await table.column.showInfo("<COLUMN_NAME>");
```

##### Selected Column

```ts
await column.showInfo();
```

---

### Billing

#### Get Billing

```ts
const billing = await client.billing.get({
  metric: "ComputeCredit", // Supported values: "ComputeCredit" | "StorageAvgByte"
  startTime: new Date("2024-01-01"),
  endTime: new Date("2024-01-09"),
  aggregateBy: "month", // Supported values: "hour", "day", "month"; Optional
});
```

---

### Region

#### Get Region

##### Get All Regions

```ts
const regions = await client.region.get();
```

##### Get Region By ID

```ts
const region = await client.region.get({ id: "<REGION_ID>" });
```

##### Get Region By Name

```ts
const region = await client.region.get({ name: "<REGION_NAME>" });
```

##### Additional Notes

- To find all available region names, follow this [link](https://github.com/singlestore-labs/singlestore/blob/67e9c837465c130525300a8fdff7acb9abc6e056/packages/client/src/region/region.ts#L3)

---

### Team

#### Get Team

##### Get All Teams

```ts
const teams = await client.team.get();
```

##### Get Team By ID

```ts
const team = await client.team.get({ id: "<TEAM_ID>" });
```

##### Get Team By Name

```ts
const team = await client.team.get({ name: "<TEAM_NAME>" });
```

##### Get Team By Description

```ts
const team = await client.team.get({ description: "<TEAM_DESCRIPTION>" });
```

---

#### Create Team

```ts
const team = await client.team.create({
  name: "<TEAM_NAME>",
  description: "<TEAM_DESCRIPTION>", // Optional
  memberTeams: ["<TEAM_ID>"], // Optional
  memberUsers: ["<USER_ID>"], // Optional
});
```

---

#### Update Team

##### By Team ID

```ts
await client.team.update("<TEAM_ID>", {
  name: "<NEW_TEAM_NAME>", // Optional
  description: "<NEW_TEAM_DESCRIPTION>", // Optional
});
```

##### Selected Team

```ts
await team.update(...);
```

---

#### Delete Team

##### By Team ID

```ts
await client.team.delete("<TEAM_ID>");
```

##### Selected Team

```ts
await team.delete();
```

---

#### Add Team Member

##### Add Team

###### By Team ID

```ts
await client.team.addMemberTeams("<TEAM_ID>", ["<ADD_TEAM_ID>"]);
```

###### Selected Team

```ts
await team.addMemberTeams(["<ADD_TEAM_ID>"]);
```

##### Add User

###### By Team ID

```ts
await client.team.addMemberUsers("<TEAM_ID>", ["<ADD_USER_ID>"]);
```

###### Selected Team

```ts
await team.addMemberUsers(["<ADD_USER_ID>"]);
```

---

#### Remove Team Member

##### Remove Team

###### By Team ID

```ts
await client.team.removeMemberTeams("<TEAM_ID>", ["<REMOVE_TEAM_ID>"]);
```

###### Selected Team

```ts
await team.removeMemberTeams(["<REMOVE_TEAM_ID>"]);
```

##### Remove User

###### By Team ID

```ts
await client.team.removeMemberUsers("<TEAM_ID>", ["<REMOVE_USER_ID>"]);
```

###### Selected Team

```ts
await team.removeMemberUsers(["<REMOVE_USER_ID>"]);
```

---

### Job

#### Get Job

```ts
const job = client.job.get("<JOB_ID>");
```

---

#### Create Job

```ts
const job = await client.job.create({
  name: "<JOB_NAME>", // Optional
  description: "<JOB_DESCRIPTION>", // Optional
  executionConfig: {
    notebookPath: "<NOTEBOOK_NAME.ipynb>",
    createSnapshot: true,
    runtimeName: "notebooks-cpu-small",
  },
  schedule: {
    mode: "Recurring", // Supported values: "Once" | "Recurring"
    executionIntervalInMinutes: 60,
    startAt: new Date("2025-01-01"),
  },
  targetConfig: {
    databaseName: "<DATABASE_NAME>",
    resumeTarget: true,
    targetID: "<TARGET_ID>",
    targetType: "Workspace", // Supported values: "Workspace" | "Cluster" | "VirtualWorkspace"
  }, // Optional
});
```

---

#### Delete Job

##### By Job ID

```ts
await client.job.delete("<JOB_ID>");
```

##### Selected Job

```ts
await job.delete();
```

---

#### Get Job Executions

##### By Job ID

```ts
const executions = await client.job.getExecutions("<JOB_ID>", 1, 10);
```

##### Selected Job

```ts
const executions = await job.getExecutions(1, 10);
```

---

#### Get Job Parameters

##### By Job ID

```ts
const parameters = await client.job.getParameters("<JOB_ID>");
```

##### Selected Job

```ts
const parameters = await job.getParameters();
```

---

#### Get Job Runtimes

```ts
const runtimes = await client.job.getRuntimes();
```

---

### Secret

#### Get Secret

##### Get All Secrets

```ts
const secrets = await client.secret.get();
```

##### Get By Secret ID

```ts
const secret = await client.secret.get({ id: "<SECRET_ID>" });
```

##### Get By Secret Name

```ts
const secret = await client.secret.get({ name: "<SECRET_NAME>" });
```

---

#### Create Secret

```ts
const secret = await client.secret.create({
  name: "<SECRET_NAME>",
  value: "<SECRET_VALUE>",
});
```

---

#### Update Secret

##### By Secret ID

```ts
const secret = await client.secret.update("<SECRET_ID>", "<NEW_SECRET_VALUE>");
```

##### Selected Secret

```ts
const secret = await secret.update("<NEW_SECRET_VALUE>");
```

---

#### Delete Secret

##### By Secret ID

```ts
await client.secret.delete("<SECRET_ID>");
```

##### Selected Secret

```ts
await secret.delete();
```

---

### Stage

- Folder path example: `folderName/`
- File path example: `folderName/fileName.json`

#### Get All Stage

```ts
const stage = await workspaceGroup.stage.get();
```

#### Get Stage Folder

```ts
const stage = await workspaceGroup.stage.get("<STAGE_PATH>/");
```

```ts
const nextStage = await stage.get("<STAGE_PATH>/");
```

#### Get Stage File

```ts
const stage = await workspaceGroup.stage.get("<STAGE_PATH>");
```

```ts
const nextStage = await stage.get("<STAGE_PATH>");
```

---

#### Update Stage

##### By Stage Path

```ts
await workspaceGroup.stage.update("<STAGE_PATH>", { newPath: "<NEW_STAGE_PATH>" });
```

##### Selected Stage

```ts
await stage.update({ newPath: "<NEW_STAGE_PATH>" });
```

##### Additional Notes

---

#### Create Stage Folder

##### In Stage Path

```ts
const newStage = await workspaceGroup.stage.createFolder("<NEW_STAGE_PATH>", "NEW_STAGE_NAME");
```

##### In Selected Stage

```ts
const newStage = stage.createFolder(
  "<NEW_STAGE_NAME>",
  "<NEW_STAGE_PATH>", // Optional
);
```

---

#### Delete Stage

##### By Stage Path

```ts
await workspaceGroup.stage.delete("<STAGE_PATH>");
```

##### Selected Stage

```ts
await stage.delete();
```

---

### Storage

#### Get Storage Regions

```ts
const regions = await workspaceGroup.storage.getRegions();
```

---

#### Get Storage Status

```ts
const status = await workspaceGroup.storage.getStatus();
```

---
