export class Graph<T> {
  private adjList: Map<T, T[]> = new Map();

  // Add a vertex if it doesn't exist.
  addVertex(vertex: T): T {
    if (!this.adjList.has(vertex)) {
      this.adjList.set(vertex, []);
    }
    return vertex;
  }

  // Add an edge between source and destination.
  // For an undirected graph, set undirected=true to add both directions.
  addEdge(source: T, destination: T, undirected: boolean = false): void {
    this.addVertex(source);
    this.addVertex(destination);
    this.adjList.get(source)!.push(destination);
    if (undirected) {
      this.adjList.get(destination)!.push(source);
    }
  }

  // Remove a vertex and all its associated edges.
  removeVertex(vertex: T): void {
    // Remove the vertex from the graph.
    if (this.adjList.has(vertex)) {
      this.adjList.delete(vertex);
    }
    // Remove this vertex from the neighbor lists of all other vertices.
    for (const [v, neighbors] of this.adjList) {
      this.adjList.set(
        v,
        neighbors.filter((n) => n !== vertex)
      );
    }
  }

  // Remove an edge from source to destination.
  // For an undirected graph, remove the reverse edge as well.
  removeEdge(source: T, destination: T, undirected: boolean = false): void {
    if (this.adjList.has(source)) {
      this.adjList.set(
        source,
        this.adjList.get(source)!.filter((n) => n !== destination)
      );
    }
    if (undirected && this.adjList.has(destination)) {
      this.adjList.set(
        destination,
        this.adjList.get(destination)!.filter((n) => n !== source)
      );
    }
  }

  // Retrieve vertices with no incoming edges (i.e., root vertices).
  // Note: This is particularly useful in directed acyclic graphs.
  getRootVertices(): T[] {
    const nonRoots = new Set<T>();
    // Mark all vertices that appear as a neighbor (i.e., have incoming edges).
    for (const [, neighbors] of this.adjList) {
      for (const neighbor of neighbors) {
        nonRoots.add(neighbor);
      }
    }
    // Any vertex not in nonRoots is a "root."
    const roots: T[] = [];
    for (const vertex of this.adjList.keys()) {
      if (!nonRoots.has(vertex)) {
        roots.push(vertex);
      }
    }
    return roots;
  }

  // Breadth-First Search (BFS) that finds a path from start to target.
  bfs(start: T, target?: T): T[] | null {
    const visited = new Set<T>();
    const queue: T[] = [];
    const predecessor = new Map<T, T>();

    visited.add(start);
    queue.push(start);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (target !== undefined && current === target) {
        const path: T[] = [];
        let crawl: T | undefined = target;
        path.push(crawl);
        while (predecessor.has(crawl)) {
          crawl = predecessor.get(crawl)!;
          path.push(crawl);
        }
        return path.reverse();
      }

      const neighbors = this.adjList.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            predecessor.set(neighbor, current);
            queue.push(neighbor);
          }
        }
      }
    }
    return target !== undefined ? null : Array.from(visited);
  }

  // Depth-First Search (DFS) starting from a given vertex.
  dfs(start: T, visited: Set<T> = new Set(), result: T[] = []): T[] {
    visited.add(start);
    result.push(start);

    const neighbors = this.adjList.get(start);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          this.dfs(neighbor, visited, result);
        }
      }
    }
    return result;
  }

  // DEBUG AND TESTING
  printGraph(): void {
    for (const [vertex, neighbors] of this.adjList) {
      console.log(vertex, " -> ", neighbors.join(", "));
    }
    console.log("\n");
  }
}

// // Example usage:
// const graph = new Graph<number>();

// // Create a directed graph for demonstration.
// graph.addEdge(1, 2);
// graph.addEdge(1, 3);
// graph.addEdge(2, 4);
// graph.addEdge(3, 4);
// graph.addEdge(4, 5);

// console.log("Initial Graph BFS:", graph.bfs(1));
// console.log("Root vertices:", graph.getRootVertices()); // Typically vertex 1 in this setup.

// // Remove an edge and a vertex.
// graph.removeEdge(1, 3);
// graph.removeVertex(4);

// console.log("Graph after removals BFS:", graph.bfs(1));
// console.log("Root vertices after removals:", graph.getRootVertices());
