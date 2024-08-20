import { ChatCompletionTool } from "@singlestore/ai";
import { type AnyDatabase } from "@singlestore/client";
import z from "zod";

export function createVectorSearchChatTool<T extends AnyDatabase>(database: T) {
  return new ChatCompletionTool({
    name: "vector_search",
    description: "Executes vector search over provided tables",
    schema: z.object({ prompt: z.string(), table: z.string(), column: z.string() }),
    call: async (params) => {
      return { name: "vector_search", params, value: "" };
    },
  });
}
