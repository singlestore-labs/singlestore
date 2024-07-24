import { QuerySchema } from "../types";

export type QueryOptions<T extends QuerySchema = QuerySchema> = {
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
  limit?: number;
};

export class QueryOptionsBuilder<T extends QuerySchema> {
  clauses: { orderBy: string; limit: string } = { orderBy: "", limit: "" };

  constructor(public options?: QueryOptions<T>) {
    this.clauses = {
      orderBy: this._buildOrderByClause(options?.orderBy),
      limit: this._buildLimitClause(options?.limit),
    };
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
