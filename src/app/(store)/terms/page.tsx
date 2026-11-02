import type { Metadata } from "next";

export const metadata: Metadata = { title: "Condiciones generales de compra" };

export default function TermsPage() {
  return (
    <section className="page-width py-14 max-w-[72rem]">
      <h1 className="title-section">Condiciones generales de compra</h1>
      <div className="prose-store">
        <p className="text-[1.35rem] text-muted">
          Las presentes Condiciones Generales de Compra regulan las relaciones contractuales entre REBELYN y los usuarios que realicen compras a través del sitio web rebelyn.net. Al realizar un pedido, el usuario declara haber leído, comprendido y aceptado expresamente las presentes condiciones.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">1. Identificación del vendedor</h2>
        <ul className="flex flex-col gap-2 text-[1.4rem] text-muted">
          <li><strong>Titular:</strong> REBELYN</li>
          <li><strong>Correo electrónico:</strong> <a className="underline" href="mailto:rebelynoff@gmail.com">rebelynoff@gmail.com</a></li>
          <li><strong>Teléfono:</strong> 632 530 973</li>
          <li><strong>Dominio:</strong> rebelyn.net</li>
        </ul>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">2. Objeto del contrato</h2>
        <p className="text-[1.4rem] text-muted">
          Las presentes condiciones tienen por objeto regular la compraventa de prendas de ropa y complementos ofertados por REBELYN a través de su tienda online.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">3. Proceso de compra</h2>
        <ol className="flex flex-col gap-2 text-[1.4rem] text-muted list-decimal pl-6">
          <li>El usuario selecciona los productos que desea adquirir y los añade al carrito.</li>
          <li>Revisa el carrito, selecciona el método de envío e indica los datos de entrega.</li>
          <li>Accede al proceso de pago y selecciona la forma de pago.</li>
          <li>Revisa y acepta las presentes Condiciones Generales de Compra y la Política de Privacidad.</li>
          <li>Confirma el pedido realizando el pago. Tras ello, recibirá un correo electrónico de confirmación.</li>
        </ol>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">4. Precios, impuestos y pago</h2>
        <p className="text-[1.4rem] text-muted">
          Todos los precios mostrados en rebelyn.net están expresados en Euros (€) e incluyen el Impuesto sobre el Valor Añadido (IVA) vigente, salvo que se indique lo contrario.
        </p>
        <p className="text-[1.4rem] text-muted mt-4">
          Los gastos de envío se mostrarán claramente antes de finalizar la compra. El importe total, incluyendo gastos de envío, se mostrará al usuario antes de confirmar el pago.
        </p>
        <p className="text-[1.4rem] text-muted mt-4">
          El pago se realizará a través de la pasarela segura de Stripe. REBELYN no almacena en ningún momento los datos completos de la tarjeta bancaria.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">5. Disponibilidad de productos</h2>
        <p className="text-[1.4rem] text-muted">
          Los productos se ofrecen mientras estén en stock. En caso de que, tras la realización del pedido, se detecte falta de stock de algún artículo, REBELYN se pondrá en contacto con el cliente para ofrecer una alternativa o proceder a la anulación del pedido con la correspondiente devolución del importe.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">6. Envío y entrega</h2>
        <p className="text-[1.4rem] text-muted">
          Los plazos y gastos de envío se encuentran detallados en la página <a className="underline" href="/shipping">Envíos</a>. REBELYN enviará el pedido a la dirección de entrega indicada por el cliente, siendo este el responsable de que dicha dirección sea correcta.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">7. Derecho de desistimiento, devoluciones y cambios</h2>
        <p className="text-[1.4rem] text-muted">
          Conforme a lo establecido en el Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios, el cliente dispone de un plazo de <strong>30 días naturales</strong> desde la recepción del pedido para ejercer su derecho de desistimiento, sin necesidad de justificación.
        </p>
        <p className="text-[1.4rem] text-muted mt-4">
          El producto deberá encontrarse sin usar, en perfecto estado, con todas sus etiquetas originales, embalaje y accesorios. Los gastos de devolución correrán a cargo del cliente, salvo en caso de producto defectuoso o error en el envío.
        </p>
        <p className="text-[1.4rem] text-muted mt-4">
          El procedimiento completo se detalla en la página <a className="underline" href="/returns">Devoluciones</a>.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">8. Garantía legal de conformidad</h2>
        <p className="text-[1.4rem] text-muted">
          Todos los productos vendidos por REBELYN cuentan con la garantía legal de conformidad de <strong>3 años</strong> establecida en la Ley General para la Defensa de los Consumidores y Usuarios. Si el producto presenta algún defecto de conformidad, el cliente podrá optar por la reparación, la sustitución, la rebaja del precio o la resolución del contrato, en los términos legalmente previstos.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">9. Protección de datos</h2>
        <p className="text-[1.4rem] text-muted">
          El tratamiento de los datos personales se realiza conforme a lo establecido en la <a className="underline" href="/privacy">Política de Privacidad</a> de REBELYN.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">10. Propiedad intelectual</h2>
        <p className="text-[1.4rem] text-muted">
          Todos los elementos del sitio web (textos, imágenes, logotipos, diseños, marcas) son propiedad intelectual de REBELYN o de sus licenciantes, quedando prohibida su reproducción, distribución o uso sin autorización expresa y por escrito.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">11. Ley aplicable y jurisdicción</h2>
        <p className="text-[1.4rem] text-muted">
          Las presentes Condiciones Generales de Compra se regirán e interpretarán conforme a la legislación española. Para cualquier controversia que pudiera derivarse de las mismas, las partes se someterán a los Juzgados y Tribunales competentes del lugar de residencia del consumidor, cuando este tenga la condición de consumidor conforme a la normativa aplicable.
        </p>

        <h2 className="text-[1.6rem] uppercase tracking-[0.12em] mt-8 mb-3">12. Contacto</h2>
        <p className="text-[1.4rem] text-muted">
          Para cualquier duda, incidencia o reclamación, puede ponerse en contacto con REBELYN a través del correo electrónico <a className="underline" href="mailto:rebelynoff@gmail.com">rebelynoff@gmail.com</a>.
        </p>
      </div>
    </section>
  );
}
