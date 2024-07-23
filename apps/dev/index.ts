import { SingleStoreClient } from "@singlestore/client";

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

async function main() {
  const client = new SingleStoreClient();

  const workspace = await client.workspace<{
    databases: {
      singlestore_client: SingleStoreClientDatabase;
    };
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

  const usersTable = db.table("users");

  const users = await usersTable.find(
    { and: [{ id: { gte: 100 } }, { name: { in: ["James", "John"] } }] },
    { limit: 5, orderBy: { name: "asc" } },
  );

  console.dir({ users });

  console.dir(await usersTable.delete({ id: users[0]?.id || 1 }));
}

main();
