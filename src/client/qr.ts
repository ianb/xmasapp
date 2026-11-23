import { encode } from "uqr";

const SVG_NS = "http://www.w3.org/2000/svg";
/** The QR spec asks for a 4-module blank margin around the code. */
const QUIET = 4;

/** Render text as a QR code: dark modules on white, scaling to fit its container. */
export function qrSvg(text: string): SVGSVGElement {
  const { data, size } = encode(text, { ecc: "M", border: 0 });
  let d = "";
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `${-QUIET} ${-QUIET} ${size + QUIET * 2} ${size + QUIET * 2}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `QR code for ${text}`);
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", String(-QUIET));
  bg.setAttribute("y", String(-QUIET));
  bg.setAttribute("width", String(size + QUIET * 2));
  bg.setAttribute("height", String(size + QUIET * 2));
  bg.setAttribute("fill", "#fff");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "#000");
  svg.append(bg, path);
  return svg;
}
