export type SupportedLanguage =
  | "bash"
  | "c"
  | "cpp"
  | "c_sharp"
  | "css"
  | "elisp"
  | "elixir"
  | "elm"
  | "go"
  | "html"
  | "java"
  | "javascript"
  | "json"
  | "kotlin"
  | "lua"
  | "objc"
  | "ocaml"
  | "php"
  | "python"
  | "ql"
  | "rescript"
  | "ruby"
  | "rust"
  | "scala"
  | "solidity"
  | "swift"
  | "systemrdl"
  | "tlaplus"
  | "toml"
  | "tsx"
  | "typescript"
  | "vue"
  | "yaml"
  | "zig"
  | "embedded_template";

export const supportedLanguages: Map<SupportedLanguage, string[]> = new Map([
  ["bash", ["sh"]],
  ["c", ["c", "h"]],
  ["cpp", ["cpp", "hpp"]],
  ["c_sharp", ["cs"]],
  ["css", ["css"]],
  ["elisp", ["el"]],
  ["elixir", ["ex"]],
  ["elm", ["elm"]],
  ["go", ["go"]],
  ["html", ["html"]],
  ["java", ["java"]],
  ["javascript", ["js", "jsx"]],
  ["json", ["json"]],
  ["kotlin", ["kt"]],
  ["lua", ["lua"]],
  ["objc", ["m"]],
  ["ocaml", ["ml"]],
  ["php", ["php"]],
  ["python", ["py"]],
  ["ql", ["ql"]],
  ["rescript", ["res"]],
  ["ruby", ["rb"]],
  ["rust", ["rs"]],
  ["scala", ["scala"]],
  ["solidity", ["sol"]],
  ["swift", ["swift"]],
  ["systemrdl", ["systemrdl"]],
  ["tlaplus", ["tla"]],
  ["toml", ["toml"]],
  ["tsx", ["tsx"]],
  ["typescript", ["ts"]],
  ["vue", ["vue"]],
  ["yaml", ["yaml"]],
  ["zig", ["zig"]],
  ["embedded_template", ["ejs", "jinja", "liquid", "njk", "pug", "twig"]]
]);

export const supportedExtensions: string[] = Array.from(supportedLanguages.values()).flat();

// Create a reverse mapping of extension -> language for O(1) lookup
export const extensionToLanguage = new Map(
  Array.from(supportedLanguages.entries())
    .flatMap(([lang, exts]) =>
      exts.map(ext => [ext, lang])
    )
);
