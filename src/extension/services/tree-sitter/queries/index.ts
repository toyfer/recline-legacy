import type { SupportedLanguage } from "../supported";

import { cQuery } from "./c";
import { goQuery } from "./go";
import { qlQuery } from "./ql";
import { cppQuery } from "./cpp";
import { cssQuery } from "./css";
import { elmQuery } from "./elm";
import { luaQuery } from "./lua";
import { phpQuery } from "./php";
import { vueQuery } from "./vue";
import { zigQuery } from "./zig";
import { tsxQuery } from "./tsx";
import { bashQuery } from "./bash";
import { htmlQuery } from "./html";
import { javaQuery } from "./java";
import { jsonQuery } from "./json";
import { objcQuery } from "./objc";
import { rubyQuery } from "./ruby";
import { rustQuery } from "./rust";
import { tomlQuery } from "./toml";
import { yamlQuery } from "./yaml";
import { elispQuery } from "./elisp";
import { ocamlQuery } from "./ocaml";
import { scalaQuery } from "./scala";
import { swiftQuery } from "./swift";
import { elixirQuery } from "./elixir";
import { kotlinQuery } from "./kotlin";
import { pythonQuery } from "./python";
import { csharpQuery } from "./c-sharp";
import { tlaplusQuery } from "./tlaplus";
import { rescriptQuery } from "./rescript";
import { solidityQuery } from "./solidity";
import { systemrdlQuery } from "./systemrdl";
import { javaScriptQuery } from "./javascript";
import { typescriptQuery } from "./typescript";
import { embedded_templateQuery } from "./embedded_template";


export const supportedQueries: Map<SupportedLanguage, string> = new Map([
  ["bash", bashQuery],
  ["c", cQuery],
  ["cpp", cppQuery],
  ["c_sharp", csharpQuery],
  ["css", cssQuery],
  ["elisp", elispQuery],
  ["elixir", elixirQuery],
  ["elm", elmQuery],
  ["embedded_template", embedded_templateQuery],
  ["go", goQuery],
  ["html", htmlQuery],
  ["java", javaQuery],
  ["javascript", javaScriptQuery],
  ["json", jsonQuery],
  ["kotlin", kotlinQuery],
  ["lua", luaQuery],
  ["objc", objcQuery],
  ["ocaml", ocamlQuery],
  ["php", phpQuery],
  ["python", pythonQuery],
  ["ql", qlQuery],
  ["rescript", rescriptQuery],
  ["ruby", rubyQuery],
  ["rust", rustQuery],
  ["scala", scalaQuery],
  ["solidity", solidityQuery],
  ["swift", swiftQuery],
  ["systemrdl", systemrdlQuery],
  ["tlaplus", tlaplusQuery],
  ["toml", tomlQuery],
  ["typescript", typescriptQuery],
  ["tsx", tsxQuery],
  ["vue", vueQuery],
  ["yaml", yamlQuery],
  ["zig", zigQuery]
]);
