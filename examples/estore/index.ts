import { AI } from "@singlestore/ai";
import { DatabaseTablesToRecords, SingleStoreClient } from "@singlestore/client";

/**
 * Main function to set up and interact with the SingleStore database
 * and AI functionalities.
 */
async function main() {
  try {
    console.log("Initializing AI instance...");
    const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });
    console.log("AI instance created.");

    console.log("Initializing SingleStore client...");
    const client = new SingleStoreClient({ ai });
    console.log("SingleStore client initialized.");

    console.log("Connecting to workspace...");
    const connection = client.connect({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    console.log("Connected to workspace.");

    console.log("Setting up database schema for better TypeScript support...");
    interface Database {
      name: "estore_example";
      tables: {
        users: {
          id: number;
          name: string;
        };
        products: {
          id: number;
          name: string;
          description: string;
          price: number;
          description_v: string;
        };
      };
    }

    console.log("Dropping existing database if it exists...");
    await connection.database.drop("estore_example");
    console.log("Database dropped.");

    console.log("Creating new database...");
    const db = await connection.database.create<Database>({
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
    console.log("Database created.");

    console.log("Generating dataset...");
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
    console.log("Dataset generated.");

    console.log("Creating product embeddings using AI...");
    dataset.products = await Promise.all(
      dataset.products.map(async (product) => ({
        ...product,
        description_v: JSON.stringify((await ai.embeddings.create(product.description))[0]),
      })),
    );
    console.log("Product embeddings created.");

    console.log("Inserting dataset into the database...");
    await Promise.all([db.table.use("users").insert(dataset.users), db.table.use("products").insert(dataset.products)]);
    console.log("Dataset inserted.");

    console.log('Finding user with name "Alice"...');
    console.log(await db.table.use("users").find({ where: { name: "Alice" } }));

    console.log("Finding products priced under 300...");
    console.log(
      await db.table.use("products").find({ select: ["id", "name", "description", "price"], where: { price: { lte: 300 } } }),
    );

    console.log('Finding products with name "Smartphone" priced at 800...');
    console.log(
      await db.table
        .use("products")
        .find({ select: ["id", "name", "description", "price"], where: { name: "Smartphone", price: { lte: 800 } } }),
    );

    console.log("Executing custom query to select all users...");
    console.log(await db.query<[Database["tables"]["users"][]]>("SELECT * FROM users"));

    const usersTable = db.table.use("users");

    console.log("Creating chat completion...\nPrompt: 'What is 4+4?'");
    console.log(await ai.chatCompletions.create({ prompt: "What is 4+4?" }));

    console.log("Executing column methods...");
    console.log('Adding a new column "age_new" to the users table...');
    await usersTable.column.add({ name: "age_new", type: "int" });

    console.log('Renaming column "age_new" to "age"...');
    console.log(await usersTable.column.use("age_new").rename("age"));

    console.log('Dropping column "age"...');
    console.log(await usersTable.column.use("age").drop());

    console.log("Executing table methods...");
    console.log("Inserting a new user named John into the users table...");
    console.log(await usersTable.insert({ name: "John" }));

    console.log("Updating user's name from John to John Wick...");
    console.log(await usersTable.update({ name: "John Wick" }, { name: "John" }));

    console.log("Deleting user named John Wick...");
    console.log(await usersTable.delete({ name: "John Wick" }));

    console.log('Renaming users table to "users_old"...');
    console.log(await usersTable.rename("users_old"));

    console.log('Truncating "users_old" table...');
    console.log(await usersTable.truncate());

    console.log('Dropping "users_old" table...');
    console.log(await usersTable.drop());

    console.log("Executing database methods...");
    console.log('Creating "users" table...');
    const newUsersTable = await db.table.create<"users", Database["tables"]["users"]>({
      name: "users",
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        name: { type: "varchar(32)" },
      },
    });

    await newUsersTable.insert(dataset.users);

    console.log('Using the "users" table...');
    db.table.use("users");

    console.log("Executing table AI methods...");
    const prompt_19_1 = "This product can suppress surrounding noise.";
    console.log(`Finding noise-cancelling headphone name and description using vector search.\nPrompt: ${prompt_19_1}`);
    console.log(
      await db.table
        .use("products")
        .vectorSearch({ prompt: prompt_19_1, vectorColumn: "description_v" }, { select: ["name", "description"], limit: 1 }),
    );

    const prompt_19_2 = "What monitor do I have in my store?";
    console.log(`Creating chat completion based on vector search results and prompt.\nPrompt: ${prompt_19_2}`);
    console.log(
      await db.table
        .use("products")
        .createChatCompletion(
          { prompt: prompt_19_2, vectorColumn: "description_v" },
          { select: ["name", "description", "price"], limit: 1 },
        ),
    );

    console.log("Process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("An error occurred during the execution:", error);
    process.exit(1);
  }
}

main();
