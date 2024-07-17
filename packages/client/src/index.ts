import { Workspace } from "./workspace";

export class SingleStoreClient {
  workspace = {
    connect: Workspace.connect,
  };
}
