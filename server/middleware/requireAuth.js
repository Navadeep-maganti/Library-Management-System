import jwt from "jsonwebtoken";

/**
 * Requires a valid Bearer JWT and exposes its claims as req.auth and req.user.
 */
export const requireAuth = (req, res, next) => {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ success: false, message: "A valid Bearer token is required." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.auth = decoded;
        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Your session is invalid or has expired. Please sign in again."
        });
    }
};
