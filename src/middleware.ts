import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {jwt_pasword} from "./config.js"

export const userMiddleware = ( req : Request ,  res : Response , next : NextFunction ) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res.status(403).json({
                message: "You are not logged in the portal"
            });
        }

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(token as string, jwt_pasword) as { id: string };
        // @ts-ignore
        req.userId = decoded.id;
        return next();
    } catch (error) {
        return res.status(403).json({
            message: "You are not logged in the portal"
        });
    }
}