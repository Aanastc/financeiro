import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "segredo_super_secreto"; // depois colocamos em variável ambiente

// Conexão
const pool = new Pool({
	connectionString:
		"postgresql://neondb_owner:npg_8z3RNKDAqpoL@ep-ancient-sound-adnrvwlf-pooler.c-2.us-east-1.aws.neon.tech/financeiro_db?sslmode=require",
});

// Cadastro com hash
app.post("/register", async (req, res) => {
	try {
		const { name, email, password } = req.body;
		const hash = await bcrypt.hash(password, 10);

		const result = await pool.query(
			"INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id",
			[name, email, hash]
		);

		res.json({ success: true, userId: result.rows[0].id });
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: "Erro ao cadastrar" });
	}
});

// Login
app.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [
			email,
		]);

		if (result.rows.length === 0) {
			return res.status(400).json({ error: "Usuário não encontrado" });
		}

		const user = result.rows[0];
		const match = await bcrypt.compare(password, user.senha);

		if (!match) {
			return res.status(400).json({ error: "Senha incorreta" });
		}

		const token = jwt.sign({ id: user.id }, JWT_SECRET, {
			expiresIn: "7d",
		});

		res.json({
			success: true,
			token,
			user: { id: user.id, nome: user.nome, email: user.email },
		});
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: "Erro ao fazer login" });
	}
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
