var nodemailer = require('nodemailer');

const emailerr = (errmsg) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'pallisai04@gmail.com',
            pass: 'wbcyfenxxsghqijb'
        }
    });

    var mailOptions = {
        from: 'pallisai04@gmail.com',
        to: 'murali.p@irax.in',
        subject: 'Node.js error',
        text: errmsg
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = {
    emailerr:emailerr
}