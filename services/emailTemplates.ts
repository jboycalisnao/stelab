
// You can edit the HTML/CSS in this file to customize your email design.
// Ensure you keep the ${data.variable} placeholders intact.

export const getBorrowRequestTemplate = (data: {
  borrowerName: string;
  borrowerId: string;
  referenceCode: string;
  returnDate: string;
  items: { name: string; qty: number }[];
  appName: string;
}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Borrow Request</title>
<style>
/* --- GLOBAL STYLES --- */
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

/* --- HEADER SECTION --- */
.header { background-color: #2005A2; padding: 30px 20px; text-align: center; }
.header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }

/* --- CONTENT SECTION --- */
.content { padding: 30px; color: #334155; }
.ref-box { background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center; }
.ref-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px; }
.ref-code { font-size: 24px; font-weight: 700; color: #1e40af; margin-top: 5px; font-family: monospace; }
.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
.detail-item label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
.detail-item p { margin: 0; font-weight: 600; color: #0f172a; }
.table-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { background-color: #f8fafc; text-align: left; padding: 12px 15px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
td { padding: 12px 15px; color: #334155; border-bottom: 1px solid #f1f5f9; }
tr:last-child td { border-bottom: none; }
.footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>New Borrow Request</h1>
  </div>
  <div class="content">
    <div class="ref-box">
      <div class="ref-label">Reference Code</div>
      <div class="ref-code">${data.referenceCode}</div>
    </div>
    <div class="details-grid">
      <div class="detail-item"><label>Borrower Name</label><p>${data.borrowerName}</p></div>
      <div class="detail-item"><label>ID / Section</label><p>${data.borrowerId}</p></div>
      <div class="detail-item"><label>Return Date</label><p>${data.returnDate}</p></div>
      <div class="detail-item"><label>Date Requested</label><p>${new Date().toLocaleDateString()}</p></div>
    </div>
    <div class="detail-item"><label>Requested Items</label></div>
    <div class="table-container">
      <table>
        <thead><tr><th>Item Name</th><th style="text-align:right">Qty</th></tr></thead>
        <tbody>
          ${data.items.map(i => `<tr><td>${i.name}</td><td style="text-align:right"><strong>${i.qty}</strong></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div class="footer">
    Sent automatically by <strong>${data.appName}</strong>
  </div>
</div>
</body>
</html>
`;

export const getPasswordResetTemplate = (data: {
  code: string;
  appName: string;
}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Password Reset</title>
<style>
body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f5; padding: 20px; }
.container { max-width: 450px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center; }
.icon { width: 60px; height: 60px; background-color: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.icon svg { width: 30px; height: 30px; fill: #2005A2; }
h2 { color: #1e293b; margin: 0 0 10px; }
p { color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 25px; }
.code { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2005A2; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 25px; }
.footer { font-size: 11px; color: #94a3b8; margin-top: 30px; }
</style>
</head>
<body>
<div class="container">
  <div class="icon">
    <svg viewBox="0 0 24 24"><path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 4zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>
  </div>
  <h2>Password Reset</h2>
  <p>You requested a password reset for <strong>${data.appName}</strong>.<br>Use the code below to complete the process:</p>
  <div class="code">${data.code}</div>
  <p style="font-size: 12px; margin-bottom: 0;">If you didn't request this, you can safely ignore this email.</p>
  <div class="footer">
    ${data.appName} • Security Alert
  </div>
</div>
</body>
</html>
`;

export const getOverdueNoticeTemplate = (data: {
  borrowerName: string;
  dueDate: string;
  items: { name: string; qty: number }[];
  appName: string;
}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Overdue Notice</title>
<style>
body { font-family: 'Segoe UI', sans-serif; background-color: #fef2f2; padding: 20px; margin: 0; }
.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 2px solid #AF1456; }
.header { background-color: #AF1456; padding: 30px; text-align: center; color: white; }
.header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
.content { padding: 30px; color: #334155; }
.warning-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; color: #9f1239; font-weight: bold; }
.items-list { background: #f8fafc; border-radius: 8px; padding: 15px; margin-top: 15px; }
.item-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 8px 0; font-size: 14px; }
.item-row:last-child { border-bottom: none; }
.footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Overdue Equipment</h1>
  </div>
  <div class="content">
    <p>Dear <strong>${data.borrowerName}</strong>,</p>
    <p>This is an automated notice that the laboratory equipment you borrowed has passed its return due date.</p>
    <div class="warning-box">
        DUE DATE: ${data.dueDate}
    </div>
    <p style="font-size: 14px;">Please return the following items to the Science Laboratory immediately to avoid penalties and allow others to use the equipment:</p>
    <div class="items-list">
      ${data.items.map(i => `<div class="item-row"><span>${i.name}</span><span><strong>x${i.qty}</strong></span></div>`).join('')}
    </div>
    <p style="font-size: 13px; color: #64748b; margin-top: 20px; font-style: italic;">If you have already returned these items, please ignore this notice or coordinate with the laboratory custodian to update your record.</p>
  </div>
  <div class="footer">
    ${data.appName} • Laboratory Security Dept.
  </div>
</div>
</body>
</html>
`;

export const getUserStatusUpdateTemplate = (data: {
  borrowerName: string;
  referenceCode: string;
  status: 'Approved' | 'Released' | 'Rejected' | 'Returned';
  returnDate: string;
  appName: string;
  items: { name: string; qty: number }[];
}) => {
  let headerColor = '#2005A2';
  let title = 'Request Update';
  let message = `Your request ${data.referenceCode} has been updated.`;

  switch (data.status) {
    case 'Approved':
      headerColor = '#059669';
      title = 'Request Approved';
      message = 'Your borrow request has been approved. Please proceed to the laboratory to collect your equipment.';
      break;
    case 'Released':
      headerColor = '#4f46e5';
      title = 'Items Collected';
      message = 'You have successfully collected your equipment. Please ensure all items are returned in good condition by the due date.';
      break;
    case 'Rejected':
      headerColor = '#AF1456';
      title = 'Request Rejected';
      message = 'Unfortunately, your borrow request has been rejected. Please coordinate with the laboratory administrator for more details.';
      break;
    case 'Returned':
      headerColor = '#0d9488';
      title = 'Items Returned';
      message = 'Thank you! Your borrowed laboratory equipment has been marked as returned and verified by the custodian.';
      break;
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Request Update</title>
<style>
body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f5; padding: 20px; margin: 0; }
.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.header { background-color: ${headerColor}; padding: 25px; text-align: center; color: white; }
.header h1 { margin: 0; font-size: 22px; }
.content { padding: 30px; color: #334155; }
.info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; }
.info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.info-row:last-child { margin-bottom: 0; }
.label { color: #64748b; }
.val { font-weight: 600; color: #0f172a; }
.footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
ul { padding-left: 20px; margin: 10px 0; }
li { margin-bottom: 5px; font-size: 14px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${title}</h1>
  </div>
  <div class="content">
    <p>Dear <strong>${data.borrowerName}</strong>,</p>
    <p>${message}</p>
    <div class="info-box">
        <div class="info-row"><span class="label">Reference Code</span><span class="val">${data.referenceCode}</span></div>
        <div class="info-row"><span class="label">Due Date</span><span class="val">${data.returnDate}</span></div>
    </div>
    <p style="font-size: 14px; font-weight: 600; margin-bottom: 5px;">Items involved:</p>
    <ul>
      ${data.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join('')}
    </ul>
  </div>
  <div class="footer">
    ${data.appName} • Automated Notification
  </div>
</div>
</body>
</html>
`;
};
