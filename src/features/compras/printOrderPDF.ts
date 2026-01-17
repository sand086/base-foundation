import { PurchaseOrder } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function printOrderPDF(order: PurchaseOrder) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: order.moneda,
    }).format(amount);
  };

  const tipoLabel = order.tipo === 'compra' 
    ? 'ORDEN DE COMPRA' 
    : order.tipo === 'servicio' 
      ? 'ORDEN DE SERVICIO' 
      : 'ORDEN DE GASTO';

  const itemsRows = order.items.map((item, i) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.descripcion}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.cantidad}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.unidad}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.precioUnitario)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${tipoLabel} - ${order.folio}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 40px;
          color: #1f2937;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 20px;
        }
        .company-info h1 {
          margin: 0;
          font-size: 24px;
          color: #0f172a;
        }
        .company-info p {
          margin: 5px 0;
          color: #6b7280;
        }
        .order-info {
          text-align: right;
        }
        .order-info .folio {
          font-size: 28px;
          font-weight: bold;
          color: #0f172a;
        }
        .order-info .tipo {
          background: #0f172a;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          display: inline-block;
          margin-top: 5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-box {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
        }
        .info-box h3 {
          margin: 0 0 10px 0;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
        }
        .info-box p {
          margin: 5px 0;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background: #0f172a;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
        }
        .totals {
          width: 300px;
          margin-left: auto;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .totals-row.total {
          font-size: 18px;
          font-weight: bold;
          border-bottom: 2px solid #0f172a;
          padding-top: 15px;
        }
        .service-desc {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .footer {
          margin-top: 50px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
        }
        .signature {
          border-top: 1px solid #1f2937;
          padding-top: 10px;
          text-align: center;
        }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>Rápidos 3T</h1>
          <p>Transporte y Logística</p>
          <p>RFC: R3T850101ABC</p>
        </div>
        <div class="order-info">
          <div class="folio">${order.folio}</div>
          <div class="tipo">${tipoLabel}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Proveedor</h3>
          <p><strong>${order.proveedorNombre}</strong></p>
        </div>
        <div class="info-box">
          <h3>Información de Orden</h3>
          <p><strong>Fecha:</strong> ${format(order.fechaCreacion, "dd/MM/yyyy", { locale: es })}</p>
          <p><strong>Fecha Requerida:</strong> ${format(order.fechaRequerida, "dd/MM/yyyy", { locale: es })}</p>
          <p><strong>Solicitante:</strong> ${order.solicitante}</p>
        </div>
      </div>

      ${order.tipo === 'servicio' && order.descripcionServicio ? `
        <div class="service-desc">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #6b7280;">Descripción del Servicio</h3>
          <p style="margin: 0; line-height: 1.6;">${order.descripcionServicio}</p>
        </div>
      ` : ''}

      ${order.items.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Descripción</th>
              <th style="width: 80px; text-align: center;">Cant.</th>
              <th style="width: 60px; text-align: center;">Unidad</th>
              <th style="width: 100px; text-align: right;">P. Unit.</th>
              <th style="width: 100px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      ` : ''}

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>IVA (16%)</span>
          <span>${formatCurrency(order.iva)}</span>
        </div>
        <div class="totals-row total">
          <span>TOTAL ${order.moneda}</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>

      <div class="footer">
        <div class="signature">
          <p>Elaboró</p>
        </div>
        <div class="signature">
          <p>Autorizó</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
