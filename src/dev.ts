import { Graph } from "./cluster/tools/Graph";

// Example usage:
const graph = new Graph<number>();

// Create a directed graph for demonstration.
graph.addEdge(1, 2);
graph.addEdge(1, 3);
graph.addEdge(2, 4);
graph.addEdge(3, 4);
graph.addEdge(4, 5);

console.log("Initial Graph BFS:", graph.bfs(1));
console.log("Root vertices:", graph.getRootVertices()); // Typically vertex 1 in this setup.

// Remove an edge and a vertex.
graph.removeEdge(1, 3);
graph.removeVertex(4);

console.log("Graph after removals BFS:", graph.bfs(1));
console.log("Root vertices after removals:", graph.getRootVertices());

export default () => {};
