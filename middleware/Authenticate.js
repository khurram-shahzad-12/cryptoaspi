const jwt       =require('jsonwebtoken');


const authenticate=(req,res,next)=>{
    
  try{
        const token = req.headers.authorization.split(' ')[1]
        jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
            if (err) {
              return res.status(401).json({
                status: 'error',
                message: "Invalid Token..."
              });
            } else {
              req.user = decoded;
              next();
            }
          });
        /* const decode = jwt.verify(token, process.env.TOKEN_KEY)
        req.user = decode
        var user_id=req.user.user_id;
        next() */
    }
    catch(error){
        res.status(401).json({
            message: 'Authentication Field',
            status: 'failure',
        });
    }
}
module.exports=authenticate