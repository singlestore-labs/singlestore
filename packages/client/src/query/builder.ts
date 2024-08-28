import { escape } from "mysql2";

import type { DatabaseType } from "../database";

export type SelectClause<
  TTableName extends string,
  TDatabaseType extends DatabaseType,
  TJoin extends AnyJoinClauseRecord[] | undefined = undefined,
  _TTableColumns = TDatabaseType["tables"][TTableName]["columns"],
> = (
  | (string & {})
  | (TJoin extends AnyJoinClauseRecord[]
      ?
          | `${TTableName}.${Extract<keyof _TTableColumns, string>}`
          | {
              [K in TJoin[number] as K["as"]]: `${K["as"]}.${Extract<keyof TDatabaseType["tables"][K["table"]]["columns"], string>}`;
            }[TJoin[number]["as"]]
      : keyof _TTableColumns)
)[];

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
  TDatabaseType extends DatabaseType,
  TJoin extends AnyJoinClauseRecord[] | undefined = undefined,
  _TTableColumns = TDatabaseType["tables"][TTableName]["columns"],
> = (TJoin extends AnyJoinClauseRecord[]
  ? {
      [K in keyof _TTableColumns as `${TTableName}.${Extract<keyof _TTableColumns, string>}`]?:
        | WhereOperator<_TTableColumns[K]>
        | _TTableColumns[K];
    } & {
      [K in TJoin[number] as K["as"]]: {
        [C in keyof TDatabaseType["tables"][K["table"]]["columns"] as `${K["as"]}.${Extract<C, string>}`]?:
          | WhereOperator<TDatabaseType["tables"][K["table"]]["columns"][C]>
          | TDatabaseType["tables"][K["table"]]["columns"][C];
      };
    }[TJoin[number]["as"]]
  : { [K in keyof _TTableColumns]?: WhereOperator<_TTableColumns[K]> | _TTableColumns[K] }) & {
  OR?: WhereClause<TTableName, TDatabaseType, TJoin>[];
  NOT?: WhereClause<TTableName, TDatabaseType, TJoin>;
};

export type GroupByClause<
  TTableName extends string,
  TDatabaseType extends DatabaseType,
  TJoin extends AnyJoinClauseRecord[] | undefined = undefined,
  _TTableColumns = TDatabaseType["tables"][TTableName]["columns"],
> = (
  | (string & {})
  | (TJoin extends AnyJoinClauseRecord[]
      ?
          | `${TTableName}.${Extract<keyof _TTableColumns, string>}`
          | {
              [K in TJoin[number] as K["as"]]: `${K["as"]}.${Extract<keyof TDatabaseType["tables"][K["table"]]["columns"], string>}`;
            }[TJoin[number]["as"]]
      : keyof _TTableColumns)
)[];

export type OrderByDirection = "asc" | "desc";

export type OrderByClause<
  TTableName extends string,
  TDatabaseType extends DatabaseType,
  TJoin extends AnyJoinClauseRecord[] | undefined = undefined,
  _TTableColumns = TDatabaseType["tables"][TTableName]["columns"],
> = { [K in string & {}]: OrderByDirection } & (TJoin extends AnyJoinClauseRecord[]
  ? { [K in keyof _TTableColumns as `${TTableName}.${Extract<keyof _TTableColumns, string>}`]?: OrderByDirection } & {
      [K in TJoin[number] as K["as"]]: {
        [C in keyof TDatabaseType["tables"][K["table"]]["columns"] as `${K["as"]}.${Extract<C, string>}`]?: OrderByDirection;
      };
    }[TJoin[number]["as"]]
  : { [K in keyof _TTableColumns]?: OrderByDirection });

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
type JoinOperator = "=" | "<" | ">" | "<=" | ">=" | "!=" | "<=>";

export interface JoinClause<
  TTableName extends string,
  TDatabaseType extends DatabaseType,
  TTable extends string,
  TAs extends string,
> {
  type?: JoinType;
  table: TTable;
  as: TAs;
  on: [
    left: keyof TDatabaseType["tables"][TTable]["columns"],
    operator: JoinOperator,
    right: (string & {}) | `${TTableName}.${Extract<keyof TDatabaseType["tables"][TTableName]["columns"], string>}`,
  ];
}

export type JoinClauseRecord<TTableName extends string, TDatabaseType extends DatabaseType, TAs extends string> = {
  [K in keyof TDatabaseType["tables"]]: {
    [Alias in TAs]: JoinClause<TTableName, TDatabaseType, Extract<K, string>, Alias>;
  }[TAs];
}[keyof TDatabaseType["tables"]];

export type AnyJoinClauseRecord = JoinClauseRecord<any, any, any>;

export interface QueryBuilderParams<
  TTableName extends string,
  TDatabaseType extends DatabaseType,
  TJoin extends AnyJoinClauseRecord[] | undefined = undefined,
> {
  select?: SelectClause<TTableName, TDatabaseType, TJoin>;
  where?: WhereClause<TTableName, TDatabaseType, TJoin>;
  groupBy?: GroupByClause<TTableName, TDatabaseType, TJoin>;
  orderBy?: OrderByClause<TTableName, TDatabaseType, TJoin>;
  limit?: number;
  offset?: number;
  join?: TJoin;
}

export type ExtractQuerySelectedColumn<TColumn, TParams extends QueryBuilderParams<any, any, any> | undefined> =
  TParams extends QueryBuilderParams<any, any, any>
    ? TParams["select"] extends (keyof TColumn)[]
      ? Pick<TColumn, TParams["select"][number]>
      : TColumn
    : TColumn;

export class QueryBuilder<TName extends string, TDatabaseType extends DatabaseType> {
  constructor(
    private _databaseName: string,
    private _tableName: TName,
  ) {}

  buildSelectClause(select?: SelectClause<any, any, any>, join?: AnyJoinClauseRecord[]) {
    let columns = select ? select : ["*"];

    if (join?.length) {
      columns = columns.map((column) => {
        if (String(column).includes(".")) {
          const [tableName, columnName] = String(column).split(".");
          return `${String(column)} AS ${tableName}_${columnName}`;
        }
        return column;
      });
    }

    return `SELECT ${columns.join(", ")}`;
  }

  buildFromClause(join?: AnyJoinClauseRecord[]) {
    return `FROM ${this._databaseName}.${String(this._tableName)}${join?.length ? ` AS ${this._tableName}` : ""}`;
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

  buildJoinClause(clauses?: AnyJoinClauseRecord[]): string {
    if (!clauses?.length) return "";
    return clauses
      .map((join) => {
        const joinType = join.type ? `${join.type} JOIN` : `JOIN`;
        const tableName = `${this._databaseName}.${String(join.table)}`;
        const as = `AS ${join.as}`;
        const on = ["ON", `${String(join.as)}.${String(join.on[0])}`, join.on[1], join.on[2]].join(" ");
        return [joinType, tableName, as, on].filter(Boolean).join(" ");
      })
      .join(" ");
  }

  buildClauses<TJoinAs extends string, TJoin extends JoinClauseRecord<TName, TDatabaseType, TJoinAs>[] | undefined = undefined>(
    params?: QueryBuilderParams<TName, TDatabaseType, TJoin>,
  ) {
    return {
      select: this.buildSelectClause(params?.select, params?.join),
      from: this.buildFromClause(params?.join),
      join: this.buildJoinClause(params?.join),
      where: this.buildWhereClause(params?.where),
      groupBy: this.buildGroupByClause(params?.groupBy),
      orderBy: this.buildOrderByClause(params?.orderBy),
      limit: this.buildLimitClause(params?.limit),
      offset: this.buildOffsetClause(params?.offset),
    };
  }

  buildQuery<TJoinAs extends string, TJoin extends JoinClauseRecord<TName, TDatabaseType, TJoinAs>[] | undefined = undefined>(
    params?: QueryBuilderParams<TName, TDatabaseType, TJoin>,
  ) {
    return Object.values(this.buildClauses(params)).join(" ").trim();
  }
}
