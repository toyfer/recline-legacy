/*
- top-level block mappings
- document-level definitions
*/
export const yamlQuery = `
(
  (block_mapping_pair
    key: (_) @name
    value: (block_mapping)) @definition.mapping
)

(
  (document
    (block_mapping
      (block_mapping_pair
        key: (_) @name))) @definition.document
)
`;
