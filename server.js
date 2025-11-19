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
    const allowedOrder = ['id', 'nome', 'email', 'cpf']
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
    const { nome, senha, email, telefone, ativo } = req.body
    try {
        const resultado = await pool.query(
            'UPDATE usuarios SET nome=$1, senha=$2, email=$3, cpf=$4, WHERE id=$5 RETURNING *',
            [nome, senha, email, cpf, id]
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
        await pool.query(
            'Delete from usuarios where id=$1',
            [id]
        )
        reply.send({mensagem: "Deu certo!"})
    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.post('/usuarios', async (req, reply) => {
    const { nome, senha, email, telefone } = req.body;

    try {
        const resultado = await pool.query(
            'INSERT INTO USUARIOS (nome, senha, email, cpf) VALUES ($1, $2, $3, $4) RETURNING *',
            [nome, senha, email, telefone]
        )
        reply.status(200).send(resultado.rows[0])
    } catch (e) {
        reply.status(500).send({ error: e.message })
    }
})


server.get('/denuncias/:id', async (req, reply) => {
    const id = req.params.id;
    try {
        const resultado = await pool.query('SELECT denuncia FROM usuarios where id = $1', [id])
        
        reply.status(200).send({data: resultado.rows[0] })

    } catch (err) {
        reply.status(500).send({ error: err.message })
    }
})

server.listen({
    port: 3000,
    host: '0.0.0.0'
})