/*
- function definitions
- comments/documentation
*/
export const bashQuery = `
(
  (comment)* @doc
  .
  (function_definition
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.function)
)
`;
