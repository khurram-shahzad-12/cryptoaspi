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
            var sql = `INSERT INTO ourshopee_register (first_name, last_name, email, gender, nationality, password, mobile, date, refid, country, emirates, status) VALUES("${body.first_name}", "", "${body.email}", "${body.gender}", "${body.nationality}", PASSWORD("${body.password}"), "${body.mobile}", "${cartdate}", "${refid}", "${country}", "${emirates}", 0) `;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                if (req.body.hasOwnProperty('subscribe') && req.body.subscribe == 1) {
                    var sql_news = `INSERT INTO ourshopee_newsletter (email, status,email_status) VALUES("${body.email}", 1,1) `;
                    await db.runQuery(sql_news);
                }
                mobile = body.mobile;
                message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
                // FunctionsHelper.Send_SMS(mobile, message);


              
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

        // var emailQuery = `SELECT * FROM ourshopee_register WHERE email='${email}'`;
        var emailQuery = `SELECT * FROM ourshopee_register WHERE email='${email}' and account_status=1`;

        var resultQuery = await db.runQuery(emailQuery);

        if(resultQuery[0].length > 0){
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
    
    
                if (req.body.oscad > 0) {
                    var ip_address = req.body.oscad
    
                    var query1 = `update ourshopee_cart_tracking set user_id = ${result.id} WHERE ip_address='${ip_address}' `;
    
                    await db.runQuery(query1);
    
                   
                }
    
    
    
    
    
                return {
                    token: token
                }
    
                //const authenticated = await bcrypt.compare(password, result.password);
            } else {
                return 'invalid_password';
            }
        }else{
            return 'invalid_email';
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
        // else if (req.body.hasOwnProperty('mobile') && req.body.mobile > 0) {
        //     where = "WHERE email='" + email + "' OR mobile = '" + req.body.mobile + "'";
        // }
        var query = `SELECT * FROM ourshopee_register ${where} and account_status='1' `;
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
        const cartdate = await datetimeHelper.currentDateTime();
        const v = new Validator(req.body, {
            mobile: 'required|string|maxLength:10|minLength:7',
        });
        const matched = await v.check();
        if (!matched) {
            return {
                "status": 'validation',
                "data": 'mobile number should be numeric and min 7 and max 10 characters long '
            };
        }
        mobile = req.body.mobile.replace(/\s/g, '');
        var refid = Math.floor(1000 + Math.random() * 9000);

            var chck_sql = `SELECT * FROM tmp_otp_verification WHERE email_number=${mobile}`;
            var checkMobile = await db.runQuery(chck_sql);
            if (checkMobile[0].length > 0) {
                var sendtime = parseInt(checkMobile[0][0].sendtime) + 1;
                var otp_id = checkMobile[0][0].otp_id;
                var query_update = `UPDATE tmp_otp_verification  SET otp='${refid}', created_date='${cartdate}', sendtime=${sendtime} WHERE otp_id=${otp_id} `;
                var checkupdate = await db.runQuery(query_update);
                if (checkupdate) {
                    // message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
                    message = "Hi, Use " + refid + ",  to verify your phone number. for more www.OurShopee.com";
                    FunctionsHelper.Resend_SMS(mobile, message);
                    return {
                        "status": 'success',
                        "data": 'OTP send this  ' + mobile + ' mobile number .Please check and verify',
                    };
                }
            } else {

                var sql_insert = `INSERT INTO tmp_otp_verification (email_number,otp,created_date ) VALUES('${mobile}','${refid}', '${cartdate}') `;
                await db.runQuery(sql_insert);
                // message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
                message = "Hi, Use " + refid + ",  to verify your phone number. for more www.OurShopee.com";
                FunctionsHelper.Resend_SMS(mobile, message);

                return {
                    "status": 'success',
                    "data": 'OTP send this  ' + mobile + ' mobile number .Please check and verify',
                };
            }
        // }

    } catch (err) {
        return {
            "status": 'error',
            "data": ''
        };
    }
}

const reSendOtpWhatsapp = async (req) => {

    try {
        const cartdate = await datetimeHelper.currentDateTime();
        const v = new Validator(req.body, {
            mobile: 'required|string|maxLength:10|minLength:7',
        });
        const matched = await v.check();
        if (!matched) {
            return {
                "status": 'validation',
                "data": 'mobile number should be numeric and min 7 and max 10 characters long '
            };
        }
        mobile = req.body.mobile.replace(/\s/g, '');
        var refid = Math.floor(1000 + Math.random() * 9000);

            var chck_sql = `SELECT * FROM tmp_otp_verification WHERE email_number=${mobile}`;
            var checkMobile = await db.runQuery(chck_sql);
            if (checkMobile[0].length > 0) {
                var sendtime = parseInt(checkMobile[0][0].sendtime) + 1;
                var otp_id = checkMobile[0][0].otp_id;
                var query_update = `UPDATE tmp_otp_verification  SET otp='${refid}', created_date='${cartdate}', sendtime=${sendtime} WHERE otp_id=${otp_id} `;
                var checkupdate = await db.runQuery(query_update);
                if (checkupdate) {

                    message = "" + refid + "";
                    FunctionsHelper.Send_SMS_Whatsapp(mobile, message);
                    return {
                        "status": 'success',
                        "data": 'OTP send this  ' + mobile + ' mobile number .Please check and verify',
                    };
                }
            } else {

                var sql_insert = `INSERT INTO tmp_otp_verification (email_number,otp,created_date ) VALUES('${mobile}','${refid}', '${cartdate}') `;
                await db.runQuery(sql_insert);

                message = "" + refid + "";
                FunctionsHelper.Send_SMS_Whatsapp(mobile, message);

                return {
                    "status": 'success',
                    "data": 'OTP send this  ' + mobile + ' mobile number .Please check and verify',
                };
            }
        // }

    } catch (err) {
        return {
            "status": 'error',
            "data": ''
        };
    }
      
}

// check Mobile number  already exists or not -----------------------------------------------
const checkMobile = async (req) => {

    try {
        const cartdate = await datetimeHelper.currentDateTime();
        const v = new Validator(req.body, {
            mobile: 'required|string|maxLength:10|minLength:7',
        });
        const matched = await v.check();
        if (!matched) {
            return {
                "status": 'validation',
                "data": 'mobile number should be numeric and min 7 and max 10 characters long '
            };
        }
        mobile = req.body.mobile.replace(/\s/g, '');
        var refid = Math.floor(1000 + Math.random() * 9000);
        // var query = `SELECT mobile FROM ourshopee_register WHERE mobile=${mobile}`;
        // var result = await db.runQuery(query);
        // if (result[0].length > 0) {
        //     return {
        //         "status": 'exits',
        //         "data": 'This mobile number already exist. Please try with another number'
        //     };
        // } else {

            var chck_sql = `SELECT * FROM tmp_otp_verification WHERE email_number=${mobile}`;
            var checkMobile = await db.runQuery(chck_sql);
            if (checkMobile[0].length > 0) {
                var sendtime = parseInt(checkMobile[0][0].sendtime) + 1;
                var otp_id = checkMobile[0][0].otp_id;
                var query_update = `UPDATE tmp_otp_verification  SET otp='${refid}', created_date='${cartdate}', sendtime=${sendtime} WHERE otp_id=${otp_id} `;
                var checkupdate = await db.runQuery(query_update);
                if (checkupdate) {
                    // message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
                    message = "Hi, Use " + refid + ",  to verify your phone number. for more www.OurShopee.com";
                    FunctionsHelper.Send_SMS(mobile, message);
                    return {
                        "status": 'success',
                        "data": 'OTP send this  ' + mobile + ' mobile number .Please check and verify',
                    };
                }
            } else {

                var sql_insert = `INSERT INTO tmp_otp_verification (email_number,otp,created_date ) VALUES('${mobile}','${refid}', '${cartdate}') `;
                await db.runQuery(sql_insert);
                // message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
                message = "Hi, Use " + refid + ",  to verify your phone number. for more www.OurShopee.com";
                FunctionsHelper.Send_SMS(mobile, message);

                return {
                    "status": 'success',
                    "data": 'OTP send this  ' + mobile + ' mobile number .Please check and verify',
                };
            }
        // }

    } catch (err) {
        return {
            "status": 'error',
            "data": ''
        };
    }
}
// -----------------------------------------------ok
const verifyMobileOtp = async (req) => {

    try {
        const v = new Validator(req.body, {
            otp: 'required|maxLength:4|minLength:4',
        });
        const matched = await v.check();
        if (!matched) {
            return {
                "status": 'validation',
                "data": 'OTP should be 4 digits '
            };
        }
        mobile = req.body.mobile.replace(/\s/g, '');
        otp = req.body.otp.replace(/\s/g, '');
        var query = `SELECT otp_id FROM tmp_otp_verification WHERE email_number=${mobile} AND otp=${otp} `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            otp_id = result[0][0].otp_id;
            var query_update = `DELETE FROM tmp_otp_verification  WHERE otp_id=${otp_id} `;
            await db.runQuery(query_update);
            return {
                "status": 'success',
                "data": 'OTP verified successfully'
            };

        } else {
            return {
                "status": 'invalid',
                "data": 'Invalid OTP'
            };
        }

    } catch (err) {
        return {
            "status": 'error',
            "data": ''
        };
    }
}

// --------------------------------------------------------------

const delete_account = async (req) => {

    try {
         var token = req.body.token;
         var accountdelete = req.body.accountdelete;
        jwt.verify(token, process.env.TOKEN_KEY, async(err, decoded) => {
            if (err) {
              return "invalid token";
            } else {
              var email = decoded.email;
              var sql = `UPDATE ourshopee_register SET account_status='0', account_delete='${accountdelete}' WHERE email='${email}'`;
              var result = await db.runQuery(sql);
              if(!result){
                return "network error"
              }else{
                return "deleted successfully";
              }
            }
          });
                
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
    reSendOtpWhatsapp : reSendOtpWhatsapp,
    checkMobile: checkMobile,
    verifyMobileOtp: verifyMobileOtp,
    delete_account: delete_account,
}