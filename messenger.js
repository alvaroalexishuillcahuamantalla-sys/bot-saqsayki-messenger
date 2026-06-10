const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ============================================================
// CONFIGURACIÓN (Variables se configuran en Render)
// ============================================================
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'MI_TOKEN_SECRETO_123';
const CARTA_URL = 'https://raw.githubusercontent.com/alvaroalexishuillcahuamantalla-sys/bot-saqsayki/main/carta.jpeg';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// RUTA DE SALUD (Para UptimeRobot)
// ============================================================
app.get('/', (req, res) => {
    res.status(200).send('Bot Saqsayki está activo');
});

// ============================================================
// FUNCIONES DE ENVÍO
// ============================================================
async function sendTextMessage(senderId, texto) {
    if (!PAGE_ACCESS_TOKEN) return;
    try {
        await axios.post(`https://graph.facebook.com/v25.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderId },
            messaging_type: "RESPONSE",
            message: { text: texto }
        });
    } catch (error) {
        console.error('❌ Error enviando texto:', error.response?.data?.error || error.message);
    }
}

async function sendQuickReplies(senderId, texto, opciones) {
    if (!PAGE_ACCESS_TOKEN) return;
    const quickReplies = opciones.map(op => ({
        content_type: "text",
        title: op.title.substring(0, 20),
        payload: op.payload
    }));
    try {
        await axios.post(`https://graph.facebook.com/v25.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderId },
            messaging_type: "RESPONSE",
            message: { text: texto, quick_replies: quickReplies }
        });
    } catch (error) {
        console.error('❌ Error enviando botones:', error.response?.data?.error || error.message);
    }
}

async function sendImageMessage(senderId, imageUrl, caption) {
    if (!PAGE_ACCESS_TOKEN) return;
    try {
        await axios.post(`https://graph.facebook.com/v25.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderId },
            messaging_type: "RESPONSE",
            message: {
                attachment: {
                    type: "image",
                    payload: { url: imageUrl, is_reusable: true }
                }
            }
        });
        if (caption) {
            await esperar(500);
            await sendTextMessage(senderId, caption);
        }
    } catch (error) {
        console.error('❌ Error enviando imagen:', error.response?.data?.error || error.message);
    }
}

// ============================================================
// LÓGICA DE MENÚS
// ============================================================
async function enviarMenuConBotones(senderId) {
    const hora = new Date().getHours();
    const saludo = (hora >= 6 && hora < 12) ? "🌅 Buenos días" : (hora >= 12 && hora < 19) ? "🌤️ Buenas tardes" : "🌙 Buenas noches";
    
    const menuTexto = `${saludo} ✨\n\n*Bienvenido(a) al Parque Temático Saqsayki*\n\n📌 *Seleccione una opción:*`;
    const opciones = [
        { title: "🕒 Horarios", payload: "OPCION_1" },
        { title: "💰 Precios", payload: "OPCION_2" },
        { title: "🎒 Paquetes", payload: "OPCION_3" },
        { title: "📍 Ubicación", payload: "OPCION_4" },
        { title: "🍽️ Restaurante", payload: "OPCION_5" }
    ];
    await sendQuickReplies(senderId, menuTexto, opciones);
}

async function enviarInformacion(senderId, opcion) {
    let texto = '';
    switch (opcion) {
        case '1': texto = `🕒 *HORARIOS*\n📅 Lunes a domingo: 9:30 a.m. a 5:30 p.m.`; break;
        case '2': texto = `💰 *PRECIOS*\n🌊 Acuáticos: S/5-S/8 | ⛰️ Columpio: S/20 | 🧗 Circuito: S/20`; break;
        case '3': texto = `🎒 *PAQUETES*\n💦 Acuático S/25 | 🧗 Aventurero S/35 | 🔥 Full S/45`; break;
        case '4': texto = `📍 *UBICACIÓN*\nA 30 min de Chicana Grande.`; break;
        case '5': await sendImageMessage(senderId, CARTA_URL, `🍽️ *CARTA*`); return;
        default: texto = `❌ Opción no válida.`;
    }
    await sendTextMessage(senderId, texto);
}

// ============================================================
// WEBHOOKS
// ============================================================
app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    const body = req.body;
    
    // Log para depurar: verás esto en Render cuando alguien escriba al bot
    console.log('📥 Evento recibido:', JSON.stringify(body, null, 2));

    if (body.object === 'page') {
        // Respondemos inmediatamente para cumplir con el tiempo de Meta
        res.status(200).send('EVENT_RECEIVED');

        for (const entry of body.entry) {
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    const senderId = event.sender.id;
                    const textoRecibido = event.message?.text?.trim().toLowerCase() || '';
                    const payload = event.message?.quick_reply?.payload;

                    const opcion = payload || textoRecibido;
                    if (['1', 'OPCION_1'].includes(opcion)) await enviarInformacion(senderId, '1');
                    else if (['2', 'OPCION_2'].includes(opcion)) await enviarInformacion(senderId, '2');
                    else if (['3', 'OPCION_3'].includes(opcion)) await enviarInformacion(senderId, '3');
                    else if (['4', 'OPCION_4'].includes(opcion)) await enviarInformacion(senderId, '4');
                    else if (['5', 'OPCION_5'].includes(opcion)) await enviarInformacion(senderId, '5');
                    else await enviarMenuConBotones(senderId);
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
