import type { API } from "../api";

import { APIManager } from "../api/manager";

export interface TeamMemberTeamSchema {
  teamID: string;
  name: string;
  description: string;
}

export interface TeamMemberTeam extends Omit<TeamMemberTeamSchema, "teamID"> {
  id: string;
}

export interface TeamMemberUserSchema {
  userID: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TeamMemberUser extends Omit<TeamMemberUserSchema, "userID"> {
  id: string;
}

export interface TeamSchema {
  teamID: string;
  name: string;
  description: string;
  memberTeams: TeamMemberTeamSchema[] | undefined;
  memberUsers: TeamMemberUserSchema[] | undefined;
  createdAt: string;
}

export interface UpdateTeamBody extends Partial<Pick<TeamSchema, "name" | "description">> {}

export class Team extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    public id: TeamSchema["teamID"],
    public name: TeamSchema["name"],
    public description: TeamSchema["description"],
    public memberTeams: TeamMemberTeam[] | undefined,
    public memberUsers: TeamMemberUser[] | undefined,
    public createdAt: Date,
  ) {
    super(api);
    this._baseUrl = `/teams/${this.id}`;
  }

  static async update(api: API, id: TeamSchema["teamID"], body: UpdateTeamBody): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return response.teamID;
  }

  static async delete(api: API, id: TeamSchema["teamID"]): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, { method: "DELETE" });
    return response.teamID;
  }

  static async addMemberTeams(
    api: API,
    id: TeamSchema["teamID"],
    teamIDs: TeamMemberTeamSchema["teamID"][],
  ): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ addMemberTeamIDs: teamIDs }),
    });

    return response.teamID;
  }

  static async removeMemberTeams(
    api: API,
    id: TeamSchema["teamID"],
    teamIDs: TeamMemberTeamSchema["teamID"][],
  ): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ removeMemberTeamIDs: teamIDs }),
    });

    return response.teamID;
  }

  static async addMemberUsers(
    api: API,
    id: TeamSchema["teamID"],
    userIDs: TeamMemberUserSchema["userID"][],
  ): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ addMemberUserIDs: userIDs }),
    });

    return response.teamID;
  }

  static async removeMemberUsers(
    api: API,
    id: TeamSchema["teamID"],
    userIDs: TeamMemberUserSchema["userID"][],
  ): Promise<TeamSchema["teamID"]> {
    const response = await api.execute<Pick<TeamSchema, "teamID">>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ removeMemberUserIDs: userIDs }),
    });

    return response.teamID;
  }

  async update(body: UpdateTeamBody) {
    return Team.update(this._api, this.id, body);
  }

  async delete() {
    return Team.delete(this._api, this.id);
  }

  async addMemberTeams(teamIDs: TeamMemberTeamSchema["teamID"][]) {
    return Team.addMemberTeams(this._api, this.id, teamIDs);
  }

  async removeMemberTeams(teamIDs: TeamMemberTeamSchema["teamID"][]) {
    return Team.removeMemberTeams(this._api, this.id, teamIDs);
  }

  async addMemberUsers(userIDs: TeamMemberUserSchema["userID"][]) {
    return Team.addMemberUsers(this._api, this.id, userIDs);
  }

  async removeMemberUsers(userIDs: TeamMemberUserSchema["userID"][]) {
    return Team.removeMemberUsers(this._api, this.id, userIDs);
  }
}
