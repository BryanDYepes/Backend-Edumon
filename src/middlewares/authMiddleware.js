import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // formato: "Bearer token"

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado, token requerido" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // guarda la info del usuario en la request
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token inválido o expirado" });
    }
};
