import express from "express";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { connectDB, contentModel, linkModel, userModel } from "./db.js";
import { userMiddleware } from "./middleware.js";
import { jwt_pasword } from "./config.js";

const app = express();

app.use(express.json());

app.post("/api/v1/signup", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;

	if (!username || !password) {
		return res.status(400).json({
			message: "username and password are required"
		});
	}

	try {
		await userModel.create({
			username,
			password
		});

		return res.json({
			message: "user signed up successfully"
		});
	} catch (error) {
		return res.status(500).json({
			message: "error signing up user"
		});
	}
});

app.post("/api/v1/signin", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;

	const existinguser = await userModel.findOne({
		username,
		password
	});

	if (!existinguser) {
		return res.status(403).json({
			message: "invalid username or password"
		});
	}

	const token = jwt.sign(
		{
			id: existinguser._id
		},
		jwt_pasword
	);

	return res.json({
		message: "user signed in successfully",
		token
	});
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
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
			// @ts-ignore
			userId: req.userId,
			tags: []
		});

		return res.json({
			message: "note added"
		});
	} catch (error) {
		return res.status(500).json({
			message: "failed to add note"
		});
	}
});

app.get("/api/v1/content", userMiddleware, async (req, res) => {
	try {
		const content = await contentModel
			.find({
				// @ts-ignore
				userId: req.userId
			})
			.populate("userId", "username")
			.sort({ createdAt: -1 });

		return res.json({
			content
		});
	} catch (error) {
		return res.status(500).json({
			message: "failed to fetch notes"
		});
	}
});

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
	try {
		const contentId = req.body.contentId;

		if (!contentId) {
			return res.status(400).json({
				message: "contentId is required"
			});
		}

		const deleted = await contentModel.findOneAndDelete({
			_id: contentId,
			// @ts-ignore
			userId: req.userId
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
});

app.put("/api/v1/content/:contentId", userMiddleware, async (req, res) => {
	try {
		const contentId = req.params.contentId;
		const updates: Record<string, string> = {};

		if (typeof req.body.title === "string") updates.title = req.body.title.trim() || "Untitled note";
		if (typeof req.body.content === "string" && req.body.content.trim()) updates.content = req.body.content.trim();
		if (typeof req.body.link === "string") updates.link = req.body.link.trim();
		if (typeof req.body.type === "string" && req.body.type.trim()) updates.type = req.body.type.trim();

		const updated = await contentModel.findOneAndUpdate(
			{
				_id: contentId,
				// @ts-ignore
				userId: req.userId
			},
			updates,
			{ new: true }
		);

		if (!updated) {
			return res.status(404).json({ message: "note not found" });
		}

		return res.json({ message: "note updated", note: updated });
	} catch (error) {
		return res.status(500).json({ message: "failed to update note" });
	}
});

app.post("/api/v1/content/:contentId/share", userMiddleware, async (req, res) => {
	try {
		const contentId = req.params.contentId;
		const note = await contentModel.findOne({
			_id: contentId,
			// @ts-ignore
			userId: req.userId
		});

		if (!note) {
			return res.status(404).json({
				message: "note not found"
			});
		}

		if (!note.sharedHash) {
			note.sharedHash = randomBytes(6).toString("hex");
			await note.save();
		}

		return res.json({
			hash: note.sharedHash
		});
	} catch (error) {
		return res.status(500).json({
			message: "failed to share note"
		});
	}
});

app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
	try {
		const share = req.body.share;
		// @ts-ignore
		const userId = req.userId;

		if (share) {
			const existingLink = await linkModel.findOne({ userId });

			if (existingLink) {
				return res.json({
					hash: existingLink.hash
				});
			}

			const hash = randomBytes(6).toString("hex");
			await linkModel.create({
				hash,
				userId
			});

			return res.json({
				hash
			});
		}

		await linkModel.findOneAndDelete({ userId });
		return res.json({
			message: "removed link"
		});
	} catch (error) {
		return res.status(500).json({
			message: "failed to update share link"
		});
	}
});

app.get("/api/v1/brain/:shareLink", async (req, res) => {
	try {
		const hash = req.params.shareLink;
		const link = await linkModel.findOne({ hash });

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
});

app.get("/api/v1/content/share/:shareLink", async (req, res) => {
	try {
		const hash = req.params.shareLink;
		const sharedNote = await contentModel.findOne({ sharedHash: hash }).populate("userId", "username");

		if (!sharedNote) {
			return res.status(404).json({
				message: "invalid note share link"
			});
		}

		return res.json({
			username: typeof sharedNote.userId === "object" && "username" in sharedNote.userId ? sharedNote.userId.username : undefined,
			note: sharedNote
		});
	} catch (error) {
		return res.status(500).json({
			message: "failed to fetch shared note"
		});
	}
});

connectDB().then(() => {
	app.listen(3000, () => {
		console.log("server is running on port 3000");
	});
});
