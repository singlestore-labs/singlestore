import type { API } from "../api";

import { APIManager } from "../api/manager";

export interface TeamMemberTeam {
  teamID: string;
  name: string;
  description: string;
}

export interface TeamMemberUser {
  userID: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TeamSchema {
  teamID: string;
  name: string;
  description: string;
  memberTeams: TeamMemberTeam[] | undefined;
  memberUsers: TeamMemberUser[] | undefined;
  createdAt: string;
}

export class Team extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    public id: TeamSchema["teamID"],
    public name: TeamSchema["name"],
    public description: TeamSchema["description"],
    public memberTeams: (Omit<TeamMemberTeam, "teamID"> & { id: string })[] | undefined,
    public memberUsers: (Omit<TeamMemberUser, "userID"> & { id: string })[] | undefined,
    public createdAt: Date,
  ) {
    super(api);
    this._baseUrl = `/teams/${this.id}`;
  }

  static async delete(api: API, id: TeamSchema["teamID"]): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, { method: "DELETE" });
    return response.teamID;
  }

  async delete() {
    return Team.delete(this._api, this.id);
  }
}
