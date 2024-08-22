import type { QuerySchema } from "../schema";

/**
 * Type representing the various operators that can be used in query filters.
 *
 * @typeParam T - The type of the value being filtered. The default is `any`.
 *
 * @property {T} [eq] - Equal to a specific value.
 * @property {T} [ne] - Not equal to a specific value.
 * @property {T} [gt] - Greater than a specific value.
 * @property {T} [gte] - Greater than or equal to a specific value.
 * @property {T} [lt] - Less than a specific value.
 * @property {T} [lte] - Less than or equal to a specific value.
 * @property {T[]} [in] - Within an array of specific values.
 * @property {T[]} [nin] - Not within an array of specific values.
 * @property {string} [like] - Matches a specific pattern (only applicable to string types).
 */
type QueryFilterOperators<T = any> = {
  eq?: T;
  ne?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  in?: T[];
  nin?: T[];
  like?: T extends string ? string : never;
};

/**
 * Type representing a single filter value, which can be either a direct value or a set of operators.
 *
 * @typeParam T - The type of the value being filtered.
 */
type QueryFilterValue<T> = T | QueryFilterOperators<T>;

/**
 * Type representing logical conditions for combining multiple query filters.
 *
 * @typeParam T - The schema type being filtered.
 *
 * @property {QueryFilters<T>[]} [and] - Logical AND condition combining multiple filters.
 * @property {QueryFilters<T>[]} [or] - Logical OR condition combining multiple filters.
 */
type QueryFilterLogicalConditions<T extends QuerySchema> = {
  and?: QueryFilters<T>[];
  or?: QueryFilters<T>[];
};

/**
 * Type representing the filters that can be applied to a query.
 *
 * @typeParam T - The schema type being filtered.
 *
 * This type combines the individual column filters and logical conditions for combining them.
 */
export type QueryFilters<T extends QuerySchema> = {
  [K in keyof T]?: QueryFilterValue<T[K]>;
} & QueryFilterLogicalConditions<T>;

/**
 * Class responsible for building SQL WHERE clauses from query filters.
 *
 * @typeParam T - The schema type being filtered.
 *
 * @property {string} clause - The SQL WHERE clause generated from the filters.
 * @property {T[keyof T][]} values - The array of values corresponding to the placeholders in the WHERE clause.
 * @property {QueryFilters<T>} [filters] - The query filters used to generate the WHERE clause and values.
 */
export class QueryFiltersBuilder<T extends QuerySchema> {
  clause: string = "";
  values: T[keyof T][] = [];

  constructor(public filters?: QueryFilters<T>) {
    this.clause = this._buildWhereClause(this.filters);
    this.values = this._extractValues(this.filters);
  }

  /**
   * Builds an SQL condition string for a specific column and operator.
   *
   * @param {string} column - The name of the column.
   * @param {keyof QueryFilterOperators} operator - The operator to apply.
   * @param {any} value - The value to compare against.
   *
   * @returns {string} The SQL condition string.
   */
  private _buildWhereCondition(column: string, operator: keyof QueryFilterOperators, value: any): string {
    switch (operator) {
      case "eq":
        return `${column} = ?`;
      case "ne":
        return `${column} != ?`;
      case "gt":
        return `${column} > ?`;
      case "gte":
        return `${column} >= ?`;
      case "lt":
        return `${column} < ?`;
      case "lte":
        return `${column} <= ?`;
      case "in":
        return `${column} IN (${Array.isArray(value) ? value.map(() => "?").join(", ") : "?"})`;
      case "nin":
        return `${column} NOT IN (${Array.isArray(value) ? value.map(() => "?").join(", ") : "?"})`;
      case "like":
        return `${column} LIKE ?`;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Builds an SQL WHERE clause from the provided filters.
   *
   * @param {QueryFilters<T>} [filters] - The filters to convert into an SQL WHERE clause.
   *
   * @returns {string} The generated SQL WHERE clause.
   */
  private _buildWhereClause(filters?: QueryFilters<T>): string {
    if (!filters) return "";

    const conditions: string[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if ((key === "and" || key === "or") && Array.isArray(value)) {
        const logicalConditions = value
          .map((filter) => this._buildWhereClause(filter).replace(/^WHERE /, ""))
          .join(` ${key.toUpperCase()} `);
        conditions.push(`(${logicalConditions})`);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const [operatorKey, operatorValue] of Object.entries(value) as [keyof QueryFilterOperators, any]) {
          conditions.push(this._buildWhereCondition(key, operatorKey, operatorValue));
        }
      } else {
        conditions.push(`${key} = ?`);
      }
    }

    return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  }

  /**
   * Extracts the values from the filters to be used in the prepared statement corresponding to the WHERE clause.
   *
   * @param {QueryFilters<T>} [filters] - The filters to extract values from.
   *
   * @returns {T[keyof T][]} An array of values extracted from the filters.
   */
  private _extractValues(filters?: QueryFilters<T>): T[keyof T][] {
    if (!filters) return [];

    const values: any[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if ((key === "and" || key === "or") && Array.isArray(value)) {
        value.forEach((filter) => values.push(...this._extractValues(filter)));
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const operatorValue of Object.values(value)) {
          values.push(...(Array.isArray(operatorValue) ? operatorValue : [operatorValue]));
        }
      } else {
        values.push(value);
      }
    }

    return values;
  }
}
