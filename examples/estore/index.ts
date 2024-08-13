import { AI } from "@singlestore/ai";
import { DatabaseTablesToRecords, SingleStoreClient } from "@singlestore/client";

async function main() {
  try {
    console.log("1. Create an AI instance to add AI functionality to our app");
    const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });

    console.log("2. Create a SingleStoreClient instance to work with SingleStore");
    const client = new SingleStoreClient({ ai });

    console.log("3. Connect to a workspace");
    const workspace = client.workspace({
      name: "workspace-1",
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log("4. Create a database schema for better TypeScript experience");
    interface Database {
      tables: {
        users: {
          columns: {
            id: number;
            name: string;
          };
        };
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

    console.log("5. Drop database if exists");
    await workspace.dropDatabase("estore_example");

    console.log("6. Create a database");
    const db = await workspace.createDatabase<Database>({
      name: "estore_example",
      tables: {
        users: {
          columns: {
            id: { type: "bigint", autoIncrement: true, primaryKey: true },
            name: { type: "varchar(32)" },
          },
        },
        products: {
          columns: {
            id: { type: "bigint", autoIncrement: true, primaryKey: true },
            name: { type: "varchar(32)" },
            description: { type: "text" },
            price: { type: "int" },
            description_v: { type: "vector(1536)" },
          },
        },
      },
    });

    console.log("7. Generate a dataset");
    const dataset: DatabaseTablesToRecords<Database["tables"]> = {
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ],
      products: [
        { id: 1, name: "Laptop", description: "High performance laptop", price: 1200, description_v: "" },
        { id: 2, name: "Smartphone", description: "Latest model smartphone", price: 800, description_v: "" },
        { id: 3, name: "Headphones", description: "Noise cancelling headphones", price: 200, description_v: "" },
        { id: 4, name: "Monitor", description: "4K Ultra HD monitor", price: 400, description_v: "" },
        { id: 5, name: "Keyboard", description: "Mechanical keyboard", price: 100, description_v: "" },
      ],
    };

    console.log("8. Create product embeddings");
    dataset.products = await Promise.all(
      dataset.products.map(async (product) => ({
        ...product,
        description_v: JSON.stringify((await ai.embeddings.create(product.description))[0]),
      })),
    );

    console.log("9. Insert the dataset into the db");
    await Promise.all([db.table("users").insert(dataset.users), db.table("products").insert(dataset.products)]);

    console.log('10. Select a user named "Alice"');
    console.log(await db.table("users").select({ name: "Alice" }));

    console.log("11. Select products priced under 300");
    console.log(
      await db.table("products").select({ price: { lte: 300 } }, { columns: ["id", "name", "description", "price"] }),
    );

    console.log('12. Select products with the name "Smartphone" priced at 800');
    console.log(
      await db
        .table("products")
        .select({ name: "Smartphone", price: { lte: 800 } }, { columns: ["id", "name", "description", "price"] }),
    );

    console.log('13. Select products with the name "Smartphone" or "Laptop" priced above 500');
    console.log(
      await db
        .table("products")
        .select(
          { and: [{ or: [{ name: "Smartphone" }, { name: "Laptop" }] }, { price: { gt: 500 } }] },
          { columns: ["id", "name", "description", "price"] },
        ),
    );

    console.log("14. Select all users executing custom query");
    console.log(await db.query<[Database["tables"]["users"]["columns"][]]>("SELECT * FROM users"));

    const usersTable = db.table("users");

    console.log("15. Create a chat completion.\nPrompt: 'What is 4+4?");
    console.log(await ai.chatCompletions.create("What is 4+4?"));

    console.log("16. Column methods");

    console.log('16.1. Add the an "age_new" column to the users table');
    await usersTable.addColumn({ name: "age_new", type: "int" });

    console.log('16.2. Rename the "age_new" column to "age"');
    console.log(await usersTable.column("age_new").rename("age"));

    console.log('16.3. Drop the "age" column');
    console.log(await usersTable.column("age").drop());

    console.log("17. Table methods");

    console.log("17.1. Insert a new user named John into the users table");
    console.log(await usersTable.insert({ name: "John" }));

    console.log("17.2. Change the user name John to John Wick");
    console.log(await usersTable.update({ name: "John Wick" }, { name: "John" }));

    console.log("17.3. Delete the user named John Wick");
    console.log(await usersTable.delete({ name: "John Wick" }));

    console.log('17.4. Rename the users table to "users_old"');
    console.log(await usersTable.rename("users_old"));

    console.log('17.5. Truncate the "users_old" table');
    console.log(await usersTable.truncate());

    console.log('17.6. Drop the "users_old" table');
    console.log(await usersTable.drop());

    console.log("18. Database methods");

    console.log('18.1. Create a "users" table');
    await db.createTable<Database["tables"]["users"]>({
      name: "users",
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        name: { type: "varchar(32)" },
      },
    });

    console.log('18.2. Use the "users" table');
    db.table("users");

    console.log("19. Table AI methods");

    const prompt_19_1 = "This product can suppress surrounding noise.";
    console.log(`19.1. Find noise cancelling headphone name and description using vector search.\nPrompt: ${prompt_19_1}`);
    console.log(
      await db
        .table("products")
        .vectorSearch({ prompt: prompt_19_1, vectorColumn: "description_v" }, { columns: ["name", "description"], limit: 1 }),
    );

    const prompt_19_2 = "What monitor do I have in my store?";
    console.log(
      `19.2. Create a chat completion based on vector search results from the products table and a prompt.\nPrompt: ${prompt_19_2}`,
    );
    console.log(
      await db
        .table("products")
        .createChatCompletion(
          { prompt: prompt_19_2, vectorColumn: "description_v" },
          { columns: ["name", "description", "price"], limit: 1 },
        ),
    );

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
