import { SingleStoreClient } from "@singlestore/client";

async function main() {
  const client = new SingleStoreClient();

  const workspace = await client.workspace({
    name: "workspace-1",
    host: process.env.DB_HOST ?? "",
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
  });

  const db = await workspace.createDatabase<{
    tables: {
      users: {
        columns: {
          id: number;
          name: string;
        };
      };
    };
  }>({
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
}

main();
