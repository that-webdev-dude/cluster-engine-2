/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

class DebugOverlay {
    private readonly dbContext: CanvasRenderingContext2D;
    private readonly canvas: HTMLCanvasElement;
    private disposed = false;
    constructor(
        private readonly w: number,
        private readonly h: number,
        private readonly zIndex: number,
        public enabled: boolean = true
    ) {
        const dbCanvas = document.createElement("canvas");
        dbCanvas.width = w;
        dbCanvas.height = h;
        dbCanvas.style.position = "absolute";
        dbCanvas.style.zIndex = `${zIndex}`;
        dbCanvas.style.border = "2px solid red";
        dbCanvas.style.pointerEvents = "none";
        // Allow multiple overlays to be stacked and centered
        document.querySelector("#app")?.appendChild(dbCanvas);
        this.canvas = dbCanvas;
        this.dbContext = dbCanvas.getContext("2d")!;
    }

    dot(x: number, y: number, r: number, color: string) {
        this.dbContext.beginPath();
        this.dbContext.arc(x, y, r, 0, Math.PI * 2);
        this.dbContext.fillStyle = color;
        this.dbContext.fill();
    }

    line(
        sx: number,
        sy: number,
        ex: number,
        ey: number,
        width: number,
        color: string,
        lineDash: number = 0
    ) {
        this.dbContext.beginPath();
        this.dbContext.moveTo(sx, sy);
        this.dbContext.lineTo(ex, ey);
        this.dbContext.lineWidth = width;
        if (lineDash > 0) {
            this.dbContext.setLineDash([lineDash, lineDash]);
        }
        this.dbContext.strokeStyle = `${color}`;
        this.dbContext.stroke();
        this.dbContext.setLineDash([]);
    }

    text(text: string, x: number, y: number, font: string, color: string) {
        this.dbContext.font = font;
        this.dbContext.fillStyle = color;
        this.dbContext.fillText(text, x, y);
    }

    clear() {
        this.dbContext.clearRect(0, 0, this.w, this.h);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.clear();
        this.enabled = false;
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }
}

export { DEBUG, DebugOverlay };
