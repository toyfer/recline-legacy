/*
- module definitions
- function definitions
- type definitions
- variant definitions
*/
export const ocamlQuery = `
(
  (comment)* @doc
  .
  (module_definition
    name: (_) @name) @definition.module
  (#strip! @doc "^[\\s\\*]+|^[\\s\\*]$")
  (#select-adjacent! @doc @definition.module)
)

(
  (comment)* @doc
  .
  (let_binding
    pattern: (value_pattern) @name) @definition.function
  (#strip! @doc "^[\\s\\*]+|^[\\s\\*]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (type_definition
    name: (_) @name) @definition.type
  (#strip! @doc "^[\\s\\*]+|^[\\s\\*]$")
  (#select-adjacent! @doc @definition.type)
)

(
  (comment)* @doc
  .
  (constructor_declaration
    name: (_) @name) @definition.variant
  (#strip! @doc "^[\\s\\*]+|^[\\s\\*]$")
  (#select-adjacent! @doc @definition.variant)
)

(
  (comment)* @doc
  .
  (external
    name: (_) @name) @definition.external
  (#strip! @doc "^[\\s\\*]+|^[\\s\\*]$")
  (#select-adjacent! @doc @definition.external)
)
`;
