module.exports = async function (req, res, next) {
    try {
        const {username, password} = req.body;
        if (!req.body || !username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        if(username===process.env.API_USERNAME && password === process.env.API_PASSWORD){
            return next();     //authenticatin success
        }
        else return res.status(401).json({ message: 'Authentication failed' });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: 'Something Went Wrong' });
        
    }
}