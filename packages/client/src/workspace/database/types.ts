import { WorkspaceType } from "../types";
import { KaiWorkspaceDatabase } from "./kai";
import { SQLWorkspaceDatabase } from "./sql";

export type WorkspaceDatabase<T extends WorkspaceType = any> = T extends "sql" ? SQLWorkspaceDatabase : KaiWorkspaceDatabase;
