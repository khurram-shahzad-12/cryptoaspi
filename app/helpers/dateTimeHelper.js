const moment = require('moment');
const momenttimezone = require('moment-timezone');

const currentDateTime = async () => {
    return momenttimezone().tz(process.env.timezone).format('YYYY-MM-DD HH:mm:ss');
}

const currentDate = async () => {
    return momenttimezone().tz(process.env.timezone).format('YYYY-MM-DD');
}

const currentTime = async () => {
    return momenttimezone().tz(process.env.timezone).format('HH:mm:ss');
}

const convertToYMD = async (date='') => {
    return date.split("-").reverse().join("-");
}

const convertToDMY = async (date='') => {
    return  moment(date).utc().format('DD-MM-YYYY')
}
const convertToDMYTime = async (date='') => {
    return  moment(date).utc().format('DD-MM-YYYY HH:mm:ss')
}

module.exports = { 
    currentDateTime,
    currentDate,
    currentTime,
    convertToYMD,
    convertToDMY,
    convertToDMYTime,
}