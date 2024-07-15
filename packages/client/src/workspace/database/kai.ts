import { AbstractWorkspaceDatabase } from "./abstract";

export class KaiWorkspaceDatabase extends AbstractWorkspaceDatabase<"kai"> {
  async create(): Promise<void> {}

  async drop(): Promise<void> {}
}
