const axios = require('axios');
var http = require('http');

function Send_SMS(mobileNumber,message='')
{
    // console.log('message',message)

    let username = "ShopeeTrans";
    let password = "xtIRT4d3";
    let sender_id = "OURSHOPEE";
    let mobile='+971'+ Number(mobileNumber);

    url = "http://api.rmlconnect.net/bulksms/bulksms";

    let parameters = 'username='+username+'&password='+password+'&type=0&dlr=1&destination='+mobile+'&source='+sender_id+'&message='+message;
    get_url = url + "?" + parameters;  
    http.get(get_url, function (result) {
      console.log('message',result)
            if(result.statusCode ==200){
                return 'success';
            }else{
            }
        }).on('error', function (err) {
            return 'error';
    });


  }

function Resend_SMS(mobileNumber,message='')
{
    //console.log('message',message)

    let username = "20091203";
    let password = "xx@6wSx@23";
    let sender_id = "OURSHOPEE";
    let mobile='+971'+ Number(mobileNumber);

    url = "http://mshastra.com/sendurlcomma.aspx";

    let parameters = 'user='+username+'&pwd='+password+'&senderid='+sender_id+'&mobileno='+mobile+'&msgtext='+message+'&priority=High&CountryCode=ALL';
    get_url = url + "?" + parameters;  
    http.get(get_url, function (result) {
            if(result.statusCode ==200){
                return 'success';
            }else{
            }
        }).on('error', function (err) {
            return 'error';
    });
}

async function sms_whatsapp_token() {
    try {
      const logdata = JSON.stringify({
        "username": "SHOPEEWBSUAE",
        "password": "Ambercastle*125"
      });
  
      const logconfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://apis.rmlconnect.net/auth/v1/login/',
        headers: {
          'Content-Type': 'application/json'
        },
        data: logdata
      };
  
      const response = await axios.request(logconfig);
      const token = response.data.JWTAUTH;
      return token;
    } catch (error) {
      console.error(error);
      throw error; 
    }
  }

async function Send_SMS_Whatsapp(mobileNumber, message) 
{
    const jwttoken = await sms_whatsapp_token();
    console.log(jwttoken);

    let mobile='+971'+ Number(mobileNumber);
    let data = JSON.stringify({
      "phone": mobile,
      "media": {
        "type": "media_template",
        "template_name": "ourshope_tran",
        "lang_code": "en",
        "body": [
          {
            "text": message
          }
        ],
        "button": [
          {
            "button_type": "authentication",
            "button_no": "0",
            "text": message
          }
        ]
      }
    });
    
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://apis.rmlconnect.net/wba/v1/messages?phone',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': jwttoken
      },
      data : data
    };
    
    axios.request(config)
    .then((response) => {

      console.log(response);

      return 'success';
    })
    .catch((error) => {
        return 'error';
    });
}

module.exports = { Send_SMS, Resend_SMS, Send_SMS_Whatsapp };
    
