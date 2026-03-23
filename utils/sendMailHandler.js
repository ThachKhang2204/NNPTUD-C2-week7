let nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.MAILTRAP_PORT || 2525),
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: process.env.MAILTRAP_USER || "",
        pass: process.env.MAILTRAP_PASS || "",
    },
});

function ensureMailtrapConfig() {
    if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
        throw new Error('Thieu cau hinh MAILTRAP_USER/MAILTRAP_PASS')
    }
}

module.exports = {
    sendMail: async function (to, url) {
        ensureMailtrapConfig()
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "mail reset passwrod",
            text: "lick vo day de doi passs", // Plain-text version of the message
            html: "lick vo <a href=" + url + ">day</a> de doi passs", // HTML version of the message
        });
    },
    sendUserImportPassword: async function (to, username, password) {
        ensureMailtrapConfig()
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "Thong tin tai khoan moi",
            text: `Tai khoan cua ban: ${username} - Mat khau tam: ${password}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="margin: 0 0 12px;">Tai khoan moi da duoc tao</h2>
                    <img src="cid:welcome-image" alt="Welcome" width="120" style="display:block; margin: 8px 0 16px;" />
                    <p style="margin: 0 0 8px;">Xin chao <strong>${username}</strong>,</p>
                    <p style="margin: 0 0 8px;">Tai khoan cua ban da duoc tao tu he thong import.</p>
                    <p style="margin: 0 0 8px;">Email: <strong>${to}</strong></p>
                    <p style="margin: 0 0 8px;">Mat khau tam: <strong>${password}</strong></p>
                    <p style="margin: 12px 0 0;">Vui long dang nhap va doi mat khau ngay sau khi nhan email.</p>
                </div>
            `,
            attachments: [
                {
                    filename: 'welcome.png',
                    path: 'https://i.sstatic.net/l60Hf.png',
                    cid: 'welcome-image'
                }
            ]
        });
    }
}