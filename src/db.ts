import mongoose, { model, Model, Schema} from "mongoose";

mongoose.connect("mongodb://localhost:27017/secondbrain")



const UserSchema = new Schema({
    username: {type: String , unique: true},
    password: String

})

export const userModel = model("User", UserSchema)
