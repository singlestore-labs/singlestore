import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "index": "./src/index.ts",
      "api": "./src/api/index.ts",
      "billing": "./src/billing/index.ts",
      "column": "./src/column/index.ts",
      "database": "./src/database/index.ts",
      "job": "./src/job/index.ts",
      "organization": "./src/organization/index.ts",
      "private-connection": "./src/private-connection/index.ts",
      "query": "./src/query/index.ts",
      "region": "./src/region/index.ts",
      "secret": "./src/secret/index.ts",
      "table": "./src/table/index.ts",
      "team": "./src/team/index.ts",
      "workspace-group/index": "./src/workspace-group/index.ts",
      "workspace-group/stage": "./src/workspace-group/stage/index.ts",
      "workspace-group/storage": "./src/workspace-group/storage/index.ts",
      "workspace/index": "./src/workspace/index.ts",
      "workspace/private-connection": "./src/workspace/private-connection/index.ts",
    },
    outDir: "./dist",
    external: ["@singlestore/ai", "mysql2"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
]);
