/*
- function definitions
- struct definitions
- type definitions
- enum definitions
*/
export const zigQuery = `
(
  (line_comment)* @doc
  .
  (FnProto
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s//]+|^[\\s//]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (line_comment)* @doc
  .
  (ContainerDecl
    name: (_) @name) @definition.struct
  (#strip! @doc "^[\\s//]+|^[\\s//]$")
  (#select-adjacent! @doc @definition.struct)
)

(
  (line_comment)* @doc
  .
  (VarDecl
    name: (_) @name
    type: (_)) @definition.variable
  (#strip! @doc "^[\\s//]+|^[\\s//]$")
  (#select-adjacent! @doc @definition.variable)
)

(
  (line_comment)* @doc
  .
  (ErrorDecl
    name: (_) @name) @definition.error
  (#strip! @doc "^[\\s//]+|^[\\s//]$")
  (#select-adjacent! @doc @definition.error)
)

(
  (line_comment)* @doc
  .
  (TestDecl
    name: (_) @name) @definition.test
  (#strip! @doc "^[\\s//]+|^[\\s//]$")
  (#select-adjacent! @doc @definition.test)
)
`;
