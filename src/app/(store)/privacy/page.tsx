import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Política de privacidad</h1>
      <div className="prose-store">
        <p className="text-[1.35rem] text-muted">
          REBELYN, en cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos datos (RGPD), y de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le informa sobre el tratamiento de sus datos personales.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">1. Responsable del tratamiento</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted">
          <li><strong>Responsable:</strong> REBELYN</li>
          <li><strong>Correo electrónico:</strong> <a className="underline" href="mailto:rebelynoff@gmail.com">rebelynoff@gmail.com</a></li>
          <li><strong>Teléfono:</strong> 632 530 973</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">2. ¿Qué datos personales tratamos?</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6">
          <li><strong>Datos de registro:</strong> Nombre y apellidos, dirección de correo electrónico, contraseña (almacenada de forma cifrada).</li>
          <li><strong>Datos de compra:</strong> Nombre, apellidos, dirección de envío, dirección de facturación, teléfono y correo electrónico.</li>
          <li><strong>Datos de pago:</strong> Gestionados directamente por Stripe. REBELYN no almacena datos de tarjeta de crédito/débito.</li>
          <li><strong>Datos de contacto:</strong> Correo electrónico y mensaje cuando utiliza el formulario de contacto.</li>
          <li><strong>Newsletter:</strong> Dirección de correo electrónico si se suscribe voluntariamente.</li>
          <li><strong>Datos de navegación:</strong> Información técnica mínima imprescindible para el correcto funcionamiento de la web.</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">3. Finalidad, base jurídica y conservación</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6">
          <li><strong>Gestión de pedidos y envío:</strong> Ejecutar el contrato de compraventa. Conservación: durante el tiempo necesario para la tramitación del pedido y cumplimiento de obligaciones fiscales y contables (mínimo 4-6 años).</li>
          <li><strong>Gestión de cuenta de usuario:</strong> Ejecución del contrato. Conservación: mientras la cuenta esté activa. Puede solicitar su supresión en cualquier momento.</li>
          <li><strong>Atención al cliente:</strong> Interés legítimo del responsable. Conservación: el tiempo necesario para atender la consulta.</li>
          <li><strong>Newsletter:</strong> Consentimiento explícito y revocable. Conservación: hasta que se dé de baja.</li>
          <li><strong>Prevención de fraude:</strong> Interés legítimo. Conservación: el tiempo estrictamente necesario.</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">4. Destinatarios de los datos</h2>
        <p className="text-[1.4rem] text-muted">
          Los datos podrán comunicarse a los siguientes destinatarios, exclusivamente para las finalidades indicadas:
        </p>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6 mt-3">
          <li><strong>Stripe Payments Europe, Ltd.:</strong> Procesamiento de pagos. Más información: <a className="underline" href="https://stripe.com/es/privacy" target="_blank" rel="noopener noreferrer">stripe.com/es/privacy</a></li>
          <li><strong>Proveedor de hosting:</strong> Para el alojamiento seguro del sitio web.</li>
          <li><strong>Empresa de transporte:</strong> Únicamente los datos necesarios para la entrega del pedido (nombre, dirección, teléfono).</li>
          <li><strong>Autoridades competentes:</strong> Cuando exista obligación legal.</li>
        </ul>
        <p className="text-[1.4rem] text-muted mt-4">
          REBELYN no cede, vende ni alquila datos personales a terceros con fines comerciales o publicitarios.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">5. Derechos del interesado</h2>
        <p className="text-[1.4rem] text-muted">
          Puede ejercer en cualquier momento los siguientes derechos:
        </p>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted list-disc pl-6 mt-3">
          <li><strong>Acceso:</strong> Conocer qué datos personales tratamos.</li>
          <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
          <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos cuando proceda.</li>
          <li><strong>Oposición:</strong> Oponerse al tratamiento en determinados supuestos.</li>
          <li><strong>Limitación del tratamiento:</strong> Solicitar la limitación del tratamiento de sus datos.</li>
          <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado, de uso común y lectura mecánica.</li>
          <li><strong>Retirada del consentimiento:</strong> En cualquier momento, sin efecto retroactivo.</li>
        </ul>
        <p className="text-[1.4rem] text-muted mt-4">
          Para ejercer sus derechos, envíe un correo electrónico a <a className="underline" href="mailto:rebelynoff@gmail.com">rebelynoff@gmail.com</a> indicando el derecho que desea ejercer y una copia de su DNI o documento identificativo.
        </p>
        <p className="text-[1.4rem] text-muted mt-4">
          Tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (<a className="underline" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">6. Medidas de seguridad</h2>
        <p className="text-[1.4rem] text-muted">
          REBELYN aplica las medidas técnicas y organizativas necesarias para garantizar la seguridad, confidencialidad e integridad de los datos personales, evitando su alteración, pérdida, tratamiento o acceso no autorizado.
        </p>
      </div>
    </section>
  );
}
