import { escape } from "mysql2";

import type { DatabaseType } from "../database";
import type { TableType } from "../table";

export type SelectClause<
  TTableName extends string,
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  _TTableColumns = TTableType["columns"],
> = ((string & {}) | keyof _TTableColumns)[];

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

export type WhereClause<
  TTableName extends string,
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  _TTableColumns = TTableType["columns"],
> = { [K in keyof _TTableColumns]?: WhereOperator<_TTableColumns[K]> | _TTableColumns[K] } & {
  OR?: WhereClause<TTableName, TTableType, TDatabaseType>[];
  NOT?: WhereClause<TTableName, TTableType, TDatabaseType>;
};

export type GroupByClause<
  TTableName extends string,
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  _TTableColumns = TTableType["columns"],
> = ((string & {}) | keyof _TTableColumns)[];

export type OrderByDirection = "asc" | "desc";

export type OrderByClause<
  TTableName extends string,
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  _TTableColumns = TTableType["columns"],
> = { [K in string & {}]: OrderByDirection } & { [K in keyof _TTableColumns]?: OrderByDirection };

export interface QueryBuilderParams<
  TTableName extends string,
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
> {
  select?: SelectClause<TTableName, TTableType, TDatabaseType>;
  where?: WhereClause<TTableName, TTableType, TDatabaseType>;
  groupBy?: GroupByClause<TTableName, TTableType, TDatabaseType>;
  orderBy?: OrderByClause<TTableName, TTableType, TDatabaseType>;
  limit?: number;
  offset?: number;
}

export type AnyQueryBuilderParams = QueryBuilderParams<any, any, any>;

export type ExtractQuerySelectedColumn<
  TTableName extends string,
  TDatabaseType extends DatabaseType,
  TParams extends AnyQueryBuilderParams | undefined,
  _Table extends TDatabaseType["tables"][TTableName] = TDatabaseType["tables"][TTableName],
> = TParams extends AnyQueryBuilderParams
  ? TParams["select"] extends (keyof _Table["columns"])[]
    ? Pick<_Table["columns"], TParams["select"][number]>
    : _Table["columns"]
  : _Table["columns"];

export class QueryBuilder<TName extends string, TTableType extends TableType, TDatabaseType extends DatabaseType> {
  constructor(
    private _databaseName: string,
    private _tableName: TName,
  ) {}

  buildSelectClause(select?: SelectClause<any, any, any>) {
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

  buildWhereClause(conditions?: WhereClause<any, any, any>): string {
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

  buildGroupByClause(columns?: GroupByClause<any, any, any>): string {
    return columns?.length ? `GROUP BY ${columns.join(", ")}` : "";
  }

  buildOrderByClause(clauses?: OrderByClause<any, any, any>): string {
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

  buildClauses<TParams extends QueryBuilderParams<TName, TTableType, TDatabaseType>>(params?: TParams) {
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

  buildQuery<TParams extends QueryBuilderParams<TName, TTableType, TDatabaseType>>(params?: TParams) {
    return Object.values(this.buildClauses(params)).join(" ").trim();
  }
}
