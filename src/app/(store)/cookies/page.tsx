import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de cookies" };

export default function CookiesPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Política de cookies</h1>
      <div className="prose-store">
        <p className="text-[1.35rem] text-muted">
          De conformidad con lo dispuesto en la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REBELYN informa a los usuarios sobre el uso de cookies en este sitio web.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">1. ¿Qué son las cookies?</h2>
        <p className="text-[1.4rem] text-muted">
          Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario al visitar una página web. Permiten recordar sus preferencias, mantener la sesión y garantizar el correcto funcionamiento del sitio.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">2. ¿Qué cookies utilizamos?</h2>
        <p className="text-[1.4rem] text-muted">
          En rebelyn.net únicamente se utilizan <strong>cookies técnicas estrictamente necesarias</strong> para el funcionamiento de la web. No utilizamos cookies de análisis, publicidad comportamental ni cookies de terceros con fines publicitarios.
        </p>

        <div className="overflow-x-auto border hairline mt-6">
          <table className="w-full text-left text-[1.35rem]">
            <thead>
              <tr className="border-b hairline">
                <th className="p-4 text-[1.2rem] uppercase tracking-[0.1em]">Cookie</th>
                <th className="p-4 text-[1.2rem] uppercase tracking-[0.1em]">Tipo</th>
                <th className="p-4 text-[1.2rem] uppercase tracking-[0.1em]">Finalidad</th>
                <th className="p-4 text-[1.2rem] uppercase tracking-[0.1em]">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hairline">
                <td className="p-4">rb_session</td>
                <td className="p-4">Técnica / Propia</td>
                <td className="p-4">Mantener la sesión del usuario autenticado</td>
                <td className="p-4">30 días</td>
              </tr>
              <tr className="border-b hairline">
                <td className="p-4">rb_cart</td>
                <td className="p-4">Técnica / Propia</td>
                <td className="p-4">Guardar los productos añadidos al carrito</td>
                <td className="p-4">30 días</td>
              </tr>
              <tr>
                <td className="p-4">rb_cookies</td>
                <td className="p-4">Técnica / Propia</td>
                <td className="p-4">Recordar la aceptación del aviso de cookies</td>
                <td className="p-4">1 año</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">3. Consentimiento</h2>
        <p className="text-[1.4rem] text-muted">
          Al acceder por primera vez al sitio web, se muestra un banner de cookies informando sobre las cookies técnicas estrictamente necesarias. Al continuar navegando o aceptar el aviso, se entiende otorgado el consentimiento para su uso, siempre que sean las necesarias para el funcionamiento del sitio.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">4. ¿Cómo deshabilitar o eliminar las cookies?</h2>
        <p className="text-[1.4rem] text-muted">
          El usuario puede configurar su navegador para bloquear o eliminar las cookies. A continuación se facilitan enlaces a la configuración de los navegadores más utilizados:
        </p>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6 mt-3">
          <li><a className="underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a className="underline" href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a className="underline" href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
          <li><a className="underline" href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>
        <p className="text-[1.4rem] text-muted mt-4">
          Tenga en cuenta que la desactivación de las cookies estrictamente necesarias puede impedir el correcto funcionamiento del carrito, el proceso de compra y el inicio de sesión.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">5. Actualizaciones</h2>
        <p className="text-[1.4rem] text-muted">
          REBELYN podrá actualizar la presente Política de Cookies en función de cambios legislativos o técnicos. Se recomienda revisar esta página periódicamente.
        </p>
      </div>
    </section>
  );
}
