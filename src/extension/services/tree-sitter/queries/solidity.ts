/*
- contract definitions
- function definitions
- event definitions
- modifier definitions
- struct definitions
*/
export const solidityQuery = `
(
  (comment)* @doc
  .
  (contract_declaration
    name: (_) @name) @definition.contract
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.contract)
)

(
  (comment)* @doc
  .
  (function_definition
    name: (_) @name) @definition.function
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (event_definition
    name: (_) @name) @definition.event
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.event)
)

(
  (comment)* @doc
  .
  (modifier_definition
    name: (_) @name) @definition.modifier
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.modifier)
)

(
  (comment)* @doc
  .
  (struct_declaration
    name: (_) @name) @definition.struct
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.struct)
)

(
  (comment)* @doc
  .
  (interface_declaration
    name: (_) @name) @definition.interface
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.interface)
)
`;
