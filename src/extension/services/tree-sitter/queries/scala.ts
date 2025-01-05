/*
- class definitions
- object definitions
- trait definitions
- function definitions
- val/var definitions
*/
export const scalaQuery = `
(
  (comment)* @doc
  .
  (class_definition
    name: (_) @name) @definition.class
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.class)
)

(
  (comment)* @doc
  .
  (object_definition
    name: (_) @name) @definition.object
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.object)
)

(
  (comment)* @doc
  .
  (trait_definition
    name: (_) @name) @definition.trait
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.trait)
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
  (val_definition
    pattern: (_) @name) @definition.val
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.val)
)

(
  (comment)* @doc
  .
  (var_definition
    pattern: (_) @name) @definition.var
  (#strip! @doc "^[\\s//*]+|^[\\s//*]$")
  (#select-adjacent! @doc @definition.var)
)
`;
