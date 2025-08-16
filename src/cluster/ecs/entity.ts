import { EntityMeta } from "../types";

export const Entity = {
    /**
     * Create a compact 64-bit entity ID from entity metadata.
     *
     * 64-bit structure:
     * - archetype signature: 16 bits (supports 65,536 different archetypes)
     * - chunkId: 16 bits (supports 65,536 chunks per archetype)
     * - row: 16 bits (supports 65,536 entities per chunk)
     * - generation: 16 bits (supports 65,536 generations before wraparound)
     *
     * Maximum capacity: 65,536 archetypes × 65,536 chunks × 65,536 entities = 2^48 entities
     */
    createMetaID(meta: EntityMeta): bigint {
        return (
            (BigInt(meta.archetype.signature & 0xffff) << 48n) |
            (BigInt(meta.chunkId & 0xffff) << 32n) |
            (BigInt(meta.row & 0xffff) << 16n) |
            BigInt(meta.generation & 0xffff)
        );
    },

    /**
     * Decode a 64-bit entity ID back to its component parts.
     */
    decodeMetaID(id: bigint): {
        archetypeSignature: number;
        chunkId: number;
        row: number;
        generation: number;
    } {
        return {
            archetypeSignature: Number((id >> 48n) & 0xffffn),
            chunkId: Number((id >> 32n) & 0xffffn),
            row: Number((id >> 16n) & 0xffffn),
            generation: Number(id & 0xffffn),
        };
    },

    /**
     * Check if an entity ID is valid (within expected ranges).
     */
    isValid(id: bigint): boolean {
        const decoded = Entity.decodeMetaID(id);
        return (
            decoded.archetypeSignature > 0 &&
            decoded.chunkId >= 0 &&
            decoded.row >= 0 &&
            decoded.generation >= 0
        );
    },

    /**
     * Get the maximum values for each component of a 64-bit entity ID.
     */
    getMaxValues() {
        return {
            archetypeSignature: 0xffff, // 65,535
            chunkId: 0xffff, // 65,535
            row: 0xffff, // 65,535
            generation: 0xffff, // 65,535
        };
    },

    /**
     * Convert a 64-bit entity ID to a string for debugging/logging.
     */
    toString(id: bigint): string {
        const decoded = Entity.decodeMetaID(id);
        return `Entity(archetype:${decoded.archetypeSignature}, chunk:${decoded.chunkId}, row:${decoded.row}, gen:${decoded.generation})`;
    },

    /**
     * Check if two entity IDs represent the same entity location (ignoring generation).
     */
    sameLocation(id1: bigint, id2: bigint): boolean {
        const d1 = Entity.decodeMetaID(id1);
        const d2 = Entity.decodeMetaID(id2);
        return (
            d1.archetypeSignature === d2.archetypeSignature &&
            d1.chunkId === d2.chunkId &&
            d1.row === d2.row
        );
    },
};
