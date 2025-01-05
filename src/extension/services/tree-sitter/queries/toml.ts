/*
- table definitions
- array table definitions
- key value pairs
*/
export const tomlQuery = `
(
  (comment)* @doc
  .
  (table
    (table_array_element) @name) @definition.table_array
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.table_array)
)

(
  (comment)* @doc
  .
  (table
    name: (_) @name) @definition.table
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.table)
)

(
  (comment)* @doc
  .
  (pair
    key: (_) @name
    value: (array)) @definition.array
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.array)
)

(
  (comment)* @doc
  .
  (pair
    key: (_) @name
    value: (inline_table)) @definition.inline_table
  (#strip! @doc "^[\\s#]+|^[\\s#]$")
  (#select-adjacent! @doc @definition.inline_table)
)
`;
