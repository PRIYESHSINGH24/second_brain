import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { userModel } from "./db.js";


const app = express();
app.use(express.json());


app.post("/api/v1/signin",(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    
    userModel.create({
        username: username,
        password: password
    })
    res.json({
        message: "user signed up successfully"
    })

})


app.post("/api/v1/content",(req, res) => {

})


app.get("/api/v1/content",(req, res) => {

})


app.delete("/api/v1/content",(req, res) => {

})


app.post("app/v1/brain/share", (req, res) => {

})


app.get("app/v1/brain:shareLink", (req, res) => {

})




app.listen(3000);
