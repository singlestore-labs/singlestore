import { ChatCompletionTool } from "@singlestore/ai";
import { type AnyDatabase } from "@singlestore/client";
import z from "zod";

export function createChatTools<T extends AnyDatabase>(database: T) {
  return {
    database_describe: new ChatCompletionTool({
      name: "database_describe",
      description:
        "Generates a detailed description of the database schema, including tables, columns, and data types. This tool provides a JSON representation of the structure, which can be useful for understanding the database layout, debugging, or automating schema-related tasks.",
      call: async () => {
        const rows = await database.describe();
        return { name: "database_describe", value: JSON.stringify(rows) };
      },
    }),

    vector_search: new ChatCompletionTool({
      name: "vector_search",
      description: "Executes a vector-based search across specified tables to find data.",
      schema: z.object({
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
    }),
  } as const;
}
