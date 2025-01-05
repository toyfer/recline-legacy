/*
- class definitions
- predicate definitions
- query definitions
*/
export const qlQuery = `
(
  (comment)* @doc
  .
  (class
    name: (_) @name) @definition.class
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.class)
)

(
  (comment)* @doc
  .
  (predicate
    name: (_) @name) @definition.predicate
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.predicate)
)

(
  (comment)* @doc
  .
  (select
    name: (_) @name) @definition.query
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.query)
)

(
  (comment)* @doc
  .
  (module
    name: (_) @name) @definition.module
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.module)
)

(
  (comment)* @doc
  .
  (import
    module: (_) @name) @definition.import
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.import)
)
`;
