// leitor de qr code
// chatbot.js

const db = require('./firebase'); // importa o firebase.js
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const client = new Client();
const delay = ms => new Promise(res => setTimeout(res, ms));

let agendamentoEtapas = {}; // Controle de etapas do usuário

// Leitor de QR Code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Conexão estabelecida
client.on('ready', () => {
    console.log('✅ Tudo certo! WhatsApp conectado.');
});

// Inicialização
client.initialize();

// Funil de mensagens
client.on('message', async msg => {
    const userId = msg.from;

    // ⛔ Ignora mensagens de grupos
    if (msg.from.endsWith('@g.us')) return;

    if (!agendamentoEtapas[userId]) agendamentoEtapas[userId] = {};

    // MENU INICIAL
    if (msg.body.match(/(menu|dia|tarde|noite|oi|olá|ola)/i) && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname || 'cliente';

        await delay(1000);
        await chat.sendStateTyping();
        await delay(1000);

        await client.sendMessage(userId,
            `Olá, ${name.split(" ")[0]}! 👋\nSou o assistente virtual da *HS Barber Shop*.\nComo posso ajudá-lo hoje?\n\nEscolha uma opção:\n\n1️⃣ Corte de Cabelo R$30,00\n2️⃣ Barba R$15,00\n3️⃣ Barba e Cabelo R$45,00`
        );
        return;
    }

    // SERVIÇO ESCOLHIDO (1, 2 ou 3)
    if (['1', '2', '3'].includes(msg.body) && msg.from.endsWith('@c.us')) {
        let servico = '';
        if (msg.body === '1') servico = 'Corte de Cabelo';
        if (msg.body === '2') servico = 'Barba';
        if (msg.body === '3') servico = 'Barba e Cabelo';

        agendamentoEtapas[userId] = {
            etapa: 'horario',
            servico,
        };

        await client.sendMessage(userId, `📅 Qual horário você gostaria de agendar seu *${servico}*? (ex: 15:30)`);
        return;
    }

    // Etapa: aguardando horário
    if (agendamentoEtapas[userId]?.etapa === 'horario') {
        const horarioDesejado = msg.body;
        const servico = agendamentoEtapas[userId].servico;

        // Verifica se o horário já está ocupado
        const agendamentos = await db.collection('agendamentos')
            .where('horario', '==', horarioDesejado)
            .where('servico', '==', servico)
            .get();

        if (!agendamentos.empty) {
            await client.sendMessage(userId, `❌ O horário *${horarioDesejado}* para *${servico}* já está ocupado.\nPor favor, envie outro horário disponível.`);
            return;
        }

        // Se estiver livre, pede o nome
        agendamentoEtapas[userId].horario = horarioDesejado;
        agendamentoEtapas[userId].etapa = 'nome';
        await client.sendMessage(userId, '🧍 Por favor, informe seu nome completo:');
        return;
    }

    // Etapa: aguardando nome
    if (agendamentoEtapas[userId]?.etapa === 'nome') {
        agendamentoEtapas[userId].nome = msg.body;
        agendamentoEtapas[userId].telefone = userId;

        try {
            await db.collection('agendamentos').add({
                nome: agendamentoEtapas[userId].nome,
                horario: agendamentoEtapas[userId].horario,
                telefone: agendamentoEtapas[userId].telefone,
                servico: agendamentoEtapas[userId].servico,
                criado_em: new Date()
            });

            await client.sendMessage(userId,
                `✅ Agendamento confirmado!\n\n🧍 Nome: *${agendamentoEtapas[userId].nome}*\n📅 Horário: *${agendamentoEtapas[userId].horario}*\n✂️ Serviço: *${agendamentoEtapas[userId].servico}*`
            );
        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            await client.sendMessage(userId, '⚠️ Ocorreu um erro ao registrar seu agendamento. Tente novamente mais tarde.');
        }

        delete agendamentoEtapas[userId];
        return;
    }
});