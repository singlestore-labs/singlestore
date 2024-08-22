import { AI, ChatCompletionTool } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";
import { RAG } from "@singlestore/rag";
import z from "zod";

async function main() {
  try {
    const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });
    const client = new SingleStoreClient({ ai });

    const workspace = client.workspace({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    interface Database {
      tables: {
        products: {
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

    const database = workspace.database<Database>("estore_example");

    const vectorSearchTool = new ChatCompletionTool({
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
    });

    const rag = new RAG({ database, ai });

    const chat = await rag.createChat({ tools: [vectorSearchTool] });

    const session = await chat.createSession();

    const responseStream = await session.createChatCompletion({
      prompt: "Find product X in the Y table by the Z column",
      stream: true,
    });

    const responseText = await ai.chatCompletions.handleStream(responseStream, (chunk) => console.log(chunk));

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
