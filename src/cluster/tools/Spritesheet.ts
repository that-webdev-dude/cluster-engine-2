export class Spritesheet {
    constructor(
        readonly img: HTMLImageElement,
        readonly rows: number,
        readonly cols: number
    ) {}

    get width() {
        return this.img.naturalWidth;
    }

    get height() {
        return this.img.naturalHeight;
    }

    get frameWidth() {
        return this.img.naturalWidth / this.cols;
    }

    get frameHeight() {
        return this.img.naturalHeight / this.rows;
    }

    framePxFromMap(row: number, col: number): [number, number] {
        return [col * this.frameWidth, row * this.frameHeight];
    }

    frameIndexFromMap(row: number, col: number): number {
        return row * this.cols + col;
    }

    frameMapFromPx(px: number, py: number): [number, number] {
        const col = Math.floor(px / this.frameWidth);
        const row = Math.floor(py / this.frameHeight);
        return [row, col];
    }

    frameIndexFromPx(px: number, py: number): number {
        const [row, col] = this.frameMapFromPx(px, py);
        return this.frameIndexFromMap(row, col);
    }

    framePxFromIndex(index: number): [number, number] {
        const row = Math.floor(index / this.cols);
        const col = index % this.cols;
        return this.framePxFromMap(row, col);
    }

    frameMapFromIndex(index: number): [number, number] {
        const row = Math.floor(index / this.cols);
        const col = index % this.cols;
        return [row, col];
    }

    frameRectFromMap(
        row: number,
        col: number
    ): [number, number, number, number] {
        const [x, y] = this.framePxFromMap(row, col);
        return [x, y, this.frameWidth, this.frameHeight];
    }

    frameRectFromIndex(index: number): [number, number, number, number] {
        const [row, col] = this.frameMapFromIndex(index);
        return this.frameRectFromMap(row, col);
    }
}
