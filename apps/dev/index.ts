import { SingleStoreClient } from "@singlestore/client";
import { AI } from "@singlestore/ai";

async function main() {
  const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY || "" });

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

  const client = new SingleStoreClient({ ai });

  const workspace = await client.workspace<{
    databases: { singlestore_client: SingleStoreClientDatabase };
  }>({
    name: "workspace-1",
    host: process.env.DB_HOST ?? "",
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
  });

  // await workspace.dropDatabase("singlestore_client");

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

  // console.log("Insert one user");
  // const insertedUser = await db.table("users").insert({ name: "Kate" });
  // console.dir(insertedUser);

  // console.log("Insert many users");
  // const insertedUsers = await db.table("users").insert([{ name: "James" }, { name: "John" }, { name: "Alex" }]);
  // console.dir(insertedUsers);

  // console.log("Select users");
  // const [users] = await db
  //   .table("users")
  //   .select({ name: { in: ["Kate", "James"] } }, { limit: 5, orderBy: { name: "asc" }, groupBy: ["name"] });
  // console.dir({ users });

  // console.log("Select user ids");
  // const [userIds] = await db.table("users").select({ columns: ["id"], limit: 5, orderBy: { name: "asc" } });
  // console.dir({ userIds });

  // console.log("Update user");
  // const updatedUser = await db.table("users").update({ name: "Test" }, { id: users[1]?.id || 1 });
  // console.dir(updatedUser);

  // console.log("Delete user");
  // const deletedUser = await db.table("users").delete({ id: users[0]?.id || 1 });
  // console.dir(deletedUser);

  // console.log("Query");
  // const queryResult = await db.query<[{ id: number }[], ResultSetHeader]>("SELECT id FROM users; SET @var = 1");
  // console.dir({ queryResult }, { depth: 3 });

  type CitiesTable = {
    columns: {
      id: number;
      name: string;
      description: string;
      description_embedding: any;
    };
  };

  // await db.dropTable("cities");

  const citiesTable = await db.createTable<CitiesTable>({
    name: "cities",
    columns: {
      id: { type: "bigint", autoIncrement: true, primaryKey: true },
      name: { type: "varchar(64)" },
      description: { type: "text" },
      description_embedding: { type: "VECTOR(1536)" },
    },
  });

  // const cities: Omit<CitiesTable["columns"], "id" | "description_embedding">[] = [
  //   {
  //     name: "New York",
  //     description:
  //       "The largest city in the United States, known for its diverse culture, iconic landmarks, and bustling atmosphere.",
  //   },
  //   {
  //     name: "Paris",
  //     description: "The capital city of France, famous for its art, fashion, gastronomy, and culture.",
  //   },
  //   {
  //     name: "Tokyo",
  //     description: "The capital city of Japan, renowned for its modernity, skyscrapers, and rich cultural heritage.",
  //   },
  //   {
  //     name: "Sydney",
  //     description: "A major city in Australia, known for its Sydney Opera House, Harbour Bridge, and beautiful beaches.",
  //   },
  //   {
  //     name: "Rio de Janeiro",
  //     description:
  //       "A vibrant city in Brazil, famous for its Carnival festival, Christ the Redeemer statue, and stunning landscapes.",
  //   },
  // ];

  // const citiesWithEmbeddings: Omit<CitiesTable["columns"], "id">[] = await Promise.all(
  //   cities.map(async (city) => {
  //     const embedding = (await ai.embeddings.create(city.description))[0];
  //     return { ...city, description_embedding: JSON.stringify(embedding) };
  //   }),
  // );

  // await citiesTable.insert(citiesWithEmbeddings);

  const vectorSearch = await citiesTable.vectorSearch(
    { prompt: "A vibrant city in Brazil", field: "description_embedding" },
    { columns: ["id", "name", "description"], limit: 3 },
  );
  console.dir({ vectorSearch }, { depth: 3 });
}

main();
