export interface PrivateConnectionSchema {
  privateConnectionID: string;
  workspaceGroupID: string;
  workspaceID: string;
  serviceName: string;
  type: "INBOUND" | "OUTBOUND";
  status: "PENDING" | "ACTIVE" | "DELETED";
  allowList: string;
  outboundAllowList: string;
  createdAt: string;
  deletedAt: string;
  updatedAt: string;
  activeAt: string;
}

export interface PrivateConnection extends Omit<PrivateConnectionSchema, "createdAt" | "deletedAt" | "updatedAt" | "activeAt"> {
  createdAt: Date;
  deletedAt: Date;
  updatedAt: Date;
  activeAt: Date;
}
