import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { userModel, connectDB } from "./db.js";

const JWT_PASSWORD = "12345"

const app = express();
app.use(express.json());


app.post("/api/v1/signup",async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    
    try {
        await userModel.create({
            username: username,
            password: password
        })
        res.json({
        message: "user signed up successfully"
    })

    } catch (error) {
        res.status(500).json({
            message: "error signing up user"
          })


    }

})


app.post("/api/v1/signin",async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const existinguser = await userModel.findOne({
        username,
        password
    })
    if(existinguser){
        const token = jwt.sign(

            {
                id : existinguser._id
            
            } , JWT_PASSWORD)
        res.json({
            message: "user signed in successfully",
            token: token
        })
    }
    else {
        res.status(403).json({
            message: "invalid username or password"
        })
    }



})


app.get("/api/v1/content",(req, res) => {

})


app.delete("/api/v1/content",(req, res) => {

})


app.post("app/v1/brain/share", (req, res) => {

})


app.get("app/v1/brain:shareLink", (req, res) => {

})




connectDB().then(() => {
    app.listen(3000, () => {
        console.log("server is running on port 3000")
    })
})

