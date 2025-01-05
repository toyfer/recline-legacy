import type { SupportedLanguage } from "./supported";


// Note: DO NOT use a template string as path here. Bundlers (like webpack) will have trouble resolving them causing suboptimal bundles.
// Some bundlers have special countermeasures for this (when detected), but we might as well avoid the issue entirely.
const wasmImporters: Record<SupportedLanguage, () => Promise<Uint8Array>> = {
  bash: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-bash.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  c: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-c.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  cpp: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-cpp.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  c_sharp: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-c_sharp.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  css: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-css.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  elisp: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-elisp.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  elixir: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-elixir.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  elm: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-elm.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  go: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-go.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  html: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-html.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  java: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-java.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  javascript: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-javascript.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  json: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-json.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  kotlin: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-kotlin.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  lua: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-lua.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  objc: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-objc.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  ocaml: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-ocaml.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  php: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-php.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  python: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-python.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  ql: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-ql.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  rescript: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-rescript.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  ruby: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-ruby.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  rust: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-rust.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  scala: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-scala.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  solidity: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-solidity.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  swift: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-swift.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  systemrdl: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-systemrdl.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  tlaplus: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-tlaplus.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  toml: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-toml.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  tsx: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-tsx.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  typescript: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-typescript.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  vue: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-vue.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  yaml: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-yaml.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  zig: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-zig.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  },
  embedded_template: async () => {
    const wasmUrl = await import("tree-sitter-wasms/out/tree-sitter-embedded_template.wasm");
    const response = await fetch(wasmUrl.default);
    return new Uint8Array(await response.arrayBuffer());
  }
};

export async function importTreeSitterWasm(language: SupportedLanguage): Promise<Uint8Array> {
  return wasmImporters[language]();
}
