import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["mongodb", "mysql2"],
    dts: true,
    sourcemap: true,
  },
]);
