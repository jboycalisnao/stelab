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
/* Change background-color here to match your school brand (e.g., #2005A2 is your Admin Blue) */
.header { background-color: #2005A2; padding: 30px 20px; text-align: center; }
.header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }

/* --- CONTENT SECTION --- */
.content { padding: 30px; color: #334155; }

/* Reference Code Box */
.ref-box { background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center; }
.ref-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px; }
.ref-code { font-size: 24px; font-weight: 700; color: #1e40af; margin-top: 5px; font-family: monospace; }

/* Details Grid */
.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
.detail-item label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
.detail-item p { margin: 0; font-weight: 600; color: #0f172a; }

/* Table Styles */
.table-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { background-color: #f8fafc; text-align: left; padding: 12px 15px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
td { padding: 12px 15px; color: #334155; border-bottom: 1px solid #f1f5f9; }
tr:last-child td { border-bottom: none; }

/* --- FOOTER SECTION --- */
.footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">
  <!-- Header -->
  <div class="header">
    <h1>New Borrow Request</h1>
  </div>
  
  <!-- Main Content -->
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
  
  <!-- Footer -->
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
/* --- GLOBAL STYLES --- */
body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f5; padding: 20px; }
.container { max-width: 450px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center; }

/* Icon Style */
.icon { width: 60px; height: 60px; background-color: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
/* Fill color for the lock icon */
.icon svg { width: 30px; height: 30px; fill: #2005A2; }

/* Typography */
h2 { color: #1e293b; margin: 0 0 10px; }
p { color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 25px; }

/* OTP Code Box */
.code { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2005A2; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 25px; }

/* Footer */
.footer { font-size: 11px; color: #94a3b8; margin-top: 30px; }
</style>
</head>
<body>
<div class="container">
  <div class="icon">
    <!-- Simple Lock Icon SVG -->
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