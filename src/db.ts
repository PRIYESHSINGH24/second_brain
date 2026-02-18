import {Model, Schema} from "mongoose";

const UserModel = new Model({
    username: {type: String , unique: true},
    password: String

})