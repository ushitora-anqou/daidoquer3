export const mode = "production";
export const entry = "./src/main.ts";
export const module = {
  rules: [
    {
      test: /\.ts$/,
      use: "ts-loader",
    },
  ],
};
export const resolve = {
  extensions: [".ts", ".js"],
};
export const target = ["web", "es6"];
