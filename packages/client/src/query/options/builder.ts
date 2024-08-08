import type { QuerySchema } from "../schema";

export type QueryOptions<T extends QuerySchema = QuerySchema> = {
  columns?: (keyof T)[];
  groupBy?: (keyof T)[];
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
  limit?: number;
  offset?: number;
};

export const queryOptionKeys: Exclude<keyof QueryOptions, undefined>[] = ["columns", "groupBy", "orderBy", "limit", "offset"];

export class QueryOptionsBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: Record<Exclude<keyof QueryOptions, "columns">, string> = {
    groupBy: "",
    orderBy: "",
    limit: "",
    offset: "",
  };

  constructor(public options?: QueryOptions<T>) {
    this.columns = this._buildColumnsClause(options?.columns);
    this.clauses = {
      groupBy: this._buildGroupByClause(options?.groupBy),
      orderBy: this._buildOrderByClause(options?.orderBy),
      limit: this._buildLimitClause(options?.limit),
      offset: this._buildOffsetClause(options?.offset),
    };
  }

  private _buildColumnsClause(columns?: QueryOptions<T>["columns"]): string {
    return columns?.length ? columns.join(", ") : "*";
  }

  private _buildGroupByClause(groupBy?: QueryOptions<T>["groupBy"]): string {
    return groupBy?.length ? `GROUP BY ${groupBy.join(", ")}` : "";
  }

  private _buildOrderByClause(orderBy?: QueryOptions<T>["orderBy"]): string {
    if (!orderBy) return "";

    const condition = Object.entries(orderBy)
      .map(([column, direction = "asc"]) => `${column} ${direction.toUpperCase()}`)
      .join(", ");

    return `ORDER BY ${condition}`;
  }

  private _buildLimitClause(limit?: QueryOptions<T>["limit"]): string {
    return limit ? `LIMIT ${limit}` : "";
  }

  private _buildOffsetClause(offset?: QueryOptions<T>["offset"]): string {
    return offset ? `OFFSET ${offset}` : "";
  }
}
