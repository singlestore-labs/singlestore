import { escape } from "mysql2";

import type { DatabaseType } from "../database";
import type { TableType } from "../table";

type MergeUnion<T> = (T extends any ? (i: T) => void : never) extends (i: infer U) => void ? { [K in keyof U]: U[K] } : never;

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
type JoinOperator = "=" | "<" | ">" | "<=" | ">=" | "!=";

export type JoinClause<TTableType extends TableType, TDatabaseType extends DatabaseType, TAs extends string> = {
  [K in keyof TDatabaseType["tables"]]: {
    type?: JoinType;
    table: K;
    as: TAs;
    on: [
      (string & {}) | keyof TTableType["columns"],
      JoinOperator,
      (string & {}) | keyof TDatabaseType["tables"][K]["columns"],
    ];
  };
}[keyof TDatabaseType["tables"]];

export type ExtractJoinClauseColumns<
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
> = {
  [K in TJoinClauses[number] as K["as"]]: `${K["as"]}.${Extract<keyof TDatabaseType["tables"][K["table"]]["columns"], string>}`;
}[TJoinClauses[number]["as"]];

export type SelectClause<
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
> = (
  | "*"
  | keyof TTableType["columns"]
  | ExtractJoinClauseColumns<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>
  | `${TJoinClauseAs}.*`
  | `${string} AS ${string}`
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
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
> = ({
  [K in keyof TTableType["columns"]]?: WhereOperator<TTableType["columns"][K]> | TTableType["columns"][K];
} & {
  [K in TJoinClauses[number] as K["as"]]: {
    [C in keyof TDatabaseType["tables"][K["table"]]["columns"] as `${K["as"]}.${Extract<C, string>}`]?:
      | WhereOperator<TDatabaseType["tables"][K["table"]]["columns"][C]>
      | TDatabaseType["tables"][K["table"]]["columns"][C];
  };
}[TJoinClauses[number]["as"]]) & {
  OR?: WhereClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>[];
  NOT?: WhereClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>;
};

export type GroupByClause<
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
> = (
  | (string & {})
  | keyof TTableType["columns"]
  | ExtractJoinClauseColumns<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>
)[];

export type OrderByDirection = "asc" | "desc";

export type OrderByClause<
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
> = {
  [K in
    | (string & {})
    | keyof TTableType["columns"]
    | Extract<ExtractJoinClauseColumns<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>, string>]?: OrderByDirection;
};

export interface QueryBuilderParams<
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
  TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
> {
  join?: TJoinClauses;
  select?: TSelectClause;
  where?: WhereClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>;
  groupBy?: GroupByClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>;
  orderBy?: OrderByClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>;
  limit?: number;
  offset?: number;
}

export type AnyQueryBuilderParams = QueryBuilderParams<any, any, any, any, any>;

export type ExtractSelectedQueryColumns<
  TTableType extends TableType,
  TDatabaseType extends DatabaseType,
  TJoinClauseAs extends string,
  TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
  TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
> = TSelectClause extends (infer TColumn)[]
  ? MergeUnion<
      TColumn extends "*"
        ? TTableType["columns"]
        : TColumn extends keyof TTableType["columns"]
          ? { [K in TColumn]: TTableType["columns"][K] }
          : TColumn extends `${infer TJoinAs}.${infer TJoinColumn}`
            ? TJoinAs extends TJoinClauseAs
              ? TJoinColumn extends keyof TDatabaseType["tables"][Extract<
                  TJoinClauses[number],
                  { as: TJoinAs }
                >["table"]]["columns"]
                ? {
                    [K in `${TJoinAs}_${TJoinColumn}`]: TDatabaseType["tables"][Extract<
                      TJoinClauses[number],
                      { as: TJoinAs }
                    >["table"]]["columns"][TJoinColumn];
                  }
                : never
              : never
            : TColumn extends `${infer TAlias}.*`
              ? TAlias extends TJoinClauseAs
                ? TDatabaseType["tables"][Extract<TJoinClauses[number], { as: TAlias }>["table"]]["columns"]
                : never
              : TColumn extends `${string} AS ${infer TAs}`
                ? { [K in TAs]: any }
                : never
    >
  : never;

function isJoinColumn<TTableType extends TableType, TDatabaseType extends DatabaseType, TJoinClauseAs extends string>(
  column: string,
  joinClauses: JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[] = [],
) {
  for (const clause of joinClauses) {
    if (column.startsWith(`${clause.as}.`)) {
      return true;
    }
  }

  return false;
}
export class QueryBuilder<TTableType extends TableType, TDatabaseType extends DatabaseType> {
  constructor(
    private _databaseName: string,
    private _tableName: string,
  ) {}

  buildJoinClause<TJoinClauseAs extends string, TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[]>(
    joinClauses?: TJoinClauses,
  ) {
    if (!joinClauses || joinClauses.length === 0) return "";
    return joinClauses
      .map((clause) => {
        let left = String(clause.on[0]);
        left = isJoinColumn(left, joinClauses) ? left : `${this._tableName}.${left}`;
        let right = String(clause.on[2]);
        right = isJoinColumn(right, joinClauses) ? right : `${clause.as}.${right}`;
        const joinType = clause.type ? `${clause.type} JOIN` : "JOIN";
        const tableName = `${this._databaseName}.${String(clause.table)} AS ${clause.as}`;
        const onCondition = `${left} ${clause.on[1]} ${right}`;
        return `${joinType} ${tableName} ON ${onCondition}`;
      })
      .join(" ");
  }

  buildSelectClause<TJoinClauseAs extends string, TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[]>(
    select?: SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    joinClauses?: TJoinClauses,
  ) {
    let columns = select?.length ? select : [];

    if (!select?.length) {
      columns.push("*");
    }

    if (joinClauses?.length) {
      if (!select?.length) {
        columns = [...columns, ...joinClauses.map((join) => `${join.as}.*`)];
      }

      columns = columns.map((column) => {
        const _column = String(column);

        if (isJoinColumn(_column, joinClauses)) {
          const [tableName, columnName] = _column.split(".");
          return `${_column}${!_column.endsWith("*") ? ` AS ${tableName}_${columnName}` : ""}`;
        }

        if (/.+\s+AS\s+.+/.test(_column)) {
          return _column;
        }

        return `${this._tableName}.${_column}${!_column.endsWith("*") ? ` AS ${_column}` : ""}`;
      });
    }

    return `SELECT ${columns.join(", ")}`;
  }

  buildFromClause(hasJoinClauses?: boolean) {
    return `FROM ${this._databaseName}.${this._tableName}${hasJoinClauses ? ` AS ${this._tableName}` : ""}`;
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

  buildWhereClause<TJoinClauseAs extends string, TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[]>(
    conditions?: WhereClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    joinClauses?: TJoinClauses,
  ): string {
    if (!conditions || !Object.keys(conditions).length) return "";

    const clauses: string[] = [];

    for (const [column, value] of Object.entries(conditions) as [string, any][]) {
      if (column === "OR" && Array.isArray(value)) {
        clauses.push(`(${value.map((v) => `(${this.buildWhereClause(v, joinClauses)})`).join(" OR ")})`);
      } else if (column === "NOT" && typeof value === "object") {
        clauses.push(`NOT (${this.buildWhereClause(value, joinClauses)})`);
      } else if (typeof value === "object" && !Array.isArray(value)) {
        for (const [operator, _value] of Object.entries(value) as [string, any][]) {
          const _column = joinClauses?.length
            ? isJoinColumn(column, joinClauses)
              ? column
              : `${this._tableName}.${column}`
            : column;

          clauses.push(this.buildWhereCondition(_column, operator, _value));
        }
      } else {
        const _column = joinClauses?.length
          ? isJoinColumn(column, joinClauses)
            ? column
            : `${this._tableName}.${column}`
          : column;

        clauses.push(this.buildWhereCondition(_column, "eq", value));
      }
    }

    return `WHERE ${clauses.join(" AND ")}`;
  }

  buildGroupByClause<TJoinClauseAs extends string, TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[]>(
    columns?: GroupByClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    joinClauses?: TJoinClauses,
  ): string {
    if (!columns || !columns.length) return "";

    const _columns = columns.map((column) => {
      const _column = String(column);
      return joinClauses?.length ? (isJoinColumn(_column, joinClauses) ? _column : `${this._tableName}.${_column}`) : _column;
    });

    return `GROUP BY ${_columns.join(", ")}`;
  }

  buildOrderByClause<TJoinClauseAs extends string, TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[]>(
    clauses?: OrderByClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
    joinClauses?: TJoinClauses,
  ): string {
    if (!clauses) return "";

    const condition = Object.entries(clauses)
      .map(([column, direction = "asc"]) => {
        let _column = String(column);

        _column = joinClauses?.length
          ? isJoinColumn(_column, joinClauses)
            ? _column
            : `${this._tableName}.${_column}`
          : _column;

        return `${_column} ${direction.toUpperCase()}`;
      })
      .join(", ");

    return condition ? `ORDER BY ${condition}` : "";
  }

  buildLimitClause(limit?: number): string {
    return typeof limit === "number" ? `LIMIT ${limit}` : "";
  }

  buildOffsetClause(offset?: number): string {
    return typeof offset === "number" ? `OFFSET ${offset}` : "";
  }

  buildClauses<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
  >(params?: QueryBuilderParams<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    return {
      select: this.buildSelectClause(params?.select, params?.join),
      from: this.buildFromClause(Boolean(params?.join?.length)),
      join: this.buildJoinClause(params?.join),
      where: this.buildWhereClause(params?.where, params?.join),
      groupBy: this.buildGroupByClause(params?.groupBy, params?.join),
      orderBy: this.buildOrderByClause(params?.orderBy, params?.join),
      limit: this.buildLimitClause(params?.limit),
      offset: this.buildOffsetClause(params?.offset),
    };
  }

  buildQuery<
    TJoinClauseAs extends string,
    TJoinClauses extends JoinClause<TTableType, TDatabaseType, TJoinClauseAs>[],
    TSelectClause extends SelectClause<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses>,
  >(params?: QueryBuilderParams<TTableType, TDatabaseType, TJoinClauseAs, TJoinClauses, TSelectClause>) {
    return Object.values(this.buildClauses(params)).filter(Boolean).join(" ").trim();
  }
}
