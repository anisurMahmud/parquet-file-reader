const { ApiErrorResponse } = require("../utils/global");

module.exports = async function (req, res, next) {
    try {
        const {username, password} = req.body;
        if (!req.body || !username || !password) {
            return ApiErrorResponse(res, 'BAD_REQUEST', 'Username and password are required');
        }
        if(username===process.env.API_USERNAME && password === process.env.API_PASSWORD){
            return next();     //authenticatin success
        }
        else return ApiErrorResponse(res, 'UNAUTHORIZED', 'Authentication failed. Invalid credentials.');
    } catch (error) {
        console.log(error)
        throw error;
        
    }
}