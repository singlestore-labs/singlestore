import { Workspace } from "./workspace";

export type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export class SingleStoreClient {
  workspace = Workspace.connect;
}
