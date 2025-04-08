import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

export const isUserLoggedIn = async (req, res, next)=>{
    try {
        const authorizationHeader = req.headers.authorization;
        const tokenArray = authorizationHeader.split(" ")
        // console.log(tokenArray);
        const token = tokenArray[1];
        const tokenData = jwt.verify(token, process.env.JWT_SECRET);
        // console.log(tokenData);
        
        //check if the user exist in the database
        const user = await prisma.user.findUnique({
            where: {id: tokenData.id}
        });

        // if user is not found
        if(!user){
            return res.status(401)
            .json({message: "Unauthorized"});
        };
        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({message: error.message});
    }
}