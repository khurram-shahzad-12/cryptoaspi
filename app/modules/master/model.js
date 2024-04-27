const db = require('../../db');

//-------------------------------------------------------
const GetNationality = async () => {

    try {

        var query = `SELECT id, country_name FROM ourshopee_nationalities `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            result = result[0];
            const output = result.map((Element) => {
                return {
                    value: Element.id,
                    label: Element.country_name,
                }
            });
            return output
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

//-------------------------------------------------------
const getLocations = async (req) => {

    try {
        const country_id = process.env.country_id;
        where = 'WHERE country_id=' + country_id + ' AND status=1';
        if (typeof req.query.id != 'undefined' && req.query.id > 0) {
            where = 'WHERE id =' + req.query.id + ' AND country_id=' + country_id + ' AND status=1';
        }
        var query = `SELECT id, emirate as name FROM shopee_emirates ${where}`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0];
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

//-------------------------------------------------------
const getAreas = async (req) => {

    try {
        
        if (typeof req.query.emirateid != 'undefined' && req.query.emirateid != ''  && req.query.emirateid != 0) {
            where = 'WHERE emirateid =' + req.query.emirateid;
            if (typeof req.query.id != 'undefined' && req.query.id > 0) {
                where = 'WHERE id =' + req.query.id + ' AND emirateid=' + req.query.emirateid;
            }
        }else{
            return 'error';
        }
        var query = `SELECT id, emirateid, name FROM shopee_area ${where}`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0];
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

module.exports = {
    GetNationality: GetNationality,
    getLocations: getLocations,
    getAreas: getAreas,
}