/*
- function definitions
- table definitions
- requires/imports
*/
export const luaQuery = `
(
  (comment)* @doc
  .
  (function_declaration
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (function_definition
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (local_function
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (table_constructor) @definition.table
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.table)
)

(
  (comment)* @doc
  .
  (assignment_statement
    (variable_list
      (identifier) @name)
    (expression_list
      (function_call
        (identifier) @call))) @definition.require
  (#eq? @call "require")
  (#strip! @doc "^[\\s--]+|^[\\s--]$")
  (#select-adjacent! @doc @definition.require)
)
`;
