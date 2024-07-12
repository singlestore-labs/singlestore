import { SingleStoreClient } from "@singlestore/client";

(async () => {
  try {
    const singleStoreClient = new SingleStoreClient();

    // const sqlWorkspace = await singleStoreClient.workspace.connect("sql", {
    //   host: "",
    //   user: "",
    //   password: "",
    // });

    // const kaiWorkspace = await singleStoreClient.workspace.connect("kai", {
    //   url: "",
    // });
  } catch (error) {
    console.error(error);
  }
})();
