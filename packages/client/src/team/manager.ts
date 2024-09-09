import { APIManager } from "../api/manager";

import { Team, TeamSchema } from ".";

export class TeamManager extends APIManager {
  protected _baseUrl: string = "/teams";

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

  async delete(id: TeamSchema["teamID"]) {
    return Team.delete(this._api, id);
  }
}
