import { ChatCompletionTool } from "@singlestore/ai";
import { type AnyDatabase } from "@singlestore/client";
import z from "zod";

export function describeDatabaseChatTool<T extends AnyDatabase>(database: T) {
  return new ChatCompletionTool({
    name: "database_describe",
    description: "Generates a detailed description of the database schema, including tables, columns, and data types.",
    call: async () => {
      const schema = await database.describe();
      return { name: "database_describe", value: JSON.stringify(schema) };
    },
  });
}

export function vectorSearchChatTool<T extends AnyDatabase>(database: T) {
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
    }),
    call: async (params) => {
      const rows = await database
        .table(params.tableName)
        .vectorSearch({ prompt: params.prompt, vectorColumn: params.vectorColumn }, { limit: 1 });

      const value = rows[0];
      if (value) delete value[params.vectorColumn];

      return { name: "vector_search", params, value: JSON.stringify(value) };
    },
  });
}
