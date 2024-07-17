import { SingleStoreClient } from "@singlestore/client";

(async () => {
  try {
    const singleStoreClient = new SingleStoreClient();

    const workspace = await singleStoreClient.workspace.connect({
      host: process.env.DB_HOST || "",
      user: process.env.DB_USER || "",
      password: process.env.DB_PASSWORD || "",
    });

    const dbName = "test_1";

    // await workspace.database.drop(dbName);

    const database = await workspace.database.create({
      name: dbName,
      tables: [
        {
          name: "users",
          columns: [{ name: "id", type: "BIGINT", primaryKey: true, autoIncrement: true }],
        },
      ],
    });

    // await database.table.create({
    //   name: "products",
    //   columns: [{ name: "name", type: "varchar(32)" }],
    // });

    // await database.table.rename("products", "store");
    // console.log(await database.table("users").describe());
    // database.table('users').column('name').

    // await database.table("products").column("stock_2").rename("stock");
    // await database.table("products").column("stock_2").modify({ type: "bigint" });
  } catch (error) {
    console.error(error);
  }
})();
