/**
 * Tree node data structure implementation.
 * The tree node has a value and a set of children nodes.
 * The tree node has a parent node that is the parent of the node.
 * The tree node supports adding, removing, and moving children nodes.
 * The tree node supports iterating over the children nodes.
 * The tree node supports pretty printing.
 */
export class TreeNode<T> {
  private _parent: TreeNode<T> | null = null;

  private _children: Set<TreeNode<T>> = new Set();

  constructor(public value: T) {}

  /**
   * Returns the parent node.
   * @returns The parent node or null if the node has no parent.
   */
  get parent(): TreeNode<T> | null {
    return this._parent;
  }

  /**
   * Returns an iterator over the children of the node.
   * @returns The iterator over the children.
   */
  get children(): SetIterator<TreeNode<T>> {
    return this._children.values();
  }

  /**
   * Checks if the node has a specific child.
   * @param childNode the child node to check.
   * @returns boolean indicating if the node has the child.
   */
  hasChild(childNode: TreeNode<T>): boolean {
    return this._children.has(childNode);
  }

  /**
   * Adds a child node after verifying that adding it will not create a circular reference.
   * @param childNode the child node to add.
   * @returns the added child node.
   */
  addChild(childNode: TreeNode<T>): TreeNode<T> {
    // Prevent a node from being added as a child of itself.
    if (childNode === this) {
      throw new Error("A node cannot be added as a child of itself.");
    }
    // Check that the current node is not already in the child's ancestry chain.
    let current: TreeNode<T> | null = this;
    while (current) {
      if (current === childNode) {
        throw new Error(
          "Invalid move: the child node is an ancestor of the current node."
        );
      }
      current = current.parent;
    }
    // If the child node already has a parent, you might decide to either move it or throw an error.
    // For now, we'll simply update its parent.
    childNode._parent = this;
    this._children.add(childNode);
    return childNode;
  }

  /**
   * Removes a child node from the node.
   * The child node is removed from the set of children.
   * The parent of the child node is set to null.
   * @param childNode the child node to remove.
   * @returns the removed child node.
   */
  removeChild(childNode: TreeNode<T>): TreeNode<T> {
    if (this.hasChild(childNode)) {
      childNode._parent = null;
      this._children.delete(childNode);
    }
    return childNode;
  }

  /**
   * Iterates over the children of the node.
   * @param cb the function to call for each child.
   */
  forEach(cb: (childNode: TreeNode<T>) => void): void {
    this._children.forEach(cb);
  }

  /**
   * Pretty prints the tree.
   * @param indent the indentation to use for each level.
   */
  prettyPrint(indent: string = ""): void {
    console.log(indent + this.value);
    this.forEach((childNode) => childNode.prettyPrint(indent + "  "));
  }
}

/**
 * Tree data structure implementation.
 * The tree is a collection of nodes where each node has a value and a set of children nodes.
 * The tree has a root node that is the starting point for traversals.
 * The tree supports adding, removing, and moving nodes.
 * The tree supports depth-first and breadth-first traversals.
 * The tree supports finding nodes that match a predicate.
 * The tree supports pretty printing.
 */
export class Tree<T> {
  private _rootNode: TreeNode<T> | null = null;
  private _nodeMap: Map<T, TreeNode<T>> = new Map();
  private _cache: {
    bsfNodes: TreeNode<T>[] | null;
    bsfValues: T[] | null;
  } = {
    bsfNodes: null,
    bsfValues: null,
  };

  constructor(root: TreeNode<T> | null = null) {
    if (root) {
      this._rootNode = root;
      this._nodeMap.set(root.value, root);
    }
  }

  /**
   * Invalidates the cache for the tree.
   * This is called when the tree is modified (nodes added or removed).
   */
  private _invalidateCache(): void {
    this._cache.bsfNodes = null;
    this._cache.bsfValues = null;
  }

  /**
   * Adds a node to the tree.
   * If a parent is provided, the node is added as a child of the parent.
   * Else if no root exists, the node is set as the root.
   * Otherwise, the node is added as a child of the current root.
   * The node is also added to the lookup map.
   *
   * @param node the node to add.
   * @param parent the parent node to add the node to.
   * @returns the added node.
   */
  addNode(node: TreeNode<T>, parent?: TreeNode<T>): TreeNode<T> {
    if (this._nodeMap.has(node.value)) {
      throw new Error(
        `A node with value ${node.value} already exists in the tree.`
      );
    }
    if (parent) {
      parent.addChild(node);
    } else {
      if (!this._rootNode) {
        this._rootNode = node;
      } else {
        this._rootNode.addChild(node);
      }
    }
    this._nodeMap.set(node.value, node);
    this._invalidateCache();

    return node;
  }

  /**
   * Removes a node (and all its descendants) from the tree and lookup map.
   *
   * @param node the node to remove.
   * @returns the removed node.
   */
  removeNode(node: TreeNode<T>): TreeNode<T> {
    // If the node is the root, clear the entire tree.
    if (node === this._rootNode) {
      this._removeSubtreeFromMap(node);
      this._rootNode = null;
      return node;
    }
    if (node.parent) {
      node.parent.removeChild(node);
    }
    this._removeSubtreeFromMap(node);
    this._invalidateCache();

    return node;
  }

  /**
   * Helper method to recursively remove a node and all its descendants from the lookup map.
   *
   * @param node the node to remove.
   * @returns the removed node.
   * @private
   */
  private _removeSubtreeFromMap(node: TreeNode<T>): void {
    // Remove the current node.
    this._nodeMap.delete(node.value);
    // Remove all children recursively.
    node.forEach((child) => this._removeSubtreeFromMap(child));
  }

  /**
   * Moves a node to a new parent after verifying that the new parent is not the node itself
   * or one of its descendants.
   *
   * @param node the node to move.
   * @param newParent the new parent node.
   * @returns the moved node.
   */
  moveNode(node: TreeNode<T>, newParent: TreeNode<T>): TreeNode<T> {
    if (node === newParent) {
      throw new Error("Cannot move a node to itself.");
    }
    // Check if newParent is a descendant of node, which would create a cycle.
    let current: TreeNode<T> | null = newParent;
    while (current) {
      if (current === node) {
        throw new Error(
          "Invalid move: new parent is a descendant of the node."
        );
      }
      current = current.parent;
    }
    node.parent?.removeChild(node);
    newParent.addChild(node);
    this._invalidateCache();
    // The lookup map remains valid because the node's value is unchanged.
    return node;
  }

  /**
   * Finds a node in the tree that matches the predicate.
   * If the predicate checks for equality of node.value, consider using getNodeByValue for efficiency.
   *
   * @param predicate the function to call for each node to check if it matches.
   * @returns the node that matches the predicate or null if not found.
   */
  findNode(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
    if (!this._rootNode) return null;
    const stack: TreeNode<T>[] = [this._rootNode];
    while (stack.length) {
      const node = stack.pop()!;
      if (predicate(node)) {
        return node;
      }
      node.forEach((child) => stack.push(child));
    }
    return null;
  }

  /**
   * Efficiently retrieves a node by its value using the lookup map.
   *
   * @param value the value of the node to retrieve.
   * @returns the node with the specified value or undefined if not found.
   */
  getNodeByValue(value: T): TreeNode<T> | undefined {
    return this._nodeMap.get(value);
  }

  /**
   * Traverses the tree using depth-first search (DFS).
   *
   * @param cb the callback function to call for each node.
   * @param startNode the node to start the traversal from (default is the root node).
   */
  traverseDFS(cb: (node: TreeNode<T>) => void, startNode?: TreeNode<T>): void {
    if (!this._rootNode) return;
    const stack: TreeNode<T>[] = [startNode || this._rootNode];
    while (stack.length) {
      const node = stack.pop()!;
      cb(node);
      node.forEach((child) => stack.push(child));
    }
  }

  /**
   * Traverses the tree using breadth-first search (BFS).
   *
   * @param cb the callback function to call for each node.
   * @param startNode the node to start the traversal from.
   */
  traverseBFS(cb: (node: TreeNode<T>) => void, startNode?: TreeNode<T>): void {
    if (!this._rootNode) return;
    const queue: TreeNode<T>[] = [startNode || this._rootNode];
    while (queue.length) {
      const node = queue.shift()!;
      cb(node);
      node.forEach((child) => queue.push(child));
    }
  }

  /**
   * Returns a flattened array of all nodes in the tree using DFS.
   * @returns an array of all nodes in the tree.
   */
  getAllNodes(): TreeNode<T>[] {
    if (this._cache.bsfNodes) {
      return this._cache.bsfNodes;
    }
    const nodes: TreeNode<T>[] = [];
    this.traverseBFS((node) => nodes.push(node));
    this._cache.bsfNodes = nodes;
    return nodes;
  }

  /**
   * Returns a flattened array of all node values in the tree using BFS (topological order).
   * This is useful for rendering or processing the tree in a specific order.
   * @returns an array of all nodes in the tree.
   */
  getAllValues(): T[] {
    if (this._cache.bsfValues) {
      return this._cache.bsfValues;
    }
    const values: T[] = [];
    this.traverseBFS((node) => values.push(node.value));
    this._cache.bsfValues = values;
    return values;
  }

  /**
   * Iterative implementation of prettyPrint to avoid recursion overhead.
   */
  prettyPrint(): void {
    if (!this._rootNode) return;
    const stack: { node: TreeNode<T>; indent: string }[] = [
      { node: this._rootNode, indent: "" },
    ];
    while (stack.length) {
      const { node, indent } = stack.pop()!;
      console.log(`${indent}${node.value}`);
      node.forEach((child) =>
        stack.push({ node: child, indent: indent + "  " })
      );
    }
    console.log("\n");
  }
}
