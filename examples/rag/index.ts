import { createInterface } from "readline/promises";

import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";
import { describeDatabaseChatTool, RAG, textToSQLChatTool, vectorSearchChatTool } from "@singlestore/rag";

/**
 * Interface for defining the database schema.
 */
interface Database {
  name: "estore_example";
  tables: {
    users: {
      name: "users";
      columns: {
        id: number;
        name: string;
      };
    };
    products: {
      name: "products";
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

/**
 * Main function to initialize AI, database connection, and handle user chat.
 */
async function main() {
  // Initialize the readline interface for user input.
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("Initializing AI instance...");
    const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });
    console.log("AI instance created.");

    console.log("Initializing SingleStore client...");
    const client = new SingleStoreClient({ ai });
    console.log("SingleStore client initialized.");

    console.log("Connecting to workspace...");
    const workspace = client.workspace({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    console.log("Connected to workspace.");

    console.log("Accessing the 'estore_example' database...");
    const database = workspace.database<Database>("estore_example");
    console.log("Database accessed.");

    console.log("Initializing RAG system...");
    const rag = new RAG({ database, ai });
    console.log("RAG system initialized.");

    console.log("Creating chat instance with integrated tools...");
    const chat = await rag.createChat({
      tools: [
        describeDatabaseChatTool(database),
        textToSQLChatTool(database, ai, { model: "gpt-4o-mini" }),
        vectorSearchChatTool(database),
      ],
    });
    console.log("Chat instance created.");

    const session = await chat.createSession();

    while (true) {
      const prompt = await rl.question("You: ");

      if (prompt.trim().toLowerCase() === "bye") {
        console.log("Assistant: Goodbye!");
        rl.close();
        process.exit(0);
      }

      const stream = await session.createChatCompletion({
        prompt,
        stream: true,
        loadHistory: true,
        loadDatabaseSchema: true,
      });

      process.stdout.write("Assistant: ");
      for await (const chatCompletion of stream) {
        process.stdout.write(chatCompletion.content);
      }
      console.log("");
    }
  } catch (error) {
    console.error("An error occurred during execution:", error);
    rl.close();
    process.exit(1);
  }
}

main();
