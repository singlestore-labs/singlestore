import { SingleStoreClient } from "@singlestore/client";

async function main() {
  const client = new SingleStoreClient();

  const myWorkspace = await client.workspace.connect({ host: "test", user: "test", password: "test" });

  const myDatabase = await myWorkspace.createDatabase({
    name: "myDatabase",
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "bigint", primaryKey: true, autoIncrement: true },
          { name: "name", type: "varchar(32)", nullable: false },
        ],
      },
    ],
  });

  const usersTable = myDatabase.table("users");
}

// main();
