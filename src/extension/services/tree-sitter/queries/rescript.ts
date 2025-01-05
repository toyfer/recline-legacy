/*
- module definitions
- type definitions
- function definitions
- external bindings
*/
export const rescriptQuery = `
(
  (comment)* @doc
  .
  (module_declaration
    name: (_) @name) @definition.module
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.module)
)

(
  (comment)* @doc
  .
  (type_declaration
    name: (_) @name) @definition.type
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.type)
)

(
  (comment)* @doc
  .
  (let_declaration
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (external_declaration
    name: (_) @name) @definition.external
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.external)
)

(
  (comment)* @doc
  .
  (record_declaration
    name: (_) @name) @definition.record
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.record)
)
`;
