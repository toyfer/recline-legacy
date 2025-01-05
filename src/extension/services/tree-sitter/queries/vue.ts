/*
- component definitions
- method definitions
- computed properties
- data properties
*/
export const vueQuery = `
(
  (comment)* @doc
  .
  (script_element
    (raw_text
      (export_statement
        (class_declaration
          name: (_) @name)))) @definition.component
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.component)
)

(
  (comment)* @doc
  .
  (script_element
    (raw_text
      (export_statement
        declaration: (object
          (pair
            key: (property_identifier) @name
            value: [(function_expression) (arrow_function)]))))) @definition.method
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.method)
)

(
  (comment)* @doc
  .
  (script_element
    (raw_text
      (export_statement
        (object
          (method_definition
            name: (property_identifier) @name))))) @definition.method
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.method)
)
`;
