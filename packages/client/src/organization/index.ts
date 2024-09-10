export interface OrganizationSchema {
  orgID: string;
  name: string;
}

export interface Organization extends Omit<OrganizationSchema, "orgID"> {
  id: string;
}
