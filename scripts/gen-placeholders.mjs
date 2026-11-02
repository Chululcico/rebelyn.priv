// Genera placeholders SVG para productos mientras no hay fotos reales.
// Uso: node scripts/gen-placeholders.mjs
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const out = join(process.cwd(), "public", "img", "products");
mkdirSync(out, { recursive: true });

const items = [
  { file: "chandal-invierno-burdeos--portada.svg", name: "Chandal de Invierno", variant: "Burdeos", bg: "#4A1F27", fg: "#F5E9EC" },
  { file: "chandal-invierno-burdeos--1.svg", name: "Chandal de Invierno", variant: "Burdeos · Detalle", bg: "#3A151C", fg: "#E8D5DA" },
  { file: "chandal-invierno-crema--portada.svg", name: "Chandal de Invierno", variant: "Crema", bg: "#EFE7D8", fg: "#2A2A2A" },
  { file: "chandal-invierno-crema--1.svg", name: "Chandal de Invierno", variant: "Crema · Detalle", bg: "#E4D9C6", fg: "#2A2A2A" },
  { file: "rebelyn-oversized-tee--portada.svg", name: "Oversized Tee", variant: "Negro", bg: "#141414", fg: "#F2F2F2" },
  { file: "rebelyn-hoodie--portada.svg", name: "Hoodie", variant: "Gris", bg: "#8A8A8A", fg: "#141414" },
  { file: "rebelyn-cargo--portada.svg", name: "Cargo", variant: "Negro", bg: "#1C1C1C", fg: "#DADADA" },
  { file: "rebelyn-zip-hoodie--portada.svg", name: "Zip Hoodie", variant: "Crema", bg: "#E8E2D6", fg: "#1C1C1C" },
  { file: "rebelyn-cap--portada.svg", name: "Cap", variant: "Negro", bg: "#101010", fg: "#00FF76" },
];

for (const item of items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" role="img" aria-label="${item.name} ${item.variant}">
  <rect width="900" height="1200" fill="${item.bg}"/>
  <rect x="48" y="48" width="804" height="1104" fill="none" stroke="${item.fg}" stroke-opacity="0.25" stroke-width="2"/>
  <text x="72" y="120" fill="${item.fg}" font-family="Helvetica, Arial, sans-serif" font-size="28" letter-spacing="14" opacity="0.7">REBELYN</text>
  <g fill="none" stroke="${item.fg}" stroke-opacity="0.5" stroke-width="3">
    <path d="M330 420 l-70 50 v220 l70 40 70-40 70 40 70-40 V470 l-70-50 -70 55 z"/>
    <path d="M400 420 a50 50 0 0 0 100 0"/>
    <line x1="450" y1="520" x2="450" y2="640"/>
  </g>
  <text x="450" y="880" text-anchor="middle" fill="${item.fg}" font-family="Helvetica, Arial, sans-serif" font-size="46" letter-spacing="4">${item.name}</text>
  <text x="450" y="935" text-anchor="middle" fill="${item.fg}" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="6" opacity="0.65">${item.variant}</text>
  <text x="450" y="1120" text-anchor="middle" fill="${item.fg}" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="4" opacity="0.4">IMAGEN PROVISIONAL · SUSTITUIR</text>
</svg>
`;
  writeFileSync(join(out, item.file), svg, "utf8");
  console.log("✓", item.file);
}
