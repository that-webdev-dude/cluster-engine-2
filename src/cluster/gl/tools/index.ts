export class GLTools {
    public static createOrthoMatrix(w: number, h: number) {
        // prettier-ignore
        return new Float32Array([
            2/w,    0,      0,      0,
            0,     -2/h,    0,      0,
            0,      0,      1,      0,
           -1,      1,      0,      1,
        ]);
    }
}
