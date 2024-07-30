import { ResultSetHeader, SingleStoreClient } from "@singlestore/client";
import { AI } from "@singlestore/ai";

async function main() {
  interface SingleStoreClientDatabase {
    tables: {
      users: {
        columns: {
          id: number;
          name: string;
        };
      };
    };
  }

  const client = new SingleStoreClient();

  const workspace = await client.workspace<{
    databases: { singlestore_client: SingleStoreClientDatabase };
  }>({
    name: "workspace-1",
    host: process.env.DB_HOST ?? "",
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
  });

  await workspace.dropDatabase("singlestore_client");

  const db = await workspace.createDatabase<SingleStoreClientDatabase>({
    name: "singlestore_client",
    tables: {
      users: {
        columns: {
          id: { type: "bigint", autoIncrement: true, primaryKey: true },
          name: { type: "varchar(32)" },
        },
      },
    },
  });

  console.log("Insert one user");
  const insertedUser = await db.table("users").insert({ name: "Kate" });
  console.dir(insertedUser);

  console.log("Insert many users");
  const insertedUsers = await db.table("users").insert([{ name: "James" }, { name: "John" }, { name: "Alex" }]);
  console.dir(insertedUsers);

  console.log("Select users");
  const [users] = await db
    .table("users")
    .select({ name: { in: ["Kate", "James"] } }, { limit: 5, orderBy: { name: "asc" }, groupBy: ["name"] });
  console.dir({ users });

  console.log("Select user ids");
  const [userIds] = await db.table("users").select({ columns: ["id"], limit: 5, orderBy: { name: "asc" } });
  console.dir({ userIds });

  console.log("Update user");
  const updatedUser = await db.table("users").update({ name: "Test" }, { id: users[1]?.id || 1 });
  console.dir(updatedUser);

  console.log("Delete user");
  const deletedUser = await db.table("users").delete({ id: users[0]?.id || 1 });
  console.dir(deletedUser);

  console.log("Query");
  const queryResult = await db.query<[{ id: number }[], ResultSetHeader]>("SELECT id FROM users; SET @var = 1");
  console.dir({ queryResult }, { depth: 3 });
}

async function ai() {
  const ai = new AI({
    openAIApiKey: process.env.OPENAI_API_KEY || "",
  });

  const chatCompletionStream = await ai.llm.createChatCompletion("Where is Vancouver located?");
  let chatCompletion = "";
  for await (const chunk of chatCompletionStream) {
    chatCompletion += chunk.choices[0]?.delta.content || "";
  }
  console.dir({ chatCompletion });

  const vancouverEmbedding = await ai.embeddings.create("Vancouver");
  console.dir({ vancouverEmbedding }, { depth: 3 });
}

// main();
ai();
