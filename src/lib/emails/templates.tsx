import type { Order } from "@prisma/client";

/** Plantillas HTML de emails transaccionales (Resend renderiza estos JSX). */

const styles = {
  body: { fontFamily: "Helvetica, Arial, sans-serif", backgroundColor: "#ffffff", color: "#202020", padding: "32px 16px" },
  wrap: { maxWidth: "560px", margin: "0 auto" },
  logo: {
    fontSize: "26px",
    letterSpacing: "6px",
    fontWeight: 700 as const,
    textAlign: "center" as const,
    borderBottom: "1px solid #202020",
    paddingBottom: "16px",
    marginBottom: "24px",
  },
  h1: { fontSize: "20px", margin: "0 0 16px" },
  p: { fontSize: "14px", lineHeight: 1.6, margin: "0 0 12px" },
  box: { border: "1px solid #e4e4e4", padding: "16px", borderRadius: "8px", margin: "16px 0" },
  row: { display: "flex", justifyContent: "space-between" as const, fontSize: "14px", padding: "4px 0" },
  total: { fontWeight: 700 as const, fontSize: "16px", borderTop: "1px solid #e4e4e4", paddingTop: "8px", marginTop: "8px" },
  muted: { color: "#6b6b6b", fontSize: "13px" },
  button: {
    display: "inline-block",
    backgroundColor: "#121212",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "4px",
    textDecoration: "none",
    fontSize: "14px",
    margin: "8px 0",
  },
  footer: { fontSize: "12px", color: "#6b6b6b", borderTop: "1px solid #e4e4e4", marginTop: "24px", paddingTop: "16px" },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.body}>
      <div style={styles.wrap}>
        <div style={styles.logo}>REBELYN</div>
        {children}
        <div style={styles.footer}>
          REBELYN · Rompe con lo común
          <br />
          Si tienes dudas, responde a este email o escríbenos por Instagram @rebelyn.off
        </div>
      </div>
    </div>
  );
}

function orderLines(order: Order & { items?: { productName: string; size: string; qty: number; totalCents: number }[] }) {
  if (!order.items) return null;
  return (
    <div style={styles.box}>
      {order.items.map((item, i) => (
        <div key={i} style={styles.row}>
          <span>
            {item.qty} × {item.productName} ({item.size})
          </span>
          <span>{(item.totalCents / 100).toFixed(2)} €</span>
        </div>
      ))}
      <div style={styles.row}>
        <span>Envío</span>
        <span>{order.shippingCents === 0 ? "Gratis" : `${(order.shippingCents / 100).toFixed(2)} €`}</span>
      </div>
      {order.discountCents > 0 && (
        <div style={styles.row}>
          <span>Descuento {order.discountCode ? `(${order.discountCode})` : ""}</span>
          <span>−{(order.discountCents / 100).toFixed(2)} €</span>
        </div>
      )}
      <div style={{ ...styles.row, ...styles.total }}>
        <span>Total</span>
        <span>{(order.totalCents / 100).toFixed(2)} €</span>
      </div>
    </div>
  );
}

function shippingAddress(order: Order) {
  return (
    <p style={styles.p}>
      <strong>Envío a:</strong>
      <br />
      {order.shipName}
      <br />
      {order.shipLine1}
      {order.shipLine2 ? `, ${order.shipLine2}` : ""}
      <br />
      {order.shipPostalCode} {order.shipCity} ({order.shipProvince}), {order.shipCountry}
    </p>
  );
}

export function orderPaidEmail(order: Order & { items?: { productName: string; size: string; qty: number; totalCents: number }[] }) {
  return (
    <Shell>
      <h1 style={styles.h1}>Tu pedido {order.orderNumber} está confirmado</h1>
      <p style={styles.p}>Gracias por comprar en REBELYN. Hemos recibido tu pago correctamente y ya estamos preparando tu pedido.</p>
      {orderLines(order)}
      {shippingAddress(order)}
      <p style={styles.muted}>Recibirás otro email en cuanto salga el paquete, con el número de seguimiento.</p>
    </Shell>
  );
}

export function orderShippedEmail(order: Order) {
  return (
    <Shell>
      <h1 style={styles.h1}>Tu pedido {order.orderNumber} está en camino</h1>
      <p style={styles.p}>Tu paquete ya ha salido de nuestro almacén.</p>
      {order.trackingNumber && (
        <p style={styles.p}>
          <strong>Número de seguimiento:</strong> {order.trackingNumber}
        </p>
      )}
      {shippingAddress(order)}
      <p style={styles.muted}>Si en 48 horas no ves movimiento, escríbenos y lo buscamos a mano.</p>
    </Shell>
  );
}

export function orderCancelledEmail(order: Order) {
  return (
    <Shell>
      <h1 style={styles.h1}>Pedido {order.orderNumber} cancelado</h1>
      <p style={styles.p}>Tu pedido ha sido cancelado. Si has llegado a realizar un pago, se te reembolsará por el mismo medio en 5–7 días laborables.</p>
      <p style={styles.muted}>Si no reconoces esta cancelación, contáctanos cuanto antes.</p>
    </Shell>
  );
}

export function orderRefundedEmail(order: Order, amountCents: number) {
  return (
    <Shell>
      <h1 style={styles.h1}>Reembolso procesado</h1>
      <p style={styles.p}>
        Hemos devolvido <strong>{(amountCents / 100).toFixed(2)} €</strong> del pedido {order.orderNumber}. El importe aparecerá en tu cuenta
        en 5–7 días laborables, según tu banco.
      </p>
    </Shell>
  );
}

export function welcomeEmail(name?: string | null) {
  return (
    <Shell>
      <h1 style={styles.h1}>Bienvenido a REBELYN</h1>
      <p style={styles.p}>Hola {name || ""}, tu cuenta está lista. Ya puedes consultar tus pedidos y guardar tus direcciones para comprar más rápido.</p>
    </Shell>
  );
}

export function resetPasswordEmail(resetUrl: string) {
  return (
    <Shell>
      <h1 style={styles.h1}>Restablecer contraseña</h1>
      <p style={styles.p}>Hemos recibido una solicitud para cambiar la contraseña de tu cuenta. El enlace caduca en 60 minutos.</p>
      <p>
        <a href={resetUrl} style={styles.button}>
          Elegir nueva contraseña
        </a>
      </p>
      <p style={styles.muted}>Si no has sido tú, ignora este email: tu contraseña no cambia.</p>
    </Shell>
  );
}

export function contactCopyEmail() {
  return (
    <Shell>
      <h1 style={styles.h1}>Hemos recibido tu mensaje</h1>
      <p style={styles.p}>Te responderemos lo antes posible, normalmente en menos de 24 horas laborables.</p>
    </Shell>
  );
}
