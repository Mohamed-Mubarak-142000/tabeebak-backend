const nodemailer = require("nodemailer");

// إنشاء transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// دالة إرسال OTP مع واجهة محسنة
const sendOTPEmail = async (email, otp) => {
  const currentYear = new Date().getFullYear();
  const appName = process.env.APP_NAME || "تطبيق الأطباء";
  const logoUrl = process.env.LOGO_URL || "https://example.com/logo.png";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";
  const primaryColor = process.env.PRIMARY_COLOR || "#6B4615";
  const secondaryColor = process.env.SECONDARY_COLOR || "#F59E0B";

  const htmlTemplate = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>رمز التحقق - ${appName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        
        body {
          font-family: 'Tajawal', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .email-card {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        
        .email-header {
          background: ${primaryColor};
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        
        .email-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        
        .email-logo {
          height: 50px;
          margin-bottom: 15px;
        }
        
        .email-body {
        text-align: center;
          padding: 30px;
        }
        
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #1e293b;
        }
        
        .otp-section {
          margin: 30px 0;
          text-align: center;
        }
        
        .otp-title {
          font-size: 16px;
          color: #64748b;
          margin-bottom: 15px;
        }
        
        .otp-code {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 5px;
          color: ${primaryColor};
          background: rgba(59, 130, 246, 0.1);
          padding: 15px 30px;
          border-radius: 12px;
          display: inline-block;
          margin: 10px 0;
          border: 2px dashed rgba(59, 130, 246, 0.3);
          direction: ltr;
        }
        
        .otp-expiry {
          color: #64748b;
          font-size: 14px;
          margin-top: 10px;
        }
        
        .note-box {
          background: #fff7ed;
          border-right: 4px solid ${secondaryColor};
          border-radius: 8px;
          padding: 15px;
          margin: 25px 0;
        }
        
        .note-title {
          font-weight: 700;
          color: #9a3412;
          margin-bottom: 8px;
        }
        
        .note-text {
          margin: 0;
          color: #431407;
        }
        
        .signature {
          margin-top: 30px;
          color: #1e293b;
        }
        
        .email-footer {
          text-align: center;
          padding: 20px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 13px;
          border-top: 1px solid #e2e8f0;
        }
        
        .footer-links {
          margin-top: 15px;
        }
        
        .footer-links a {
          color: ${primaryColor};
          text-decoration: none;
          margin: 0 10px;
        }
        
        .social-icons {
          margin-top: 20px;
        }
        
        .social-icon {
          width: 24px;
          height: 24px;
          margin: 0 8px;
          vertical-align: middle;
        }
        
        @media only screen and (max-width: 600px) {
          .email-body {
            padding: 20px;
          }
          
          .otp-code {
            font-size: 28px;
            padding: 12px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-card">
          <div class="email-header">
            <img src="${logoUrl}" alt="${appName}" class="email-logo">
            <h1>رمز التحقق الخاص بك</h1>
          </div>
          
          <div class="email-body">
            <p class="greeting">مرحباً،</p>
            <p>لقد تلقينا طلباً لاستعادة كلمة المرور لحسابك في ${appName}. استخدم رمز التحقق أدناه لإكمال العملية.</p>
            
            <div class="otp-section">
              <p class="otp-title">رمز التحقق لمرة واحدة</p>
              <div class="otp-code">${otp}</div>
              <p class="otp-expiry">هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط</p>
            </div>
            
            <div class="note-box">
              <p class="note-title">ملاحظة أمنية</p>
              <p class="note-text">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة أو تغيير كلمة المرور فوراً لحماية حسابك.</p>
            </div>
            
            <p class="signature">
              مع خالص التقدير،<br>
              فريق <strong>${appName}</strong>
            </p>
          </div>
          
          <div class="email-footer">
            <p>© ${currentYear} ${appName}. جميع الحقوق محفوظة.</p>
            <div class="footer-links">
              <a href="#">الشروط والأحكام</a>
              <a href="#">سياسة الخصوصية</a>
              <a href="mailto:${supportEmail}">الدعم الفني</a>
            </div>
            <div class="social-icons">
              <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" class="social-icon" alt="Facebook"></a>
              <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" class="social-icon" alt="Twitter"></a>
              <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" class="social-icon" alt="Instagram"></a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: `رمز التحقق - ${appName}`,
    text: `رمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 10 دقائق.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`,
    html: htmlTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`تم إرسال رمز OTP إلى ${email}`);
  } catch (error) {
    console.error("حدث خطأ أثناء إرسال البريد الإلكتروني:", error);
    throw error;
  }
};

module.exports = { sendOTPEmail };
