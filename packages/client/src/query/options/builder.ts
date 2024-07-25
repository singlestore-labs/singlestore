import { QuerySchema } from "../schema";

export type QueryOptions<T extends QuerySchema = QuerySchema> = {
  columns?: (keyof T)[];
  groupBy?: (keyof T)[];
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
  limit?: number;
};

export class QueryOptionsBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: { groupBy: string; orderBy: string; limit: string } = {
    groupBy: "",
    orderBy: "",
    limit: "",
  };

  constructor(public options?: QueryOptions<T>) {
    this.columns = this._buildColumnsClause(options?.columns);
    this.clauses = {
      groupBy: this._buildGroupByClause(options?.groupBy),
      orderBy: this._buildOrderByClause(options?.orderBy),
      limit: this._buildLimitClause(options?.limit),
    };
  }

  private _buildColumnsClause(columns?: QueryOptions<T>["columns"]): string {
    return columns?.length ? columns.join(", ") : "*";
  }

  private _buildGroupByClause(groupBy?: QueryOptions<T>["groupBy"]): string {
    return groupBy?.length ? `GROUP BY ${groupBy.join(", ")}` : "";
  }

  private _buildOrderByClause(orderBy: QueryOptions<T>["orderBy"]): string {
    if (!orderBy) return "";

    const condition = Object.entries(orderBy)
      .map(([column, direction = "asc"]) => `${column} ${direction.toUpperCase()}`)
      .join(", ");

    return `ORDER BY ${condition}`;
  }

  private _buildLimitClause(limit?: QueryOptions<T>["limit"]): string {
    return limit ? `LIMIT ${limit}` : "";
  }
}
