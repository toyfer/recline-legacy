/*
- block definitions
- include statements
- macro/function definitions
- custom tag definitions
*/
export const embedded_templateQuery = `
(
  (comment)* @doc
  .
  (block
    name: (_) @name) @definition.block
  (#strip! @doc "^[\\s{%-]+|^[\\s-%}]$")
  (#select-adjacent! @doc @definition.block)
)

(
  (comment)* @doc
  .
  (include_statement
    path: (_) @name) @definition.include
  (#strip! @doc "^[\\s{%-]+|^[\\s-%}]$")
  (#select-adjacent! @doc @definition.include)
)

(
  (comment)* @doc
  .
  (macro_definition
    name: (_) @name) @definition.macro
  (#strip! @doc "^[\\s{%-]+|^[\\s-%}]$")
  (#select-adjacent! @doc @definition.macro)
)

(
  (comment)* @doc
  .
  (function_definition
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s{%-]+|^[\\s-%}]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (partial_statement
    path: (_) @name) @definition.partial
  (#strip! @doc "^[\\s{%-]+|^[\\s-%}]$")
  (#select-adjacent! @doc @definition.partial)
)

(
  (comment)* @doc
  .
  (custom_tag
    name: (_) @name) @definition.tag
  (#strip! @doc "^[\\s{%-]+|^[\\s-%}]$")
  (#select-adjacent! @doc @definition.tag)
)
`;
