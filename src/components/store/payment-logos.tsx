/**
 * Logos de métodos de pago dibujados como SVG local.
 * No se cargan assets externos ni oficiales: son representaciones simples
 * para identificar el método en el checkout.
 */

export type PaymentLogoId = "visa" | "mastercard" | "maestro" | "amex" | "applepay" | "googlepay" | "card";

export function PaymentLogo({ id, className = "" }: { id: string; className?: string }) {
  const common = {
    role: "img" as const,
    "aria-hidden": true as const,
    focusable: false as const,
    viewBox: "0 0 48 30",
    className: `h-[2.2rem] w-auto ${className}`,
  };

  switch (id) {
    case "visa":
      return (
        <svg {...common}>
          <title>Visa</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#1A1F71" />
          <text x="24" y="20" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontStyle="italic" fontSize="11" fill="#ffffff" letterSpacing="1">VISA</text>
        </svg>
      );
    case "mastercard":
      return (
        <svg {...common}>
          <title>Mastercard</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#16202F" />
          <circle cx="19" cy="15" r="9" fill="#EB001B" />
          <circle cx="29" cy="15" r="9" fill="#F79E1B" fillOpacity="0.9" />
          <path d="M24 7.6a9 9 0 0 0 0 14.8 9 9 0 0 0 0-14.8Z" fill="#FF5F00" />
        </svg>
      );
    case "maestro":
      return (
        <svg {...common}>
          <title>Maestro</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#16202F" />
          <circle cx="19" cy="15" r="9" fill="#0099DF" />
          <circle cx="29" cy="15" r="9" fill="#EB001B" fillOpacity="0.9" />
          <path d="M24 7.6a9 9 0 0 0 0 14.8 9 9 0 0 0 0-14.8Z" fill="#7375CF" />
        </svg>
      );
    case "amex":
      return (
        <svg {...common}>
          <title>American Express</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#016FD0" />
          <rect x="4" y="9" width="40" height="12" rx="1.5" fill="#ffffff" />
          <text x="24" y="18.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="8" fill="#016FD0" letterSpacing="0.5">AMEX</text>
        </svg>
      );
    case "applepay":
      return (
        <svg {...common}>
          <title>Apple Pay</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#000000" />
          {/* Manzana simplificada: dos círculos solapados + muesca + hoja */}
          <circle cx="11.2" cy="16.4" r="4.9" fill="#ffffff" />
          <circle cx="16" cy="16.4" r="4.9" fill="#ffffff" />
          <circle cx="13.6" cy="12.1" r="1.3" fill="#000000" />
          <path d="M15.6 7.6c.6-1.4 1.9-2.3 3-2.4-.1 1.3-1.2 2.5-2.6 2.6-.3 0-.5-.1-.4-.2z" fill="#ffffff" />
          <text x="33.5" y="19.8" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="11" fill="#ffffff">Pay</text>
        </svg>
      );
    case "googlepay":
      return (
        <svg {...common}>
          <title>Google Pay</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#ffffff" stroke="#dfe1e5" strokeWidth="1" />
          {/* G de Google simplificada en 4 colores + barra horizontal */}
          <g fill="none" strokeWidth="2.7" strokeLinecap="round">
            <path d="M13 6.8A6.3 6.3 0 0 0 6.7 13.1" stroke="#EA4335" />
            <path d="M6.7 13.1A6.3 6.3 0 0 0 13 19.4" stroke="#FBBC05" />
            <path d="M13 19.4A6.3 6.3 0 0 0 19.3 13.1" stroke="#34A853" />
            <path d="M19.3 13.1A6.3 6.3 0 0 0 13 6.8" stroke="#4285F4" />
            <path d="M14.5 13.1H19.3" stroke="#4285F4" />
          </g>
          <text x="34" y="17.2" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="10" fill="#3c4043">Pay</text>
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <title>Tarjeta</title>
          <rect x="0" y="0" width="48" height="30" rx="4" fill="#E7E5E4" stroke="#202020" strokeWidth="1.5" />
          <rect x="0" y="7" width="48" height="5" fill="#202020" />
          <rect x="5" y="16" width="10" height="7" rx="1.5" fill="#D6B25E" stroke="#202020" strokeWidth="0.75" />
          <line x1="20" y1="23" x2="43" y2="23" stroke="#202020" strokeWidth="1.5" />
        </svg>
      );
  }
}

/** Sello "SumUp" simple (texto) para indicar la pasarela segura. */
export function SecurePaymentBadge() {
  return (
    <span className="inline-flex items-center gap-2 border hairline px-3 py-1 text-[1.2rem] uppercase tracking-[0.14em]">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M8 1 3 3v4c0 3.5 2.2 6.4 5 7 2.8-.6 5-3.5 5-7V3L8 1Zm0 2.1L12 4.7v2.3c0 2.6-1.6 4.8-4 5.4-2.4-.6-4-2.8-4-5.4V4.7l4-2.6Zm-.9 3.1L5.7 7.6 7.3 9.2l3-3-1.2-1.2-1.8 1.8-.9-.9-.3.3Z" />
      </svg>
      Pago seguro · SumUp
    </span>
  );
}
