import jwt from "jsonwebtoken";
import { jwt_pasword } from "./config.js";
export const userMiddleware = (req, res, next) => {
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
        const decoded = jwt.verify(token, jwt_pasword);
        // @ts-ignore
        req.userId = decoded.id;
        return next();
    }
    catch (error) {
        return res.status(403).json({
            message: "You are not logged in the portal"
        });
    }
};
//# sourceMappingURL=middleware.js.map