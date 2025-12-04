import Fastify from 'fastify';
import pkg from 'pg';
import cors from '@fastify/cors'

const { Pool } = pkg;







//vai ter cpf, senha, denuncia vinculada, tudo em string 




const pool = new Pool({
    user: 'local',
    host: 'localhost',
    database: 'denuncias',
    password: '12345',
    port: '5432'
})

const server = Fastify()

await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
})


server.get('/usuarios', async (req, reply) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const allowedOrder = ['id', 'nome', 'email', 'telefone']
    const sort = allowedOrder.includes(req.query.sort) ? req.query.sort : 'id';
    const order = req.query.order === 'desc' ? "DESC" : "ASC"

    try {
        const resultado = await pool.query(`SELECT * FROM usuarios ORDER BY 
            ${sort} ${order} LIMIT ${limit} OFFSET ${offset}`)

        const count = await pool.query("SELECT COUNT(*) FROM USUARIOS")
        reply.status(200).send({data: resultado.rows, count: parseInt(count.rows[0].count) })
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.put('/usuarios/:id', async (req, reply) => {
    const id = req.params.id;
    const { nome, senha, email, telefone } = req.body
    try {
        const resultado = await pool.query(
            'UPDATE usuarios SET nome=$1, senha=$2, email=$3, telefone=$4 WHERE id=$5 RETURNING *',
            [nome, senha, email, telefone, id]
        );

        if (resultado.rows.length === 0) {
             return reply.status(404).send({ error: 'Usuário não encontrado' });
        }
        
        reply.status(200).send(resultado.rows[0]);
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.delete('/usuarios/:id', async (req, reply) => {
    const id = req.params.id;

    try {
        // PASSO 1: Primeiro apaga as denúncias desse usuário
        // (Verifique se no seu banco a coluna chama 'usuario_id' mesmo)
        await pool.query('DELETE FROM denuncias WHERE usuario_id = $1', [id]);

        // PASSO 2: Agora apaga o usuário
        const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

        // Verifica se deletou algo
        if (resultado.rowCount === 0) {
            return reply.status(404).send({ error: "Usuário não encontrado" });
        }

        return reply.send({ mensagem: "Usuário e suas denúncias foram deletados!" });

    } catch (err) {
        console.error(err);
        return reply.status(500).send({ error: "Erro ao deletar: " + err.message });
    }
});

server.post('/usuarios', async (req, reply) => {
    const { nome, senha, email, telefone } = req.body;

    try {
        // AQUI ESTAVA O ERRO: Removi a coluna 'denuncia' e o valor vazio ''
        // Agora ele só insere o que realmente existe na tabela
        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, senha, email, telefone) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nome, senha, email, telefone]
        )
        reply.status(201).send(resultado.rows[0])
    } catch (e) {
        console.error("ERRO:", e.message); 
        reply.status(500).send({ error: e.message })
    }
})



server.post('/denuncias', async (req, reply) => {
    const { usuario_id, texto } = req.body;

    try {
        const resultado = await pool.query(
            'INSERT INTO denuncias (usuario_id, texto) VALUES ($1, $2) RETURNING *',
            [usuario_id, texto]
        );
        reply.status(201).send(resultado.rows[0]);
    } catch (err) {
        reply.status(500).send({ error: err.message });
    }
});


server.get('/denuncias/usuario/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        const resultado = await pool.query(
            'SELECT * FROM denuncias WHERE usuario_id = $1 ORDER BY id DESC', 
            [id]
        )
        reply.status(200).send({ data: resultado.rows }); 
    } catch (err) {
        reply.status(500).send({ error: err.message });
    }
});

server.delete('/denuncias/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        const resultado = await pool.query('DELETE FROM denuncias WHERE id = $1', [id]);
        
        if (resultado.rowCount === 0) {
            return reply.status(404).send({ error: "Denúncia não encontrada" });
        }
        
        return reply.send({ message: "Denúncia deletada com sucesso" });
    } catch (err) {
        return reply.status(500).send({ error: err.message });
    }
});

server.listen({
    port: 3000,
    host: '0.0.0.0'
})