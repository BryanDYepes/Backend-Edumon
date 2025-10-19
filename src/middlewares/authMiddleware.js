import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ 
                message: "Acceso denegado, token requerido" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que el usuario aún existe y está activo
        const user = await User.findById(decoded.userId);
        if (!user || user.estado !== 'activo') {
            return res.status(401).json({ 
                message: "Token inválido o usuario inactivo" 
            });
        }

        req.user = { 
            userId: decoded.userId,
            rol: user.rol 
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: "Token expirado" 
            });
        }
        
        return res.status(403).json({ 
            message: "Token inválido" 
        });
    }
};

// Middleware para verificar roles específicos
export const requireRole = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    message: "No autenticado" 
                });
            }

            const user = await User.findById(req.user.userId);
            
            if (!roles.includes(user.rol)) {
                return res.status(403).json({ 
                    message: "No tienes permisos para realizar esta acción" 
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({ 
                message: "Error al verificar permisos" 
            });
        }
    };
};