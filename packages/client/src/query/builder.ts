import { QueryFilters, QueryFiltersBuilder } from "./filters/builder";
import { QueryOptions, QueryOptionsBuilder } from "./options/builder";
import { QuerySchema } from "./types";

export class QueryBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: Record<"where" | Exclude<keyof QueryOptions, "columns">, string> = {
    where: "",
    groupBy: "",
    orderBy: "",
    limit: "",
  };
  values: T[keyof T][] = [];

  constructor(
    ...args: [filters: QueryFilters<T>] | [options: QueryOptions<T>] | [filters: QueryFilters<T>, options: QueryOptions<T>]
  ) {
    let filtersBuilder: QueryFiltersBuilder<T> = new QueryFiltersBuilder();
    let optionsBuilder: QueryOptionsBuilder<T> = new QueryOptionsBuilder();

    if (args.length === 1) {
      if ("orderBy" in args[0] || "limit" in args[0]) {
        optionsBuilder = new QueryOptionsBuilder(args[0] as QueryOptions<T>);
      } else {
        filtersBuilder = new QueryFiltersBuilder(args[0] as QueryFilters<T>);
      }
    } else {
      filtersBuilder = new QueryFiltersBuilder(args[0] as QueryFilters<T>);
      optionsBuilder = new QueryOptionsBuilder(args[1] as QueryOptions<T>);
    }

    this.columns = optionsBuilder.columns;
    this.clauses = { where: filtersBuilder.clause, ...optionsBuilder.clauses };
    this.values = filtersBuilder.values;
  }

  static toColumnValueAssignment<T extends object>(object: T): { columns: string; values: T[keyof T][] } {
    return {
      columns: Object.keys(object)
        .map((key) => `${key} = ?`)
        .join(", "),
      values: Object.values(object),
    };
  }
}
