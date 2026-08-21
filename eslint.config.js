const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/*.js", "**/*.d.ts"]
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true
        }
      ]
    }
  }
);
