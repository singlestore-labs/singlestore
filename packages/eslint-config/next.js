/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js", "next/core-web-vitals"],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
    browser: true,
  },
};
