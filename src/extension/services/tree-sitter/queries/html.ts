/*
- custom elements
- elements with id attributes
- semantic elements (header, nav, main, etc)
*/
export const htmlQuery = `
(
  (comment)* @doc
  .
  (element
    (start_tag
      (tag_name) @name
      (attribute
        (attribute_name) @attr
        (quoted_attribute_value) @value))) @definition.element
  (#match? @name "^[A-Z]")  // Match custom elements (typically capitalized)
  (#strip! @doc "^[\\s<!--]+|[\\s-->]+$")
  (#select-adjacent! @doc @definition.element)
)

(
  (comment)* @doc
  .
  (element
    (start_tag
      (tag_name) @name
      (attribute
        (attribute_name) @attr
        (quoted_attribute_value) @value))) @definition.element
  (#eq? @attr "id")  // Match elements with ID
  (#strip! @doc "^[\\s<!--]+|[\\s-->]+$")
  (#select-adjacent! @doc @definition.element)
)

(
  (comment)* @doc
  .
  (element
    (start_tag
      (tag_name) @name)) @definition.semantic
  (#match? @name "^(header|nav|main|footer|article|section|aside)$")  // Match semantic elements
  (#strip! @doc "^[\\s<!--]+|[\\s-->]+$")
  (#select-adjacent! @doc @definition.semantic)
)
`;
