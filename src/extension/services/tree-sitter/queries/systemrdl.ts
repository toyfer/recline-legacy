/*
- component definitions
- register definitions
- field definitions
- property definitions
*/
export const systemrdlQuery = `
(
  (comment)* @doc
  .
  (component_definition
    name: (_) @name) @definition.component
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.component)
)

(
  (comment)* @doc
  .
  (register_definition
    name: (_) @name) @definition.register
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.register)
)

(
  (comment)* @doc
  .
  (field_definition
    name: (_) @name) @definition.field
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.field)
)

(
  (comment)* @doc
  .
  (property_definition
    name: (_) @name) @definition.property
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.property)
)

(
  (comment)* @doc
  .
  (instance_definition
    name: (_) @name) @definition.instance
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.instance)
)
`;
