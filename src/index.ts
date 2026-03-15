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
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const link = typeof req.body.link === "string" ? req.body.link.trim() : "";
    const type = typeof req.body.type === "string" ? req.body.type.trim() : "note";

    if (!content) {
        return res.status(400).json({
            message: "note content is required"
        });
    }

    await contentModel.create({
        title: title || "Untitled note",
        content,
        link,
        type: type || "note",
        //@ts-ignore
        userId: req.userId,
        tags: []
    })
    return res.json({
        message: "note added"
    })
    } catch (error) {
        return res.status(500).json({
            message: "failed to add note"
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
          .sort({ createdAt: -1 })

        return res.json({
            content
        });
    } catch (error) {
        return res.status(500).json({
            message: "failed to fetch notes"
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
                message: "note not found"
            });
        }

        return res.json({
            message: "note deleted"
        });
    } catch (error) {
        return res.status(500).json({
            message: "failed to delete note"
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

        const content = await contentModel.find({ userId: link.userId }).sort({ createdAt: -1 });
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

