import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/api/index.ts"],
    outDir: "./dist/api",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/api/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/billing/index.ts"],
    outDir: "./dist/billing",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/billing/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/column/index.ts"],
    outDir: "./dist/column",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/column/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/database/index.ts"],
    outDir: "./dist/database",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/database/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/job/index.ts"],
    outDir: "./dist/job",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/job/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/organization/index.ts"],
    outDir: "./dist/organization",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/organization/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/private-connection/index.ts"],
    outDir: "./dist/private-connection",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/private-connection/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/query/index.ts"],
    outDir: "./dist/query",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/query/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/region/index.ts"],
    outDir: "./dist/region",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/region/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/secret/index.ts"],
    outDir: "./dist/secret",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/secret/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/table/index.ts"],
    outDir: "./dist/table",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/table/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/team/index.ts"],
    outDir: "./dist/team",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/team/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/workspace/index.ts"],
    outDir: "./dist/workspace",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/workspace/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/workspace/private-connection/index.ts"],
    outDir: "./dist/workspace/private-connection",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/workspace/private-connection/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/workspace-group/index.ts"],
    outDir: "./dist/workspace-group",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/workspace-group/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/workspace-group/stage/index.ts"],
    outDir: "./dist/stage",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/workspace-group/stage/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
  {
    entry: ["./src/workspace-group/storage/index.ts"],
    outDir: "./dist/storage",
    format: ["cjs", "esm"],
    dts: {
      entry: "./src/workspace-group/storage/index.ts",
      resolve: ["@repo/utils"],
    },
    sourcemap: true,
  },
]);
