/**
 * SoA data for rectangle instances.
 * positions: [x0,y0,x1,y1,...]
 * sizes:     [w0,h0,w1,h1,...]
 * colors:    [r0,g0,b0,a0,r1,g1,b1,a1,...]
 */
export interface RectData {
  positions: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
}
