import type { Tail } from "@repo/utils";

import { APIManager } from "../api/manager";

import { Team, type TeamMemberTeamSchema, type TeamMemberUserSchema, type TeamSchema } from "./team";

export interface CreateTeamBody {
  name: TeamSchema["name"];
  description?: TeamSchema["description"];
  memberTeams?: TeamMemberTeamSchema["teamID"][];
  memberUsers?: TeamMemberUserSchema["userID"][];
}

export class TeamManager extends APIManager {
  protected _baseURL: string = "/teams";

  private _create(data: TeamSchema): Team {
    return new Team(
      this._api,
      data.teamID,
      data.name,
      data.description,
      data.memberTeams?.map(({ teamID, ...team }) => ({ ...team, id: teamID })),
      data.memberUsers?.map(({ userID, ...user }) => ({ ...user, id: userID })),
      new Date(data.createdAt),
    );
  }

  async create({ memberTeams, memberUsers, ...body }: CreateTeamBody) {
    let newTeam = await this._execute<TeamSchema>("", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (memberTeams?.length || memberUsers?.length) {
      await this._execute(`/${newTeam.teamID}`, {
        method: "PATCH",
        body: JSON.stringify({
          addMemberTeamIDs: memberTeams,
          addMemberUserIDs: memberUsers,
        }),
      });

      newTeam = await this._execute(`/${newTeam.teamID}`);
    }

    return this._create(newTeam);
  }

  async get<
    T extends
      | { id: TeamSchema["teamID"] }
      | { name: TeamSchema["name"] }
      | { description: TeamSchema["description"] }
      | undefined = undefined,
    _TReturnType = T extends undefined ? Team[] : Team | undefined,
  >(where?: T) {
    let url = "";
    const params = new URLSearchParams();

    if (where) {
      if ("id" in where) {
        url = `${url}/${where.id}`;
      } else {
        params.set(...Object.entries(where)[0]!);
      }
    }

    const response = await this._execute<T extends undefined ? TeamSchema[] : TeamSchema>(`${url}?${params.toString()}`);

    if (Array.isArray(response)) {
      return response.map((data) => this._create(data)) as _TReturnType;
    }

    return this._create(response) as _TReturnType;
  }

  async update(...args: Parameters<typeof Team.update> extends [any, ...infer Rest] ? Rest : never) {
    return Team.update(this._api, ...args);
  }

  async delete(...args: Tail<Parameters<typeof Team.delete>>) {
    return Team.delete(this._api, ...args);
  }

  async addMemberTeams(...args: Tail<Parameters<typeof Team.addMemberTeams>>) {
    return Team.addMemberTeams(this._api, ...args);
  }

  async removeMemberTeams(...args: Tail<Parameters<typeof Team.removeMemberTeams>>) {
    return Team.removeMemberTeams(this._api, ...args);
  }

  async addMemberUsers(...args: Tail<Parameters<typeof Team.addMemberUsers>>) {
    return Team.addMemberUsers(this._api, ...args);
  }

  async removeMemberUsers(...args: Tail<Parameters<typeof Team.removeMemberUsers>>) {
    return Team.removeMemberUsers(this._api, ...args);
  }
}
