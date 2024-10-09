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
]);
