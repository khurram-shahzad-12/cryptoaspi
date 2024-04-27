const db = require('../../db');
const datetimeHelper = require('../../helpers/dateTimeHelper');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken")

const saltRounds = 10;

const FunctionsHelper = require('../../helpers/functionsHelper');

const { Validator } = require('node-input-validator');

// Fore signup registration function---------------------------------------------
const Signup = async (req) => {

    try {

      
        const isExists = await CheckEmail(req);
        if (isExists.length > 0) {
            return "exists";
        } else {

            //const password = req.body.password;
            //const encryptedPassword = await bcrypt.hash(password, saltRounds)
            var refid = Math.floor(1000 + Math.random() * 9000);
            const cartdate = await datetimeHelper.currentDateTime();
            const body = req.body;
            //body.password = encryptedPassword;
            var country = '1';
            var emirates = '1';
            var sql = `INSERT INTO ourshopee_register (first_name, last_name, email, gender, nationality, password, mobile, date, refid, country, emirates, status) VALUES("${body.first_name}", "${body.last_name}", "${body.email}", "${body.gender}", "${body.nationality}", PASSWORD("${body.password}"), "${body.mobile}", "${cartdate}", "${refid}", "${country}", "${emirates}", 0) `;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                if (req.body.hasOwnProperty('subscribe') && req.body.subscribe == 1) {
                    var sql_news = `INSERT INTO ourshopee_newsletter (email, status,email_status) VALUES("${body.email}", 1,1) `;
                    await db.runQuery(sql_news);
                }
                mobile = body.mobile;
                message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
                FunctionsHelper.Send_SMS(mobile, message);


              
                //Destroy Session
                // MoEvent.destroySession()


                // Track User Attribute - Add Event with multiple attribute
                // MoEvent.addEvent("event name",{name:"xyz",age:19})

                //setCustomAttribute
                // MoEvent.setCustomAttribute("email", 20)
                // MoEvent.setCustomAttribute("adjjk", 'ghj')

                token = jwt.sign(
                    {
                        user_id: result[0].insertId,
                        first_name: body.first_name,
                        last_name: body.last_name,
                        email: body.email
                    },
                    process.env.TOKEN_KEY,
                    {
                        expiresIn: process.env.TOKEN_EXP,
                    }
                );
                return {
                    token: token
                }
            } else {
                return 'error';
            }
        }
    } catch (err) {
        return 'error';
    }
}

const Signup_bkp = async (req) => {

    try {

        const isExists = await CheckEmail(req);

        if (isExists.length > 0) {
            return "exists";
        } else {

            const password = req.body.password;
            const encryptedPassword = await bcrypt.hash(password, saltRounds)
            const refid = Math.random(0, 9999);
            const cartdate = await datetimeHelper.currentDateTime();
            const body = req.body;
            body.password = encryptedPassword;
            body.date = cartdate;
            body.refid = refid;
            body.country = '1';
            body.emirates = '1';
            body.status = 0;
            var sql = `INSERT INTO ourshopee_register (first_name, last_name, email, gender, nationality, password, mobile, date, refid, country, emirates, status) VALUES("${body.first_name}", "${body.last_name}", "${body.email}", "${body.gender}", "${body.nationality}", "${body.password}", "${body.mobile}", "${body.date}", "${body.refid}", "${body.country}", "${body.emirates}", "${body.status}") `;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                token = jwt.sign(
                    {
                        user_id: result[0].insertId,
                        first_name: body.first_name,
                        last_name: body.last_name,
                        email: body.email
                    },
                    process.env.TOKEN_KEY,
                    {
                        expiresIn: process.env.TOKEN_EXP,
                    }
                );
                return {
                    token: token
                }
            } else {
                return 'error';
            }
        }
    } catch (err) {
        return 'error';
    }
}

// For Login function --------------------------------------------------
const Login = async (req) => {

    try {

        var email = req.body.email;
        var password = req.body.password;

        var query = `SELECT * FROM ourshopee_register WHERE email='${email}' and password = password('${password}') `;

        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            result = result[0][0];
            token = jwt.sign(
                {
                    user_id: result.id,
                    first_name: result.first_name,
                    last_name: result.last_name,
                    email: result.email
                },
                process.env.TOKEN_KEY,
                {
                    expiresIn: process.env.TOKEN_EXP,
                }
            );
            return {
                token: token
            }

            //const authenticated = await bcrypt.compare(password, result.password);
        } else {
            return 'invalid';
        }

    } catch (err) {
        return 'error';
    }
}

// check Email already exists or not -----------------------------------------------
const CheckEmail = async (req, type = '') => {

    try {
        var email = req.body.email;
        where = "WHERE email='" + email + "'";
        if (type != '' && type == 'update') {
            where = "WHERE email='" + email + "' AND id != '" + req.user.user_id + "'";
        }
        else if (req.body.hasOwnProperty('mobile') && req.body.mobile > 0) {
            where = "WHERE email='" + email + "' OR mobile = '" + req.body.mobile + "'";
        }
        var query = `SELECT email FROM ourshopee_register ${where} `;
        var result = await db.runQuery(query);
        return result[0];

    } catch (err) {
        return 'error';
    }
}

// -----------------------------------------------ok
const verifyOtp = async (req) => {

    try {
        const v = new Validator(req.body, {
            otp: 'required|maxLength:4|minLength:4',
        });
        const matched = await v.check();
        if (!matched) {
            return {
                "status": 'validation',
                "data": v.errors
            };
        }
        var loginId = req.user.user_id;

        var query = `SELECT id, refid FROM ourshopee_register WHERE id=${loginId} `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            refid = result[0][0].refid;
            refid = refid.replace(/\s/g, '');
            otp = req.body.otp.replace(/\s/g, '');
            if (refid == otp) {
                var query_update = `UPDATE ourshopee_register SET status=1 WHERE id=${loginId} `;
                await db.runQuery(query_update);
                return {
                    "status": 'success',
                    "data": ''
                };
            } else {
                return {
                    "status": 'invalid',
                    "data": 'Invalid OTP'
                };
            }
        } else {
            return {
                "status": 'error',
                "data": ''
            };
        }

    } catch (err) {
        return {
            "status": 'error',
            "data": ''
        };
    }
}

// -----------------------------------------------
const reSendOtp = async (req) => {

    try {
        var loginId = req.user.user_id;
        mobile = req.body.mobile.replace(/\s/g, '');
        var refid = Math.floor(1000 + Math.random() * 9000);
        var query = `UPDATE ourshopee_register SET refid=${refid} WHERE id=${loginId}`;
        var result = await db.runQuery(query);
        if (result.length > 0) {
            message = "Hi, Use " + refid + ",  to verify your phone number. for more www.OurShopee.com";
            FunctionsHelper.Send_SMS(mobile, message);
            return 'success';
        } else {
            return 'error';
        }

    } catch (err) {
        return 'error';
    }
}

module.exports = {
    CheckEmail: CheckEmail,
    Signup: Signup,
    Login: Login,
    verifyOtp: verifyOtp,
    reSendOtp: reSendOtp,
}