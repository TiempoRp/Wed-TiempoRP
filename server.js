const express = require("express")
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const SFTPClient = require("ssh2-sftp-client");
const app = express();
const PORT = 3000;

const sftpConfig = {
  host: "oui.lemehost.com",
  port: 2022,
  username: "user_1134865.d92a9c86",
  password: "Wka8qdM5F4XtDaw9HiTxz1mExEERLTGD"
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

let sesiones = {}; // Guarda sesiones activas

app.post("/login", async (req, res) => {
  const { email, nombre_apellido, password } = req.body;
  const sftp = new SFTPClient();
  const filePath = `/scriptfiles/Jugadores/${nombre_apellido}.rp`;

  try {
    await sftp.connect(sftpConfig);
    const fileContent = await sftp.get(filePath);
    const data = fileContent.toString();

    const emailMatch = /Email\s*=\s*(.+)/i.exec(data);
    const passMatch = /Contraseña\s*=\s*(.+)/i.exec(data);

    if (!emailMatch || emailMatch[1].trim() !== email)
      return res.status(401).send("Correo incorrecto");

    if (!passMatch || passMatch[1].trim() !== password)
      return res.status(401).send("Contraseña incorrecta");

    // Extraer datos
    const getValue = (label) => {
      const match = new RegExp(label + "\\s*=\\s*(.+)", "i").exec(data);
      return match ? match[1].trim() : "No disponible";
    };

    const usuario = {
      nombre: nombre_apellido,
      sqlid: getValue("SQLID"),
      dinero: getValue("Dinero"),
      banco: getValue("Banco"),
      nivel: getValue("Nivel"),
      horasj: getValue("HorasJ"),
      premium: getValue("Premium"),
      coins: getValue("Coins"),
      sanciones: getValue("Sanciones"),
      asesinatos: getValue("Asesinatos"),
      ropa: getValue("Ropa"),
      edad: getValue("Edad"),
      Bolsillo_0: getValue("Bolsillo_0"),
      BolsilloCantidad_0: getValue("Bolsillo_Cantidad_0"),
      Bolsillo_1: getValue("Bolsillo_1"),
      BolsilloCantidad_1: getValue("Bolsillo_Cantidad_1"),
      Bolsillo_2: getValue("Bolsillo_2"),
      BolsilloCantidad_2: getValue("Bolsillo_Cantidad_2"),
      Bolsillo_3: getValue("Bolsillo_3"),
      BolsilloCantidad_3: getValue("Bolsillo_Cantidad_3"),
      Bolsillo_4: getValue("Bolsillo_4"),
      BolsilloCantidad_4: getValue("Bolsillo_Cantidad_4"),
      Bolsillo_5: getValue("Bolsillo_5"),
      BolsilloCantidad_5: getValue("Bolsillo_Cantidad_5"),
      Bolsillo_6: getValue("Bolsillo_6"),
      BolsilloCantidad61: getValue("Bolsillo_Cantidad_6"),
      Bolsillo_7: getValue("Bolsillo_7"),
      BolsilloCantidad_7: getValue("Bolsillo_Cantidad_7"),
      Bolsillo_8: getValue("Bolsillo_8"),
      BolsilloCantidad_8: getValue("Bolsillo_Cantidad_8"),
      Bolsillo_9: getValue("Bolsillo_9"),
      BolsilloCantidad_9: getValue("Bolsillo_Cantidad_9"),
      manoIzquierda: getValue("Mano_Izquierda"),
      manoIzquierdaCantidad: getValue("Mano_Izquierda_Cantidad"),
      manoDerecha: getValue("Mano_Derecha"),
      manoDerechaCantidad: getValue("Mano_Derecha_Cantidad"),

      rol: nombre_apellido === "Admin" ? "admin" : "usuario"
    };

    sesiones[nombre_apellido] = usuario;

    // Registrar si es nuevo o cambia IP
    const logFile = path.join(__dirname, "usuarios.json");
    let usuarios = {};
    if (fs.existsSync(logFile)) {
      usuarios = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    }
    if (!usuarios[nombre_apellido]) {
      usuarios[nombre_apellido] = { email, fecha: new Date().toISOString() };
      fs.writeFileSync(logFile, JSON.stringify(usuarios, null, 2));
    }

    res.json({ success: true, datos: usuario });
  } catch (error) {
    console.error("Error login:", error.message);
    res.status(500).send("Error al conectar con el servidor.");
  } finally {
    sftp.end();
  }
});

app.post("/logout", (req, res) => {
  const { nombre } = req.body;
  delete sesiones[nombre];
  res.json({ success: true });
});
/*
app.post("/solicitud-nombre", (req, res) => {
  const { nombre, nuevo_nombre, motivo } = req.body;
  const dir = path.join(__dirname, "registros");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, `${nombre}_${Date.now()}.txt`);
  const contenido = `Usuario: ${nombre}\nNuevo nombre: ${nuevo_nombre}\nMotivo: ${motivo}\nFecha: ${new Date().toLocaleString()}`;
  fs.writeFileSync(file, contenido);
  res.json({ success: true });
});

app.get("/solicitudes", (req, res) => {
  const archivos = fs.readdirSync(path.join(__dirname, "registros"));
  const registros = archivos.map((file) => {
    const content = fs.readFileSync(path.join(__dirname, "registros", file), "utf-8");
    return { archivo: file, contenido: content };
  });
  res.json(registros);
});*/
/////////////////////////////


// Ruta para guardar solicitudes
app.post("/solicitud", (req, res) => {
  const { nombre, tipo, contenido } = req.body;
  const fecha = new Date().toLocaleString();
  const texto = ` ${nombre} solicitó ${tipo}:\n${contenido}\n[${fecha}]\n\n`;
  const archivo = path.join(__dirname, "registros", "solicitudes.txt");

  fs.appendFile(archivo, texto, err => {
    if (err) {
      console.error("Error al guardar la solicitud:", err);
      return res.status(500).send("Error interno");
    }
    res.sendStatus(200);
  });
});

// Ruta para leer solicitudes
app.get("/solicitudes", (req, res) => {
  const archivo = path.join(__dirname, "registros", "solicitudes.txt");
  if (!fs.existsSync(archivo)) return res.json([]);

  const contenido = fs.readFileSync(archivo, "utf-8");
  const solicitudes = contenido.trim().split("\n\n").map(s => ({ contenido: s }));
  res.json(solicitudes.reverse()); // Mostrar la más reciente primero
});


///////////////////////////
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

