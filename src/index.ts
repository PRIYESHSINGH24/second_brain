import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { userModel, connectDB, contentModel, linkModel } from "./db.js";
import { userMiddleware } from "./middleware.js";

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


app.post("/api/v1/content",userMiddleware, async (req, res) => {
    try {
    const link = req.body.link;
    const type = req.body.type;

    if (!link || !type) {
        return res.status(400).json({
            message: "link and type are required"
        });
    }

    await contentModel.create({
        link,
        type,
        //@ts-ignore
        userId: req.userId,
        tags: []
    })
    return res.json({
        message: "content added"
    })
    } catch (error) {
        return res.status(500).json({
            message: "failed to add content"
        });
    }
})


app.get("/api/v1/content",userMiddleware , async (req, res) => {
    try {
        //@ts-ignore
        const userId = req.userId;
        const content = await contentModel.find({
            userId: userId
        }).populate("userId", "username ")

        return res.json({
            content
        });
    } catch (error) {
        return res.status(500).json({
            message: "failed to fetch content"
        });
    }
})


app.delete("/api/v1/content",userMiddleware, async (req, res) => {
    try {
        const contentId = req.body.contentId;
        if (!contentId) {
            return res.status(400).json({
                message: "contentId is required"
            });
        }

        //@ts-ignore
        const userId = req.userId;
        const deleted = await contentModel.findOneAndDelete({
            _id: contentId,
            userId: userId
        });

        if (!deleted) {
            return res.status(404).json({
                message: "content not found"
            });
        }

        return res.json({
            message: "content deleted"
        });
    } catch (error) {
        return res.status(500).json({
            message: "failed to delete content"
        });
    }
})


app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
    try {
        const share = req.body.share;
        //@ts-ignore
        const userId = req.userId;

        if (share) {
            const existingLink = await linkModel.findOne({ userId: userId });
            if (existingLink) {
                return res.json({
                    hash: existingLink.hash
                });
            }

            const hash = randomBytes(6).toString("hex");
            await linkModel.create({
                hash,
                userId: userId
            });

            return res.json({
                hash
            });
        }

        await linkModel.findOneAndDelete({ userId: userId });
        return res.json({
            message: "removed link"
        });
    } catch (error) {
        return res.status(500).json({
            message: "failed to update share link"
        });
    }
})


app.get("/api/v1/brain/:shareLink", async (req, res) => {
    try {
        const hash = req.params.shareLink;
        const link = await linkModel.findOne({ hash: hash });

        if (!link) {
            return res.status(404).json({
                message: "invalid share link"
            });
        }

        const content = await contentModel.find({ userId: link.userId });
        const user = await userModel.findById(link.userId);

        return res.json({
            username: user?.username,
            content
        });
    } catch (error) {
        return res.status(500).json({
            message: "failed to fetch shared brain"
        });
    }

})




connectDB().then(() => {
    app.listen(3000, () => {
        console.log("server is running on port 3000")
    })
})

