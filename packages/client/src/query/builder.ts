import { escape } from "mysql2";

import type { DatabaseType } from "../database";

export type SelectClause<TColumn> = (keyof TColumn | (string & {}))[];

export type WhereOperator<TColumnValue> = TColumnValue extends string
  ? {
      eq?: TColumnValue;
      ne?: TColumnValue;
      like?: string;
      in?: TColumnValue[];
      nin?: TColumnValue[];
    }
  : TColumnValue extends number | Date
    ? {
        eq?: TColumnValue;
        ne?: TColumnValue;
        gt?: TColumnValue;
        gte?: TColumnValue;
        lt?: TColumnValue;
        lte?: TColumnValue;
        in?: TColumnValue[];
        nin?: TColumnValue[];
      }
    : never;

export type WhereClause<TColumn> = {
  [K in keyof TColumn]?: WhereOperator<TColumn[K]> | TColumn[K];
} & {
  OR?: WhereClause<TColumn>[];
  NOT?: WhereClause<TColumn>;
};

export type GroupByClause<TColumn> = (keyof TColumn)[];

export type OrderByDirection = "asc" | "desc";

export type OrderByClause<TColumn> = {
  [K in keyof TColumn]?: OrderByDirection;
};

export interface QueryBuilderParams<TDatabaseType extends DatabaseType["tables"], TTableName extends keyof TDatabaseType> {
  select?: SelectClause<TDatabaseType[TTableName]["columns"]>;
  where?: WhereClause<TDatabaseType[TTableName]["columns"]>;
  groupBy?: GroupByClause<TDatabaseType[TTableName]["columns"]>;
  orderBy?: OrderByClause<TDatabaseType[TTableName]["columns"]>;
  limit?: number;
  offset?: number;
}

export type ExtractQuerySelectedColumn<TColumn, TParams extends QueryBuilderParams<any, any> | undefined> =
  TParams extends QueryBuilderParams<any, any>
    ? TParams["select"] extends (keyof TColumn)[]
      ? Pick<TColumn, TParams["select"][number]>
      : TColumn
    : TColumn;

export class QueryBuilder<TDatabaseType extends DatabaseType["tables"], TTableName extends keyof TDatabaseType> {
  constructor(
    private _databaseName: string,
    private _tableName: TTableName,
  ) {}

  buildSelectClause(select?: SelectClause<any>) {
    const columns = select ? select : ["*"];
    return `SELECT ${columns.join(", ")}`;
  }

  buildFromClause() {
    return `FROM ${this._databaseName}.${String(this._tableName)}`;
  }

  buildWhereCondition(column: string, operator: string, value: any): string {
    switch (operator) {
      case "eq":
        return `${column} = ${escape(value)}`;
      case "ne":
        return `${column} != ${escape(value)}`;
      case "gt":
        return `${column} > ${escape(value)}`;
      case "gte":
        return `${column} >= ${escape(value)}`;
      case "lt":
        return `${column} < ${escape(value)}`;
      case "lte":
        return `${column} <= ${escape(value)}`;
      case "in":
        return `${column} IN (${value.map(escape).join(", ")})`;
      case "nin":
        return `${column} NOT IN (${value.map(escape).join(", ")})`;
      case "like":
        return `${column} LIKE ${escape(value)}`;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  buildWhereClause(conditions?: WhereClause<any>): string {
    if (!conditions || !Object.keys(conditions).length) return "";

    const clauses: string[] = [];

    for (const [key, value] of Object.entries(conditions) as [string, any][]) {
      if (key === "OR" && Array.isArray(value)) {
        clauses.push(`(${value.map((v) => `(${this.buildWhereClause(v)})`).join(" OR ")})`);
      } else if (key === "NOT" && typeof value === "object") {
        clauses.push(`NOT (${this.buildWhereClause(value)})`);
      } else if (typeof value === "object" && !Array.isArray(value)) {
        for (const [operator, _value] of Object.entries(value) as [string, any][]) {
          clauses.push(this.buildWhereCondition(key, operator, _value));
        }
      } else {
        clauses.push(this.buildWhereCondition(key, "eq", value));
      }
    }

    return `WHERE ${clauses.join(" AND ")}`;
  }

  buildGroupByClause(columns?: GroupByClause<any>): string {
    return columns?.length ? `GROUP BY ${columns.join(", ")}` : "";
  }

  buildOrderByClause(clauses?: OrderByClause<any>): string {
    if (!clauses) return "";

    const condition = Object.entries(clauses)
      .map((condition) => {
        const [column, direction = ""] = condition;
        return `${column} ${direction.toUpperCase()}`;
      })
      .filter(Boolean)
      .join(", ");

    return condition ? `ORDER BY ${condition}` : "";
  }

  buildLimitClause(limit?: number): string {
    return typeof limit === "number" ? `LIMIT ${limit}` : "";
  }

  buildOffsetClause(offset?: number): string {
    return typeof offset === "number" ? `OFFSET ${offset}` : "";
  }

  buildClauses<T extends QueryBuilderParams<TDatabaseType, TTableName>>(params?: T) {
    return {
      select: this.buildSelectClause(params?.select),
      from: this.buildFromClause(),
      where: this.buildWhereClause(params?.where),
      groupBy: this.buildGroupByClause(params?.groupBy),
      orderBy: this.buildOrderByClause(params?.orderBy),
      limit: this.buildLimitClause(params?.limit),
      offset: this.buildOffsetClause(params?.offset),
    };
  }

  buildQuery(params?: QueryBuilderParams<TDatabaseType, TTableName>) {
    return Object.values(this.buildClauses(params)).join(" ");
  }
}
