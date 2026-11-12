/**
 * Codificador Code 39 mínimo (sin dependencias) para la etiqueta de envío.
 * Code 39 admite números, letras mayúsculas, espacio y - . $ / + %.
 * Devuelve las barras ya posicionadas para dibujarlas como SVG.
 */

const CODE39: Record<string, string> = {
  "0": "101001101101",
  "1": "110100101011",
  "2": "101100101011",
  "3": "110110010101",
  "4": "101001101011",
  "5": "110100110101",
  "6": "101100110101",
  "7": "101001011011",
  "8": "110100101101",
  "9": "101100101101",
  A: "110101001011",
  B: "101101001011",
  C: "110110100101",
  D: "101011001011",
  E: "110101100101",
  F: "101101100101",
  G: "101010011011",
  H: "110101001101",
  I: "101101001101",
  J: "101011001101",
  K: "110101010011",
  L: "101101010011",
  M: "110110101001",
  N: "101011010011",
  O: "110101101001",
  P: "101101101001",
  Q: "101010110011",
  R: "110101011001",
  S: "101101011001",
  T: "101011011001",
  U: "110010101011",
  V: "100110101011",
  W: "110011010101",
  X: "100101101011",
  Y: "110010110101",
  Z: "100110110101",
  "-": "100101011011",
  ".": "110010101101",
  " ": "100110101101",
  $: "100100100101",
  "/": "100100101001",
  "+": "100101001001",
  "%": "101001001001",
  "*": "100101101101",
};

export function sanitizeCode39(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .filter((char) => char !== "*" && Boolean(CODE39[char]))
    .join("")
    .slice(0, 40);
}

export function code39Pattern(value: string): { bars: { x: number; w: number }[]; total: number } {
  const text = `*${sanitizeCode39(value)}*`;
  const elements: { bar: boolean; width: number }[] = [];

  for (const char of text) {
    const bits = CODE39[char];
    if (!bits) continue;

    let index = 0;
    let isBar = true;
    while (index < bits.length) {
      const bit = bits[index];
      let run = 0;
      while (index < bits.length && bits[index] === bit) {
        run++;
        index++;
      }
      // Cada elemento es barra o espacio; ancho 1 = estrecho, 2 = ancho.
      elements.push({ bar: isBar, width: run });
      isBar = !isBar;
    }
    // Separación estrecha entre caracteres.
    elements.push({ bar: false, width: 1 });
  }

  let x = 0;
  const bars: { x: number; w: number }[] = [];
  for (const element of elements) {
    if (element.bar) bars.push({ x, w: element.width });
    x += element.width;
  }

  return { bars, total: x };
}
