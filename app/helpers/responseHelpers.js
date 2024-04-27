function errorResponse(res, msg) {
    res.status(500).json({
        message: msg || 'something went wrong',
        status: "failure",
        data: []
    });
}

function successResponse(res, data, msg,status) {
    res.status(200).json({
        message: msg || 'Data fetched Successfully',
        status: status || 'success',
        data: data
    });
}

function nodatafound(res) {
    res.status(204).json({
        message: 'No Data Found',
        status: 'success',
        data: []
    });
}

function invalidResponse(res, data, msg) {
    res.status(401).json({
        message: msg || 'Invalid Credentials',
        status: 'error',
        data: data
    });
}

function inputValidateError(res, data, msg) {
    res.status(422).json({
        message: msg || 'Invalid Input',
        status: 'error',
        data: data
    });
}

function existsResponse(res, data, msg) {
    res.status(409).json({
        message: msg || 'Already exists',
        status: 'error',
        data: data
    });
}

module.exports = { successResponse, errorResponse, nodatafound, invalidResponse, inputValidateError,existsResponse}