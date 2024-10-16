import { type AnyAI, ChatCompletionTool } from "@singlestore/ai";
import z from "zod";

import type { AnyDatabase } from "@singlestore/client";

export function describeDatabaseChatTool(database: AnyDatabase) {
  return new ChatCompletionTool({
    name: "database_describe",
    description: "Generates a detailed description of the database schema, including tables, columns, and data types.",
    call: async () => {
      const schema = await database.describe();
      return { name: "database_describe", value: JSON.stringify(schema) };
    },
  });
}

export function textToSQLChatTool<TAI extends AnyAI>(
  database: AnyDatabase,
  ai: TAI,
  options?: { model?: Awaited<ReturnType<TAI["chatCompletions"]["getModels"]>>[number] },
) {
  return new ChatCompletionTool({
    name: "query_database",
    description:
      "Generates and executes a MySQL SELECT query based on a natural language prompt, adhering to the provided database schema.",
    params: z.object({
      prompt: z.string().describe("A natural language description of the data you wish to retrieve from the database."),
    }),
    call: async (params) => {
      let value = "";
      const schema = await database.describe();

      const query = await ai.chatCompletions.create({
        stream: false,
        model: options?.model,
        prompt: params.prompt,
        systemRole: `\
          You are a MySQL database expert.
          Generate a valid MySQL SELECT query based on the following database schema: ${JSON.stringify(schema)}

          The query must adhere to these rules:
          - Only SELECT operations are allowed.
          - Exclude any columns ending with "_v".

          Respond with the MySQL query only, without any additional formatting.
        `,
      });

      if (query && "content" in query && typeof query.content === "string") {
        const [rows] = await database.query(query.content);
        value = JSON.stringify(rows);
      }

      return { name: "query_database", params, value };
    },
  });
}

export function vectorSearchChatTool(database: AnyDatabase) {
  return new ChatCompletionTool({
    name: "vector_search",
    description: "Executes a vector-based search across specified tables to find data.",
    params: z.object({
      prompt: z.string(),
      tableName: z
        .string()
        .describe(
          "Specifies the target table within the database where the vector search should be conducted. The table must contain a column with vector data that corresponds to the search query.",
        ),
      vectorColumn: z
        .string()
        .describe(
          "Indicates the specific column in the target table that holds vector representations. This column is used to perform similarity matching based on the input prompt.",
        ),
      where: z
        .object({})
        .catchall(z.any())
        .optional()
        .describe(
          "An optional filter object used to specify conditions for querying data. The object should contain dynamic key-value pairs, where each key represents a column name and its corresponding value is the condition for that column.",
        ),
    }),
    call: async (params) => {
      const rows = await database.table
        .use(params.tableName)
        .vectorSearch({ prompt: params.prompt, vectorColumn: params.vectorColumn }, { where: params.where, limit: 1 });

      const value = rows[0] ?? "";
      if (value) delete value[params.vectorColumn];

      return { name: "vector_search", params, value: JSON.stringify(value) };
    },
  });
}
