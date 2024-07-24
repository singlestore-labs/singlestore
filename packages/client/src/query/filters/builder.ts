import { QuerySchema } from "../types";

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

type QueryFilterValue<T> = T | QueryFilterOperators<T>;

type QueryFilterLogicalConditions<T extends QuerySchema> = {
  and?: QueryFilters<T>[];
  or?: QueryFilters<T>[];
};

export type QueryFilters<T extends QuerySchema = QuerySchema> = {
  [K in keyof T]?: QueryFilterValue<T[K]>;
} & QueryFilterLogicalConditions<T>;

export class QueryFiltersBuilder<T extends QuerySchema> {
  clause: string = "";
  values: T[keyof T][] = [];

  constructor(public filters?: QueryFilters<T>) {
    this.clause = this._buildWhereClause(this.filters);
    this.values = this._extractValues(this.filters);
  }

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

  private _buildWhereClause(filters?: QueryFilters): string {
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

  private _extractValues(filters?: QueryFilters): T[keyof T][] {
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
