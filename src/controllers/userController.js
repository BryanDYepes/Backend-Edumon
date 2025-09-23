import User from '../models/User.js';

// Crear usuario
export const createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    const newUser = new User({ nombre, email, password, rol });
    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Listar usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
