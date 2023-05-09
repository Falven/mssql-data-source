import { type GraphQLResolveInfo, type FieldNode, visit } from 'graphql';

/**
 * Find the first node in the GraphQLResolveInfo with the given case insensitive name.
 * @param {GraphQLResolveInfo} info - The GraphQL resolve information object.
 * @param {string} nodeName - The case insensitive name of the node to find.
 * @returns {FieldNode | undefined} - The found node, or undefined if not found.
 */
export function findNodeByName(info: GraphQLResolveInfo, nodeName: string): FieldNode | undefined {
  let targetNode: FieldNode | undefined;

  // Iterate through the fieldNodes, stopping when the target node is found
  info.fieldNodes.some((fieldNode) =>
    visit(fieldNode, {
      Field(node) {
        // Compare the node's name (case insensitive) to the target nodeName
        if (node.name.value.toLowerCase() === nodeName.toLowerCase()) {
          targetNode = node;
          return false; // Stop traversal once the target node is found
        }
      },
    }),
  );

  return targetNode;
}

/**
 * Get a dictionary of all subfields of the given target node, where the keys are
 * the lowercase subfield names and the values are the correctly cased names.
 * @param {FieldNode} targetNode - The target node whose subfield names to retrieve.
 * @returns {Record<string, string>} - A dictionary mapping lowercase subfield names to their correctly cased names.
 */
export function getSelectionSetNames(targetNode: FieldNode): Record<string, string> {
  const subfieldNames: Record<string, string> = {};

  // If the target node has a selection set, visit its subfields and collect their names
  if (targetNode.selectionSet !== undefined) {
    visit(targetNode.selectionSet, {
      Field(node) {
        subfieldNames[node.name.value.toLowerCase()] = node.name.value;
      },
    });
  }

  return subfieldNames;
}

/**
 * Find the first node with the given case insensitive name in the GraphQLResolveInfo
 * and return a dictionary of its subfield names, where the keys are the lowercase
 * subfield names and the values are the correctly cased names.
 * @param {GraphQLResolveInfo} info - The GraphQL resolve information object.
 * @param {string} nodeName - The case insensitive name of the node to find.
 * @returns {Record<string, string>} - A dictionary of subfield names, or an empty dictionary if the node is not found.
 */
export function getNodeSelectionSetNames(
  info: GraphQLResolveInfo,
  nodeName: string,
): Record<string, string> {
  const targetNode = findNodeByName(info, nodeName);

  // If the target node is not found, return an empty dictionary
  if (targetNode === undefined) {
    return {};
  }

  // If the target node is found, return its subfield names
  return getSelectionSetNames(targetNode);
}

/**
 * Get a dictionary of all field names excluding those of the given nodeName,
 * where the keys are the lowercase sibling field names and the values are the
 * correctly cased names.
 * @param {GraphQLResolveInfo} info - The GraphQL resolve information object.
 * @param {string} nodeName - The case insensitive name of the node to exclude.
 * @returns {Record<string, string>} - A dictionary mapping lowercase sibling field names to their correctly cased names, or an empty dictionary if the node is not found.
 */
export function getFieldNamesExcludingNode(
  info: GraphQLResolveInfo,
  nodeName: string,
): Record<string, string> {
  const siblingFields: Record<string, string> = {};
  info.fieldNodes.forEach((fieldNode) => {
    visit(fieldNode, {
      Field(node) {
        const isTargetNode = node.name.value.toLowerCase() === nodeName.toLowerCase();
        if (isTargetNode) {
          return false;
        } else {
          siblingFields[node.name.value.toLowerCase()] = node.name.value;
        }
      },
    });
  });
  return siblingFields;
}
