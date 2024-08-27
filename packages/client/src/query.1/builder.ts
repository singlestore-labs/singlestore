import { escape } from "mysql2";

type ColumnType = any;

interface TableType {
  columns: Record<string, ColumnType>;
}

interface DatabaseType {
  tables: Record<string, TableType>;
}

type WhereOperator<T> = T extends string
  ? {
      eq?: T;
      ne?: T;
      like?: string;
      in?: T[];
      nin?: T[];
    }
  : T extends number | Date
    ? {
        eq?: T;
        ne?: T;
        gt?: T;
        gte?: T;
        lt?: T;
        lte?: T;
        in?: T[];
        nin?: T[];
      }
    : never;

type WhereClause<T> = {
  [K in keyof T]?: WhereOperator<T[K]> | T[K];
} & {
  OR?: WhereClause<T>[];
  NOT?: WhereClause<T>;
};

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
type JoinOperator = "=" | "<" | ">" | "<=" | ">=" | "!=" | "<=>";

type JoinClause<T extends DatabaseType["tables"], TTable extends keyof T, TAs extends string, TLeft extends string, TRight> = {
  type?: JoinType;
  table: TTable;
  as: TAs;
  left: TLeft;
  operator: JoinOperator;
  right: TRight;
  // v: T[TTable]["columns"][TLeft extends `${any}.${infer Column}` ? Column : never];
};

type AnyJoinClause = JoinClause<any, any, string, string, string>;

type OrderByDirection = "asc" | "desc";

type OrderByClause<T> = {
  [K in keyof T]?: OrderByDirection;
};

type GroupByClause<T> = (keyof T)[];

type SelectClause<T> = (T | (string & {}))[];

export class QueryBuilder2<T extends DatabaseType, U extends keyof T["tables"]> {
  constructor(private _tableName: U) {}

  private _buildSelectClause(select?: SelectClause<any>) {
    const columns = select ? select : ["*"];
    return `SELECT ${columns.join(", ")}`;
  }

  private _buildFromClause(join?: AnyJoinClause[]) {
    return `FROM ${String(this._tableName)}${join?.length ? ` as ${String(this._tableName)}` : ""}`;
  }

  private _buildWhereCondition(column: string, operator: string, value: any): string {
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

  private _buildWhereClause(conditions?: WhereClause<any>): string {
    if (!conditions || !Object.keys(conditions).length) return "";

    const clauses: string[] = [];

    for (const [key, value] of Object.entries(conditions) as [string, any][]) {
      if (key === "OR" && Array.isArray(value)) {
        clauses.push(`(${value.map((v) => `(${this._buildWhereClause(v)})`).join(" OR ")})`);
      } else if (key === "NOT" && typeof value === "object") {
        clauses.push(`NOT (${this._buildWhereClause(value)})`);
      } else if (typeof value === "object" && !Array.isArray(value)) {
        for (const [operator, _value] of Object.entries(value) as [string, any][]) {
          clauses.push(this._buildWhereCondition(key, operator, _value));
        }
      } else {
        clauses.push(this._buildWhereCondition(key, "eq", value));
      }
    }

    return `WHERE ${clauses.join(" AND ")}`;
  }

  private _buildJoinClause(clauses?: AnyJoinClause[]): string {
    if (!clauses?.length) return "";
    return clauses
      .map((join) => {
        const tableName = String(join.table);
        const joinType = join.type ? `${join.type} JOIN` : `JOIN`;
        const tableReference = join.as ? `${tableName} AS ${join.as}` : `${tableName} AS ${tableName}`;
        const on = `ON ${join.left} ${join.operator} ${join.right}`;
        return [joinType, tableReference, on].join(" ");
      })
      .join(" ");
  }

  private _buildOrderByClause(clauses?: OrderByClause<any>): string {
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

  private _buildGroupBy(columns?: GroupByClause<any>): string {
    return columns?.length ? `GROUP BY ${columns.join(", ")}` : "";
  }

  private _buildLimitClause(limit?: number): string {
    return typeof limit === "number" ? `LIMIT ${limit}` : "";
  }

  private _buildOffsetClause(offset?: number): string {
    return typeof offset === "number" ? `OFFSET ${offset}` : "";
  }

  build<
    TJoinTable extends Exclude<keyof T["tables"], U>,
    TJoinAs extends string,
    TJoinLeft extends `${TJoinAs}.${Exclude<keyof T["tables"][TJoinTable]["columns"], Symbol>}`,
    TJoinRight extends
      | {
          [_K in keyof T["tables"]]: `${Exclude<_K, Symbol>}.${Exclude<keyof T["tables"][_K]["columns"], Symbol>}`;
        }[Exclude<keyof T["tables"], TJoinTable>]
      | {
          [_K in keyof T["tables"]]: T["tables"][_K]["columns"][TJoinLeft extends `${any}.${infer Column}` ? Column : never];
        }[TJoinTable],
  >(params?: {
    select?: SelectClause<keyof T["tables"][U]["columns"]>;
    where?: WhereClause<T["tables"][U]["columns"]>;
    join?: JoinClause<T["tables"], TJoinTable, TJoinAs, TJoinLeft, TJoinRight>[];
    orderBy?: OrderByClause<T["tables"][U]["columns"]>;
    groupBy?: GroupByClause<T["tables"][U]["columns"]>;
    limit?: number;
    offset?: number;
  }) {
    return {
      select: this._buildSelectClause(params?.select),
      from: this._buildFromClause(params?.join),
      where: this._buildWhereClause(params?.where),
      join: this._buildJoinClause(params?.join),
      orderBy: this._buildOrderByClause(params?.orderBy),
      groupBy: this._buildGroupBy(params?.groupBy),
      limit: this._buildLimitClause(params?.limit),
      offset: this._buildOffsetClause(params?.offset),
    };
  }
}
