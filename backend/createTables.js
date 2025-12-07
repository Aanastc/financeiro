import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
	connectionString:
		"postgresql://neondb_owner:npg_8z3RNKDAqpoL@ep-ancient-sound-adnrvwlf-pooler.c-2.us-east-1.aws.neon.tech/financeiro_db?sslmode=require",
});

async function createTables() {
	try {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

		console.log("Tabela 'usuarios' criada com sucesso!");
	} catch (error) {
		console.error("Erro ao criar tabela:", error);
	} finally {
		pool.end();
	}
}

createTables();
