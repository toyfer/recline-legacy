/*
- class definitions
- function definitions
- property definitions
- interface definitions
*/
export const kotlinQuery = `
(
  (comment)* @doc
  .
  (class_declaration
    name: (_) @name) @definition.class
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.class)
)

(
  (comment)* @doc
  .
  (function_declaration
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (property_declaration
    name: (_) @name) @definition.property
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.property)
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
  (object_declaration
    name: (_) @name) @definition.object
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.object)
)
`;
