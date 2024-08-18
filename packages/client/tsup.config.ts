import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["@singlestore/ai", "mysql2"],
    dts: true,
    sourcemap: true,
  },
]);
