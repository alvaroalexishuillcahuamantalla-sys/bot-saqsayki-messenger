const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ============================================================
// CONFIGURACIÓN
// ============================================================
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'MI_TOKEN_SECRETO_123';
const CARTA_URL = 'https://raw.githubusercontent.com/alvaroalexishuillcahuamantalla-sys/bot-saqsayki/main/carta.jpeg';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// RUTA PARA UPTIMEROBOT (Mantiene al bot despierto)
// ============================================================
app.get('/', (req, res) => {
    res.status(200).send('Bot Saqsayki está encendido y funcionando');
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
        console.error('❌ Error enviando texto:', error.response?.data || error.message);
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
        console.error('❌ Error enviando botones:', error.response?.data || error.message);
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
        console.error('❌ Error enviando imagen:', error.response?.data || error.message);
    }
}

// ============================================================
// LÓGICA DE MENÚS
// ============================================================
function obtenerSaludo() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return "🌅 Buenos días";
    if (hora >= 12 && hora < 19) return "🌤️ Buenas tardes";
    return "🌙 Buenas noches";
}

async function enviarMenuConBotones(senderId) {
    const saludo = obtenerSaludo();
    const menuTexto = `${saludo} ✨\n\n*Bienvenido(a) al Parque Temático Saqsayki*\n\nVive una experiencia única llena de aventura, diversión y naturaleza.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 *Seleccione una opción:*\n\n💬 Escriba *menu* para ver este mensaje nuevamente`;
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
        case '1': texto = `🕒 *HORARIOS*\n📅 Lunes a domingo: 9:30 a.m. a 5:30 p.m.\n🎟️ Ingreso: Adultos S/7, Niños S/4`; break;
        case '2': texto = `💰 *PRECIOS*\n🌊 Acuáticos: S/5 a S/8\n⛰️ Columpio: S/20\n🧗 Circuito: S/20`; break;
        case '3': texto = `🎒 *PAQUETES*\n💦 Acuático S/25\n🧗 Aventurero S/35\n🔥 Full S/45`; break;
        case '4': texto = `📍 *UBICACIÓN*\nA 30 min de Chicana Grande.`; break;
        case '5': await sendImageMessage(senderId, CARTA_URL, `🍽️ *CARTA DEL RESTAURANTE*`); return;
        default: texto = `❌ Opción no válida. Escriba *menu*.`;
    }
    await sendTextMessage(senderId, texto);
    await esperar(500);
    await sendQuickReplies(senderId, "🔙 ¿Volver al menú?", [{ title: "🔙 Volver", payload: "VOLVER_MENU" }]);
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
    if (body.object === 'page') {
        for (const entry of body.entry) {
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    const senderId = event.sender.id;
                    const textoRecibido = event.message?.text?.trim().toLowerCase() || '';
                    const payload = event.message?.quick_reply?.payload;

                    if (['OPCION_1', '1'].includes(payload || textoRecibido)) await enviarInformacion(senderId, '1');
                    else if (['OPCION_2', '2'].includes(payload || textoRecibido)) await enviarInformacion(senderId, '2');
                    else if (['OPCION_3', '3'].includes(payload || textoRecibido)) await enviarInformacion(senderId, '3');
                    else if (['OPCION_4', '4'].includes(payload || textoRecibido)) await enviarInformacion(senderId, '4');
                    else if (['OPCION_5', '5'].includes(payload || textoRecibido)) await enviarInformacion(senderId, '5');
                    else await enviarMenuConBotones(senderId);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
