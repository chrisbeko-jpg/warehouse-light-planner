import * as THREE from "three";

/** Procedural light oak parquet albedo (1 m repeat). */
export function createParquetTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c9a66b";
  ctx.fillRect(0, 0, size, size);
  const plankW = size / 8;
  const plankH = size / 32;
  for (let row = 0; row < 32; row++) {
    const offset = (row % 2) * (plankW / 2);
    for (let col = -1; col < 9; col++) {
      const x = col * plankW + offset;
      const y = row * plankH;
      const tone = row % 3 === 0 ? "#b8925a" : "#d4b07a";
      ctx.fillStyle = tone;
      ctx.fillRect(x, y, plankW - 2, plankH - 1);
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.strokeRect(x, y, plankW - 2, plankH - 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
