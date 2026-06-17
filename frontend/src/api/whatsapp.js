// Cleans a phone number to digits only for wa.me links
// e.g. "+961 71 234 567" -> "96171234567"
export function cleanPhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^\d]/g, "");
}

const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Builds a WhatsApp URL for a fee payment reminder (for parents)
export function buildWhatsAppUrl(invoice, lang) {
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

  var message = "";

  if (lang === "ar") {
    message = "السلام عليكم " + guardianName + " ،\n\n";
    message += "هذا تذكير بخصوص رسوم *" + studentName + "* المدرسية.\n\n";
    message += "📋 *تفاصيل الفاتورة:*\n";
    message += "• الوصف: " + description + "\n";
    message += "• المبلغ الإجمالي: " + fmt(total) + "\n";
    message += "• المدفوع حتى الآن: " + fmt(paid) + (installments > 0 ? " (" + installments + " دفعة)" : "") + "\n";
    message += "• المتبقي: *" + fmt(remaining) + "*\n";
    message += "• تاريخ الاستحقاق: " + dueDate + "\n\n";
    message += remaining <= 0
      ? "✅ تم سداد هذه الفاتورة بالكامل. شكراً لكم!\n\n"
      : "يرجى تسديد المبلغ المتبقي *" + fmt(remaining) + "* في أقرب وقت ممكن.\n\n";
    message += "للاستفسار، يرجى التواصل مع إدارة المدرسة.\n\n";
    message += "شكراً لتعاونكم 🙏\n*إدارة المدرسة - S3*";
  } else {
    message = "Hello " + guardianName + ",\n\n";
    message += "This is a payment reminder regarding *" + studentName + "*'s school fees.\n\n";
    message += "📋 *Invoice Details:*\n";
    message += "• Description: " + description + "\n";
    message += "• Total Amount: " + fmt(total) + "\n";
    message += "• Paid So Far: " + fmt(paid) + (installments > 0 ? " (" + installments + " payment" + (installments > 1 ? "s" : "") + ")" : "") + "\n";
    message += "• Balance Due: *" + fmt(remaining) + "*\n";
    message += "• Due Date: " + dueDate + "\n\n";
    message += remaining <= 0
      ? "✅ This invoice has been fully paid. Thank you!\n\n"
      : "Please arrange payment of the remaining *" + fmt(remaining) + "* at your earliest convenience.\n\n";
    message += "For any questions, please contact the school administration.\n\n";
    message += "Thank you 🙏\n*School Administration - S3*";
  }

  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}

// Builds a WhatsApp URL for a payroll slip notification (for staff)
export function buildPayrollWhatsAppUrl(staff, month, year, lang) {
  const phone = cleanPhone(staff.phone);
  if (!phone) return null;

  var p = staff.payment;
  if (!p) return null;

  var monthName = MONTHS[month - 1];
  var net       = fmt(p.netAmount);
  var base      = fmt(p.baseAmount);
  var statusText = p.status === "PAID" ? "Paid" : p.status === "CANCELLED" ? "Cancelled" : "Pending";
  var statusEmoji = p.status === "PAID" ? "✅" : p.status === "CANCELLED" ? "❌" : "⏳";

  var message = "";

  if (lang === "ar") {
    message = "السلام عليكم " + staff.name + " ،\n\n";
    message += "إليكم تفاصيل راتبكم لشهر *" + monthName + " " + year + "*:\n\n";
    message += "💼 *تفاصيل الراتب:*\n";
    message += "• المنصب: " + staff.title + "\n";
    message += "• الراتب الأساسي: " + base + "\n";
    if (Number(p.bonus) > 0) {
      message += "• المكافأة: + " + fmt(p.bonus) + (p.bonusNote ? " (" + p.bonusNote + ")" : "") + "\n";
    }
    if (Number(p.deduction) > 0) {
      message += "• الخصم: - " + fmt(p.deduction) + (p.deductionNote ? " (" + p.deductionNote + ")" : "") + "\n";
    }
    message += "• *صافي الراتب: " + net + "*\n";
    message += "• الحالة: " + statusEmoji + " " + statusText + "\n\n";
    if (p.note) message += "ملاحظة: " + p.note + "\n\n";
    message += "للاستفسار، يرجى التواصل مع الإدارة.\n\n";
    message += "شكراً لجهودكم 🙏\n*إدارة S3*";
  } else {
    message = "Hello " + staff.name + ",\n\n";
    message += "Please find your salary details for *" + monthName + " " + year + "* below:\n\n";
    message += "💼 *Payroll Summary:*\n";
    message += "• Position: " + staff.title + "\n";
    message += "• Base Salary: " + base + "\n";
    if (Number(p.bonus) > 0) {
      message += "• Bonus: + " + fmt(p.bonus) + (p.bonusNote ? " (" + p.bonusNote + ")" : "") + "\n";
    }
    if (Number(p.deduction) > 0) {
      message += "• Deduction: - " + fmt(p.deduction) + (p.deductionNote ? " (" + p.deductionNote + ")" : "") + "\n";
    }
    message += "• *Net Salary: " + net + "*\n";
    message += "• Status: " + statusEmoji + " " + statusText + "\n\n";
    if (p.note) message += "Note: " + p.note + "\n\n";
    message += "For any questions, please contact the administration.\n\n";
    message += "Thank you for your dedication 🙏\n*S3 Administration*";
  }

  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}
