import { AbstractWorkspaceDatabase } from "./abstract";

export class SQLWorkspaceDatabase extends AbstractWorkspaceDatabase<"sql"> {
  async create(): Promise<void> {}

  async drop(): Promise<void> {}
}
