import type { QuerySchema } from "../schema";

/**
 * Type representing the options that can be applied to a query.
 *
 * @typeParam T - The schema type being queried.
 *
 * @property {(keyof T)[]} [columns] - An optional array of column names to select in the query.
 * @property {(keyof T)[]} [groupBy] - An optional array of column names to group the results by.
 * @property {Record<keyof T, "asc" | "desc">} [orderBy] - An optional object defining the columns to order by and the direction of sorting.
 * @property {number} [limit] - An optional number to limit the number of results returned.
 * @property {number} [offset] - An optional number to offset the results by a specific number of rows.
 */
export type QueryOptions<T extends QuerySchema> = {
  columns?: (keyof T)[];
  groupBy?: (keyof T)[];
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
  limit?: number;
  offset?: number;
};

/**
 * An array of keys that correspond to valid query options.
 *
 * Used to validate and handle query options in the `QueryOptionsBuilder`.
 */
export const queryOptionKeys: Exclude<keyof QueryOptions<QuerySchema>, undefined>[] = [
  "columns",
  "groupBy",
  "orderBy",
  "limit",
  "offset",
];

/**
 * Class responsible for building SQL clauses from query options.
 *
 * @typeParam T - The schema type being queried.
 *
 * @property {string} columns - The SQL columns clause generated from the query options.
 * @property {Record<Exclude<keyof QueryOptions<T>, "columns">, string>} clauses - An object containing the SQL clauses generated from the query options.
 * @property {QueryOptions<T>} [options] - The query options used to generate the SQL clauses.
 */
export class QueryOptionsBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: Record<Exclude<keyof QueryOptions<T>, "columns">, string> = {
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

  /**
   * Builds the SQL columns clause based on the provided columns option.
   *
   * @param {QueryOptions<T>["columns"]} [columns] - The columns to select in the query.
   *
   * @returns {string} The SQL columns clause.
   */
  private _buildColumnsClause(columns?: QueryOptions<T>["columns"]): string {
    return columns?.length ? columns.join(", ") : "*";
  }

  /**
   * Builds the SQL GROUP BY clause based on the provided groupBy option.
   *
   * @param {QueryOptions<T>["groupBy"]} [groupBy] - The columns to group the results by.
   *
   * @returns {string} The SQL GROUP BY clause.
   */
  private _buildGroupByClause(groupBy?: QueryOptions<T>["groupBy"]): string {
    return groupBy?.length ? `GROUP BY ${groupBy.join(", ")}` : "";
  }

  /**
   * Builds the SQL ORDER BY clause based on the provided orderBy option.
   *
   * @param {QueryOptions<T>["orderBy"]} [orderBy] - The columns to order the results by and the direction of sorting.
   *
   * @returns {string} The SQL ORDER BY clause.
   */
  private _buildOrderByClause(orderBy?: QueryOptions<T>["orderBy"]): string {
    if (!orderBy) return "";

    const condition = Object.entries(orderBy)
      .map(([column, direction = "asc"]) => `${column} ${direction.toUpperCase()}`)
      .join(", ");

    return `ORDER BY ${condition}`;
  }

  /**
   * Builds the SQL LIMIT clause based on the provided limit option.
   *
   * @param {QueryOptions<T>["limit"]} [limit] - The number to limit the results by.
   *
   * @returns {string} The SQL LIMIT clause.
   */
  private _buildLimitClause(limit?: QueryOptions<T>["limit"]): string {
    return limit ? `LIMIT ${limit}` : "";
  }

  /**
   * Builds the SQL OFFSET clause based on the provided offset option.
   *
   * @param {QueryOptions<T>["offset"]} [offset] - The number to offset the results by.
   *
   * @returns {string} The SQL OFFSET clause.
   */
  private _buildOffsetClause(offset?: QueryOptions<T>["offset"]): string {
    return offset ? `OFFSET ${offset}` : "";
  }
}
