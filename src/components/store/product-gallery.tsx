"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? "";

  function openZoom(src: string) {
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6 cursor-zoom-out";
    const big = document.createElement("img");
    big.src = src;
    big.alt = name;
    big.className = "max-w-[95vw] max-h-[95vh] object-contain rounded";
    overlay.appendChild(big);
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  return (
    <div className="flex flex-col gap-3 lg:max-w-[42rem] lg:mx-0">
      <div
        className="bg-wash aspect-[3/4] max-h-[78vh] overflow-hidden group cursor-zoom-in"
        onClick={() => openZoom(main)}
        title="Clic para ampliar"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          fetchPriority="high"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((src, idx) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={src + idx}
              src={src}
              alt=""
              className={`w-full aspect-[3/4] object-cover bg-wash cursor-pointer ${active === idx ? "ring-2 ring-ink" : ""}`}
              loading="lazy"
              onClick={() => setActive(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
