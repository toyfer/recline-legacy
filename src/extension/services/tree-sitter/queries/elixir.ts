/*
- module definitions
- function definitions
- macro definitions
*/
export const elixirQuery = `
(
  (comment)* @doc
  .
  (module
    name: (_) @name) @definition.module
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.module)
)

(
  (comment)* @doc
  .
  (function
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (macro
    name: (_) @name) @definition.macro
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.macro)
)
`;
