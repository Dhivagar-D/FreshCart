import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { Checkout } from '../models/Checkout.js';
import { requireAuth } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

// GET /api/invoices/checkout/:id/pdf
router.get('/checkout/:id/pdf', async (req, res) => {
  try {
    let checkout = null;

    if (isConnectedToMongoDB) {
      checkout = await Checkout.findById(req.params.id)
        .populate('buyerId', 'name email phone businessName')
        .populate({
          path: 'orderIds',
          populate: { path: 'vendorId', select: 'businessName address' },
        });
    } else {
      const c = memoryStore.checkouts.find((item) => item._id.toString() === req.params.id.toString());
      if (c) {
        checkout = {
          ...c,
          buyerId: typeof c.buyerId === 'object' ? c.buyerId : memoryStore.users.find((u) => u._id.toString() === c.buyerId.toString()),
          orderIds: c.orderIds.map((vo) => (typeof vo === 'object' ? vo : memoryStore.vendorOrders.find((o) => o._id.toString() === vo.toString()))),
        };
      }
    }

    if (!checkout) {
      return res.status(404).json({ error: 'Checkout invoice not found' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=freshcart-invoice-${checkout._id}.pdf`
    );

    doc.pipe(res);

    // Header
    doc.fillColor('#166534').fontSize(24).text('FreshCart', { bold: true });
    doc.fillColor('#4b5563').fontSize(10).text('Hyperlocal B2B Marketplace for Fresh Produce');
    doc.text('Agricultural Wholesale Procurement Hub | Coimbatore, Tamil Nadu');
    doc.moveDown();

    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Meta
    doc.fillColor('#111827').fontSize(14).text('TAX INVOICE & CONSOLIDATED RECEIPT', { bold: true });
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#374151');
    doc.text(`Invoice Ref: INV-${checkout._id.toString().slice(-8).toUpperCase()}`);
    doc.text(`Date: ${new Date(checkout.createdAt).toLocaleDateString('en-IN', { dateStyle: 'full' })}`);
    doc.text(`Payment Status: ${checkout.paymentStatus.toUpperCase()}`);
    doc.text(`Payment Gateway: ${checkout.paymentMethod.toUpperCase()}`);
    doc.text(`Transaction Reference: ${checkout.paymentReference || 'N/A'}`);
    doc.moveDown();

    // Billed To
    doc.fillColor('#166534').fontSize(12).text('Billed & Delivered To:', { bold: true });
    doc.fillColor('#374151').fontSize(10);
    doc.text(`Buyer: ${checkout.buyerId?.name || 'Valued Restaurant Partner'}`);
    if (checkout.buyerId?.businessName) doc.text(`Commercial Business: ${checkout.buyerId.businessName}`);
    doc.text(`Address: ${checkout.deliveryAddress?.street || 'RS Puram'}, ${checkout.deliveryAddress?.area || 'Coimbatore'}`);
    doc.text(`Contact: ${checkout.deliveryAddress?.contactPhone || checkout.buyerId?.phone || '+91 98888 11111'}`);
    doc.moveDown(1.5);

    // Orders Breakdown
    doc.fillColor('#166534').fontSize(12).text('Automated Multi-Vendor Split Orders:', { bold: true });
    doc.moveDown(0.5);

    for (const order of checkout.orderIds || []) {
      if (!order) continue;
      const vendorName = order.vendorId?.businessName || 'Local Farm Producer';
      doc.fillColor('#1f2937').fontSize(11).text(`• Vendor: ${vendorName} (Order #: ${order.orderNumber})`, { bold: true });

      // Line items
      for (const item of order.items || []) {
        doc.fillColor('#374151').fontSize(10);
        doc.text(`    - ${item.name} (${item.quantity} ${item.unit} @ Rs. ${item.price})`, { indent: 10 });
        doc.text(`Rs. ${item.subtotal.toFixed(2)}`, 480, doc.y - 12, { align: 'right' });
      }

      doc.fillColor('#4b5563').fontSize(9);
      doc.text(`    Subtotal: Rs. ${order.subtotal.toFixed(2)} | Platform Commission (5%): Rs. ${order.commissionAmount.toFixed(2)}`, { indent: 10 });
      doc.moveDown(0.8);
    }

    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Total
    doc.fillColor('#111827').fontSize(14).text(`Total Paid Amount: Rs. ${checkout.totalAmount.toFixed(2)}`, { bold: true, align: 'right' });
    doc.moveDown(2);

    doc.fillColor('#15803d').fontSize(10).text('[ OFFICIAL PAID RECEIPT - ELECTRONICALLY GENERATED ]', { align: 'center', bold: true });
    doc.fillColor('#9ca3af').fontSize(8).text('FreshCart complies with B2B agricultural procurement transparency rules.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Invoice error:', err);
    res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
  }
});

export default router;
