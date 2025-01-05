/*
- component definitions
- TSX function components
- hook definitions
- JSX/TSX patterns
*/
export const tsxQuery = `
(
  (comment)* @doc
  .
  (class_declaration
    name: (_) @name) @definition.component
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.component)
)

(
  (comment)* @doc
  .
  (function_declaration
    name: (identifier) @name) @definition.function
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (variable_declarator
    name: (_) @name
    value: [(arrow_function) (function_expression)]) @definition.function
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (lexical_declaration
    (variable_declarator
      name: (_) @name
      value: [(arrow_function) (function_expression)]) @definition.hook)
  (#match? @name "^use[A-Z]")
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.hook)
)

(
  (comment)* @doc
  .
  (interface_declaration
    name: (_) @name) @definition.interface
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.interface)
)

(
  (comment)* @doc
  .
  (type_alias_declaration
    name: (_) @name) @definition.type
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.type)
)
`;
