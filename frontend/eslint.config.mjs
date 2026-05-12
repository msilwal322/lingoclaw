import nextConfig from "eslint-config-next/core-web-vitals";
import tsConfig from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...tsConfig,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
