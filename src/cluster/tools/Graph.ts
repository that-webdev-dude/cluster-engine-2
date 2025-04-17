// --- Graph: a graph with labeled edges --- //
export class Graph<T, L> {
  // We store the neighbors in a Map from vertex -> array of {target, label}.
  private adjList: Map<T, Array<{ target: T; label: L }>> = new Map();
  // Set of vertices that have been removed, so their edges can be cleaned up lazily.
  private removedVertices: Set<T> = new Set();

  // Add a vertex (if not already present).
  addVertex(vertex: T): void {
    // If the vertex was marked removed, clear it from the removed set.
    if (this.removedVertices.has(vertex)) {
      this.removedVertices.delete(vertex);
    }
    if (!this.adjList.has(vertex)) {
      this.adjList.set(vertex, []);
    }
  }

  // Add an edge from source to target with a label.
  addEdge(source: T, target: T, label: L): void {
    this.addVertex(source);
    this.addVertex(target);
    this.adjList.get(source)!.push({ target, label });
  }

  // Get all neighbors (edges) from a vertex.
  getNeighbors(vertex: T): Array<{ target: T; label: L }> {
    const neighbors = this.adjList.get(vertex) || [];
    return neighbors.filter((edge) => !this.removedVertices.has(edge.target));
  }

  // Remove a vertex and all edges associated with it.
  removeVertex(vertex: T): void {
    // Mark the vertex as removed.
    this.removedVertices.add(vertex);
    // Remove its own edge list.
    this.adjList.delete(vertex);
  }

  /**
   * Optional: perform a full cleanup of all edges pointing to removed vertices.
   * You can call this periodically (e.g., once per frame or every few seconds)
   * to keep the graph lean.
   */
  cleanupRemovedVertices(): void {
    for (const [v, neighbors] of this.adjList) {
      // Filter out any edge whose target is in removedVertices.
      const filtered = neighbors.filter(
        (edge) => !this.removedVertices.has(edge.target)
      );
      this.adjList.set(v, filtered);
    }
    // Clear the removed vertices set since their references are now cleaned.
    this.removedVertices.clear();
  }
}
