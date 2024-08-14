const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier", "turbo"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "only-warn", "import", "prettier"],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [{ files: ["*.js?(x)", "*.ts?(x)"] }],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-types": "off",
    "turbo/no-undeclared-env-vars": "off",
    "no-console": "warn",
    "prettier/prettier": "warn",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "type", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        "distinctGroup": false,
        "alphabetize": {
          order: "asc",
          caseInsensitive: true,
        },
        "warnOnUnassignedImports": true,
      },
    ],
  },
};
