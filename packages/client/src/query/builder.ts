type Schema = Record<string, any>;

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

type QueryFilterLogicalConditions<T extends Schema> = {
  and?: QueryFilters<T>[];
  or?: QueryFilters<T>[];
};

export type QueryFilters<T extends Schema = Schema> = {
  [K in keyof T]?: QueryFilterValue<T[K]>;
} & QueryFilterLogicalConditions<T>;

export type QueryOptions<T extends Schema = Schema> = {
  limit?: number;
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
};

export class QueryBuilder<T extends Schema> {
  readonly filters?: QueryFilters<T>;
  readonly limit?: QueryOptions<T>["limit"];
  readonly orderBy?: QueryOptions<T>["orderBy"];

  constructor(
    ...args: [filters: QueryFilters<T>] | [options: QueryOptions<T>] | [filters: QueryFilters<T>, options: QueryOptions<T>]
  ) {
    if (args.length === 1) {
      if ("limit" in args[0] || "orderBy" in args[0]) {
        this.limit = args[0].limit as QueryOptions<T>["limit"];
        this.orderBy = args[0].orderBy as QueryOptions<T>["orderBy"];
      } else {
        this.filters = args[0] as QueryFilters<T>;
      }
    } else if (args.length === 2) {
      this.filters = args[0] as QueryFilters<T>;
      this.limit = args[1].limit as QueryOptions<T>["limit"];
      this.orderBy = args[1].orderBy as QueryOptions<T>["orderBy"];
    }
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

  private _buildOrderByClause(orderBy: QueryOptions["orderBy"]): string {
    if (!orderBy) return "";

    const condition = Object.entries(orderBy)
      .map(([column, direction = "asc"]) => `${column} ${direction.toUpperCase()}`)
      .join(", ");

    return `ORDER BY ${condition}`;
  }

  private _extractFilterValues(filters?: QueryFilters): T[keyof T][] {
    if (!filters) return [];

    const values: any[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if ((key === "and" || key === "or") && Array.isArray(value)) {
        value.forEach((filter) => values.push(...this._extractFilterValues(filter)));
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

  get clauses() {
    return {
      where: this._buildWhereClause(this.filters),
      orderBy: this._buildOrderByClause(this.orderBy),
      limit: this.limit ? `LIMIT ${this.limit}` : "",
    };
  }

  get values() {
    return this._extractFilterValues(this.filters);
  }

  get definition() {
    const { where, orderBy, limit } = this.clauses;
    return [where, orderBy, limit].join(" ");
  }
}
