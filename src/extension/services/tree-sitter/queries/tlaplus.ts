/*
- module definitions
- operator definitions
- theorem declarations
- constant declarations
*/
export const tlaplusQuery = `
(
  (comment)* @doc
  .
  (module_definition
    name: (_) @name) @definition.module
  (#strip! @doc "^[\\s\\(*]+|^[\\s\\*)]$")
  (#select-adjacent! @doc @definition.module)
)

(
  (comment)* @doc
  .
  (operator_definition
    name: (_) @name) @definition.operator
  (#strip! @doc "^[\\s\\(*]+|^[\\s\\*)]$")
  (#select-adjacent! @doc @definition.operator)
)

(
  (comment)* @doc
  .
  (theorem
    name: (_) @name) @definition.theorem
  (#strip! @doc "^[\\s\\(*]+|^[\\s\\*)]$")
  (#select-adjacent! @doc @definition.theorem)
)

(
  (comment)* @doc
  .
  (constant_declaration
    name: (_) @name) @definition.constant
  (#strip! @doc "^[\\s\\(*]+|^[\\s\\*)]$")
  (#select-adjacent! @doc @definition.constant)
)

(
  (comment)* @doc
  .
  (variable_declaration
    name: (_) @name) @definition.variable
  (#strip! @doc "^[\\s\\(*]+|^[\\s\\*)]$")
  (#select-adjacent! @doc @definition.variable)
)
`;
