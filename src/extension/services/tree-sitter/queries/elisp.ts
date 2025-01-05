/*
- function definitions
- macro definitions
- special forms
*/
export const elispQuery = `
(
  (comment)* @doc
  .
  (function_definition
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s;]+|^[\\s;]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (macro_definition
    name: (_) @name) @definition.macro
  (#strip! @doc "^[\\s;]+|^[\\s;]$")
  (#select-adjacent! @doc @definition.macro)
)

(
  (comment)* @doc
  .
  (special_form
    name: (_) @name) @definition.special
  (#strip! @doc "^[\\s;]+|^[\\s;]$")
  (#select-adjacent! @doc @definition.special)
)
`;
