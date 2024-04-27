const config = require('./config');

const runQuery = async (query, values = '') => {
    const con = await config.connection();
    try {
        if(values !='' ){
            var result = await con.query(query,values);
        }else{
            var result = await con.query(query);
        }
        con.release();
        return result;
    } catch (error) {
        con.release();
        return console.log(`Could not connect - ${error}`);
    }
}


module.exports = {            
    runQuery
}