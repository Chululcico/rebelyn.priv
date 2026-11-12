"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/admin/api-client";

type Subscriber = { id: string; email: string; consentAt: string; active: boolean };
type Campaign = {
  subject: string;
  sentAt: string;
  recipients: number;
  sent: number;
  failed: number;
  error: string | null;
};
type NewsletterData = {
  subscribers: Subscriber[];
  stats: { total: number; active: number; inactive: number };
  lastCampaign: Campaign | null;
  emailFrom: string;
  resendConfigured: boolean;
};
type SendResult = Campaign & { ok: boolean };

const DEFAULT_SUBJECT = "Novedades de REBELYN";
const TEST_EMAIL = "rebelyn.web@gmail.com";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function NewsletterManager() {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<NewsletterData>("/api/admin/newsletter")
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la newsletter")),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    if (!data) return;
    const total = data.stats.active;
    if (total === 0) return;

    const confirmed = window.confirm(
      `¿Enviar este correo a ${total} suscriptor${total === 1 ? "" : "es"} activos?\n\nAsunto: ${subject}\n\nEl envío no se puede deshacer.`,
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await api<SendResult>("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      setResult(res);
      setMessage("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la newsletter");
    } finally {
      setSending(false);
    }
  }

  async function sendTest() {
    setSendingTest(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await api<{ ok: boolean; to: string }>("/api/admin/newsletter/test", {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      setTestResult(`Prueba enviada a ${res.to}. Revisa la bandeja de entrada (y la carpeta de spam).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el correo de prueba");
    } finally {
      setSendingTest(false);
    }
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-4">Newsletter</h1>
        {error ? <p className="text-[1.4rem] text-magenta" role="alert">{error}</p> : <p className="text-muted">Cargando suscriptores…</p>}
      </div>
    );
  }

  const canSend = data.stats.active > 0 && subject.trim().length >= 3 && message.trim().length >= 3 && !sending;
  const canTest = subject.trim().length >= 3 && message.trim().length >= 3 && !sendingTest && !sending;

  return (
    <div className="max-w-[95rem]">
      <h1 className="text-[2.2rem] uppercase tracking-[0.12em] mb-2">Newsletter</h1>
      <p className="text-[1.4rem] text-muted mb-6">
        Aquí ves todas las personas suscritas y puedes enviarles un mensaje general a la vez.
      </p>

      {error && <p className="text-[1.4rem] text-magenta mb-4" role="alert">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="border hairline bg-paper p-5">
          <p className="text-[1.2rem] uppercase tracking-[0.1em] text-muted">Suscritos</p>
          <p className="text-[2.4rem] mt-1">{data.stats.total}</p>
          <p className="text-[1.15rem] text-muted">en total</p>
        </div>
        <div className="border hairline bg-paper p-5">
          <p className="text-[1.2rem] uppercase tracking-[0.1em] text-muted">Activos</p>
          <p className="text-[2.4rem] mt-1">{data.stats.active}</p>
          <p className="text-[1.15rem] text-muted">recibirán el correo</p>
        </div>
        <div className="border hairline bg-paper p-5">
          <p className="text-[1.2rem] uppercase tracking-[0.1em] text-muted">Dados de baja</p>
          <p className="text-[2.4rem] mt-1">{data.stats.inactive}</p>
          <p className="text-[1.15rem] text-muted">no recibirán nada</p>
        </div>
      </div>

      {!data.resendConfigured && (
        <p className="text-[1.4rem] mb-6 border hairline bg-paper p-4" role="alert">
          <strong>No se pueden enviar correos:</strong> falta la clave <code>RESEND_API_KEY</code> en Vercel.
        </p>
      )}

      <section className="border hairline bg-paper p-5 mb-10">
        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mb-4">Escribir mensaje</h2>

        <label className="block mb-4">
          <span className="label">Asunto</span>
          <input
            className="field"
            value={subject}
            maxLength={160}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Novedades de REBELYN"
          />
        </label>

        <label className="block">
          <span className="label">Mensaje</span>
          <textarea
            className="field"
            rows={9}
            value={message}
            maxLength={5000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={"Hola:\n\nYa está aquí el nuevo drop. Entra en la tienda y descubre las novedades antes que nadie."}
          />
        </label>

        <p className="text-[1.2rem] text-muted mt-3">
          Cada salto de línea se convierte en un párrafo. El correo se envía individualmente a cada persona, con su
          propio enlace de baja al pie. Se envía desde <strong>{data.emailFrom}</strong>.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button className="button" type="button" onClick={send} disabled={!canSend}>
            {sending ? "Enviando…" : `Enviar a ${data.stats.active} suscriptor${data.stats.active === 1 ? "" : "es"}`}
          </button>
          <button className="button button--secondary" type="button" onClick={sendTest} disabled={!canTest}>
            {sendingTest ? "Enviando prueba…" : `Enviar prueba a ${TEST_EMAIL}`}
          </button>
          {data.stats.active === 0 && <span className="text-[1.3rem] text-muted">Todavía no hay nadie activo.</span>}
          {sending && (
            <span className="text-[1.3rem] text-muted">
              No cierres esta pestaña. Con listas grandes puede tardar unos segundos.
            </span>
          )}
        </div>

        {testResult && (
          <div className="mt-5 border hairline p-4 text-[1.4rem]" role="status">
            <strong>Correo de prueba enviado.</strong> {testResult}
          </div>
        )}

        {result && (
          <div className={`mt-5 border p-4 text-[1.4rem] ${result.ok ? "hairline" : "border-magenta/40"}`} role="status">
            {result.ok ? (
              <p>
                <strong>Enviado.</strong> {result.sent} correo{result.sent === 1 ? "" : "s"} enviado
                {result.sent === 1 ? "" : "s"} correctamente.
              </p>
            ) : (
              <p>
                <strong>Envío incompleto.</strong> {result.sent} enviado{result.sent === 1 ? "" : "s"} y {result.failed} con
                error{result.error ? `: ${result.error}` : "."}
              </p>
            )}
          </div>
        )}

        {data.lastCampaign && (
          <p className="text-[1.2rem] text-muted mt-4">
            Último envío: <strong>{data.lastCampaign.subject}</strong> ·{" "}
            {new Date(data.lastCampaign.sentAt).toLocaleString("es-ES")} · {data.lastCampaign.sent} de{" "}
            {data.lastCampaign.recipients} correos.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mb-3">Personas suscritas</h2>

        {data.subscribers.length === 0 ? (
          <p className="text-[1.4rem] text-muted">
            Todavía no hay suscriptores. Se apuntan desde el pie de la tienda y desde el cartel de bienvenida.
          </p>
        ) : (
          <div className="border hairline bg-paper overflow-x-auto">
            <table className="w-full text-[1.3rem] min-w-[52rem]">
              <thead>
                <tr className="border-b hairline text-left text-[1.1rem] uppercase tracking-[0.1em] text-muted">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Se suscribió</th>
                  <th className="px-4 py-3 font-normal">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-b hairline last:border-0">
                    <td className={`px-4 py-3 break-all ${subscriber.active ? "" : "text-muted line-through"}`}>
                      {subscriber.email}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDate(subscriber.consentAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block border hairline px-2 py-0.5 text-[1.1rem] uppercase tracking-[0.08em] ${
                          subscriber.active ? "bg-ink text-paper" : "text-muted"
                        }`}
                      >
                        {subscriber.active ? "Activo" : "Baja"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
