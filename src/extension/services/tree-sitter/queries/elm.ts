/*
- module declarations
- type definitions
- function definitions
*/
export const elmQuery = `
(
  (line_comment)* @doc
  .
  (module_declaration
    name: (_) @name) @definition.module
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.module)
)

(
  (line_comment)* @doc
  .
  (type_declaration
    name: (_) @name) @definition.type
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.type)
)

(
  (line_comment)* @doc
  .
  (function_declaration_left
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (line_comment)* @doc
  .
  (port_declaration
    name: (_) @name) @definition.port
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.port)
)
`;
