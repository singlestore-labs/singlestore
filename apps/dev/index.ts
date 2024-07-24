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
  const dbName = "singlestore_client";

  const client = new SingleStoreClient();

  const workspace = await client.workspace<{
    databases: { singlestore_client: SingleStoreClientDatabase };
  }>({
    name: "workspace-1",
    host: process.env.DB_HOST ?? "",
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
  });

  await workspace.dropDatabase(dbName);

  const db = await workspace.createDatabase<SingleStoreClientDatabase>({
    name: dbName,
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
    .select(
      { name: { in: ["Kate", "James"] } },
      { columns: ["id", "name"], limit: 5, orderBy: { name: "asc" }, groupBy: ["name"] },
    );
  console.dir({ users });

  console.log("Update user");
  const updatedUser = await db.table("users").update({ name: "Test" }, { id: users[1]?.id || 1 });
  console.dir(updatedUser);

  console.log("Delete user");
  const deletedUser = await db.table("users").delete({ id: users[0]?.id || 1 });
  console.dir(deletedUser);
}

main();
