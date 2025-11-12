import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const resetDB = async () => {
  try {
    // Conexión a la base
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Conectado a MongoDB...");

    // Esto borra toda la base de datos actual
    await mongoose.connection.dropDatabase();

    console.log("Base de datos reseteada con éxito.");
    process.exit(0);
  } catch (error) {
    console.error("Error al resetear DB:", error.message);
    process.exit(1);
  }
};

resetDB();
