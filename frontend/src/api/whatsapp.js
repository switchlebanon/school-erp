// Cleans a phone number to international format digits only
// e.g. "+961 71 234 567" → "96171234567"
export function cleanPhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^\d]/g, "");
}

// Formats a number as currency
const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "";

/**
 * Builds a WhatsApp click-to-chat URL with a pre-filled reminder message.
 *
 * @param {object} invoice  - FeeInvoice with student, payments etc.
 * @param {string} lang     - "en" | "ar"
 * @returns {string|null}   - wa.me URL or null if no phone available
 */
export function buildWhatsAppUrl(invoice, lang = "en") {
  const phone = cleanPhone(invoice.student?.guardianPhone);
  if (!phone) return null;

  const studentName  = invoice.student?.name || "your child";
  const guardianName = invoice.student?.guardianName || "Dear Parent";
  const description  = invoice.description || "tuition fee";
  const total        = Number(invoice.amount);
  const paid         = Number(invoice.totalPaid || 0);
  const remaining    = total - paid;
  const dueDate      = fmtDate(invoice.dueDate);
  const installments = invoice.payments?.length || 0;

  let message = "";

  if (lang === "ar") {
    // Arabic message
    message = `السلام عليكم ${guardianName} ،

هذا تذكير بخصوص رسوم *${studentName}* المدرسية.

📋 *تفاصيل الفاتورة:*
• الوصف: ${description}
• المبلغ الإجمالي: ${fmt(total)}
• المدفوع حتى الآن: ${fmt(paid)}${installments > 0 ? ` (${installments} دفعة)` : ""}
• المتبقي: *${fmt(remaining)}*
• تاريخ الاستحقاق: ${dueDate}

${remaining <= 0
  ? "✅ تم سداد هذه الفاتورة بالكامل. شكراً لكم!"
  : `يرجى تسديد المبلغ المتبقي *${fmt(remaining)}* في أقرب وقت ممكن.`}

للاستفسار، يرجى التواصل مع إدارة المدرسة.

شكراً لتعاونكم 🙏
*إدارة المدرسة - SchoolHub*`;
  } else {
    // English message
    message = `Hello ${guardianName},

This is a payment reminder regarding *${studentName}*'s school fees.

📋 *Invoice Details:*
• Description: ${description}
• Total Amount: ${fmt(total)}
• Paid So Far: ${fmt(paid)}${installments > 0 ? ` (${installments} payment${installments > 1 ? "s" : ""})` : ""}
• Balance Due: *${fmt(remaining)}*
• Due Date: ${dueDate}

${remaining <= 0
  ? "✅ This invoice has been fully paid. Thank you!"
  : `Please arrange payment of the remaining *${fmt(remaining)}* at your earliest convenience.`}

For any questions, please contact the school administration.

Thank you 🙏
*School Administration - SchoolHub*`;
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}
