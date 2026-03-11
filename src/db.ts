import mongoose, { model, Model, Schema} from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/secondbrain";

export async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

const UserSchema = new Schema({
    username: {type: String , unique: true},
    password: String

})

export const userModel = model("User", UserSchema)

const contentSchema = new Schema({
    type: String,
    title: String,
    content: String,
    link: String,
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    userId: {type: Schema.Types.ObjectId, ref: "User", required: true}
})


export const contentModel = model("Content" , contentSchema);

const linkSchema = new Schema({
    hash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true }
});

export const linkModel = model("Link", linkSchema);


