const nodemailer = require("nodemailer");

const { AUTH_EMAIL, AUTH_PASS } = process.env

let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: AUTH_EMAIL,
        pass: AUTH_PASS,
    },
});

// test transporter
transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Server is ready to take messages");
        console.log(success);
    }
});

const SendEmail = async (mailOptions) => {
    try {
        await transporter.SendMail(mailOptions);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    SendEmail
}