import { FlexKeyOf } from "../../types/helpers";
import { QuerySchema } from "../types";

export type QueryOptions<T extends QuerySchema = QuerySchema> = {
  groupBy?: FlexKeyOf<T>[];
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
  limit?: number;
};

export class QueryOptionsBuilder<T extends QuerySchema> {
  clauses: { groupBy: string; orderBy: string; limit: string } = {
    groupBy: "",
    orderBy: "",
    limit: "",
  };

  constructor(public options?: QueryOptions<T>) {
    this.clauses = {
      groupBy: this._buildGroupByClause(options?.groupBy),
      orderBy: this._buildOrderByClause(options?.orderBy),
      limit: this._buildLimitClause(options?.limit),
    };
  }

  private _buildGroupByClause(groupBy?: QueryOptions["groupBy"]): string {
    return groupBy?.length ? `GROUP BY ${groupBy.join(", ")}` : "";
  }

  private _buildOrderByClause(orderBy: QueryOptions["orderBy"]): string {
    if (!orderBy) return "";

    const condition = Object.entries(orderBy)
      .map(([column, direction = "asc"]) => `${column} ${direction.toUpperCase()}`)
      .join(", ");

    return `ORDER BY ${condition}`;
  }

  private _buildLimitClause(limit?: QueryOptions["limit"]): string {
    return limit ? `LIMIT ${limit}` : "";
  }
}
