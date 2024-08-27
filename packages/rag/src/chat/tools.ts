import { type AnyAI, ChatCompletionTool } from "@singlestore/ai";
import { type AnyDatabase } from "@singlestore/client";
import z from "zod";

/**
 * Creates a `ChatCompletionTool` that generates a detailed description of the database schema.
 *
 * @typeParam TDatabase - The type of the database.
 *
 * @param {TDatabase} database - The database instance to describe.
 *
 * @returns {ChatCompletionTool} A chat tool that, when called, returns a JSON string describing the database schema.
 */
export function describeDatabaseChatTool<TDatabase extends AnyDatabase>(database: TDatabase) {
  return new ChatCompletionTool({
    name: "database_describe",
    description: "Generates a detailed description of the database schema, including tables, columns, and data types.",
    call: async () => {
      const schema = await database.describe();
      return { name: "database_describe", value: JSON.stringify(schema) };
    },
  });
}

/**
 * Creates a `ChatCompletionTool` that generates and executes a MySQL SELECT query based on a natural language prompt.
 *
 * @typeParam TDatabase - The type of the database.
 * @typeParam TAi - The type of AI functionalities integrated with the tool.
 *
 * @param {TDatabase} database - The database instance on which the query will be executed.
 * @param {TAi} ai - The AI instance used to generate the query.
 * @param {Object} [options] - Optional configuration for the AI model.
 * @param {string} [options.model] - The specific AI model to use for generating the query.
 *
 * @returns {ChatCompletionTool} A chat tool that, when called, generates and executes a MySQL SELECT query.
 */
export function textToSQLChatTool<TDatabase extends AnyDatabase, TAi extends AnyAI>(
  database: TDatabase,
  ai: TAi,
  options?: { model?: Awaited<ReturnType<TAi["chatCompletions"]["getModels"]>>[number] },
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

/**
 * Creates a `ChatCompletionTool` that executes a vector-based search across specified tables to find data.
 *
 * @typeParam TDatabase - The type of the database.
 *
 * @param {TDatabase} database - The database instance on which the vector search will be performed.
 *
 * @returns {ChatCompletionTool} A chat tool that, when called, performs a vector search and returns the result.
 */
export function vectorSearchChatTool<TDatabase extends AnyDatabase>(database: TDatabase) {
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
