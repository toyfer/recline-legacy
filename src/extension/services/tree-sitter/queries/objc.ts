/*
- interface declarations
- implementation declarations
- method declarations
- property declarations
*/
export const objcQuery = `
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
  (implementation_definition
    name: (_) @name) @definition.implementation
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.implementation)
)

(
  (comment)* @doc
  .
  (method_definition
    (method_selector
      (selector_name) @name)) @definition.method
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.method)
)

(
  (comment)* @doc
  .
  (property_declaration
    (property_attributes)?
    type: (_)
    name: (_) @name) @definition.property
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.property)
)

(
  (comment)* @doc
  .
  (category_interface
    name: (_) @name
    category: (_)) @definition.category
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.category)
)
`;
