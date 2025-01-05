/*
- rule sets
- media queries
- keyframe definitions
- custom property definitions
*/
export const cssQuery = `
(
  (comment)* @doc
  .
  (rule_set
    (selectors
      (class_selector) @name)) @definition.rule
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.rule)
)

(
  (comment)* @doc
  .
  (media_statement) @definition.media
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.media)
)

(
  (comment)* @doc
  .
  (keyframe_block_list
    (keyframe_selector) @name) @definition.keyframe
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.keyframe)
)

(
  (comment)* @doc
  .
  (declaration
    (property_name) @name
    (plain_value
      (function_name) @value)) @definition.custom
  (#match? @name "^--")
  (#strip! @doc "^[\\s\\*/]+|^[\\s\\*/]$")
  (#select-adjacent! @doc @definition.custom)
)
`;
