import { SingleStoreClient } from "@singlestore/client";

(async () => {
  try {
    const singleStoreClient = new SingleStoreClient();

    // const sqlWorkspace = await singleStoreClient.workspace.connect("sql", {
    //   host: process.env.DB_HOST || "",
    //   user: process.env.DB_USER || "",
    //   password: process.env.DB_PASSWORD || "",
    // });

    // const kaiWorkspace = await singleStoreClient.workspace.connect("kai", {
    //   url: process.env.KAI_URL || "",
    // });
  } catch (error) {
    console.error(error);
  }
})();
