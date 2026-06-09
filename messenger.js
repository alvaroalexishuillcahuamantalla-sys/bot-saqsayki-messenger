const express = require('express');
const axios = require('axios');

const app = express();
// ESTO ES LO QUE FALTABA: Sin esto, Facebook envía mensajes y el servidor los ignora
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
// FUNCIONES DE UTILIDAD (FORMATO ORIGINAL)
// ============================================================
function obtenerSaludo() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return "🌅 Buenos días";
    if (hora >= 12 && hora < 19) return "🌤️ Buenas tardes";
    return "🌙 Buenas noches";
}

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
// MENÚS (FORMATO ORIGINAL MANTENIDO)
// ============================================================
async function enviarMenuConBotones(senderId) {
    const saludo = obtenerSaludo();
    const menuTexto = `${saludo} ✨\n\n*Bienvenido(a) al Parque Temático Saqsayki*\n\nVive una experiencia única llena de aventura, diversión y naturaleza.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 *Seleccione una opción:*\n\n💬 Escriba *menu* para ver este mensaje nuevamente\n\n📍 *Saqsayki - Tu mejor experiencia*`;

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
    await esperar(500);
    let texto = '';
    switch (opcion) {
        case '1':
            texto = `🕒 *HORARIOS*\n📅 Lunes a domingo: 9:30 a.m. a 5:30 p.m.\n🎟️ Ingreso: Adultos S/7, Niños S/4\n✅ Incluye zonas temáticas y miradores.`;
            break;
        case '2':
            texto = `💰 *PRECIOS UNITARIOS*\n🌊 Acuáticos: S/5 a S/8\n⛰️ Columpio Extremo: S/20\n🧗 Circuito 21 obstáculos: S/20`;
            break;
        case '3':
            texto = `🎒 *PAQUETES*\n💦 Acuático S/25\n🧗 Aventurero S/35\n🔥 Full S/45`;
            break;
        case '4':
            texto = `📍 *UBICACIÓN*\nA 30 min de Chicana Grande. Taxis: 926 050 769, 991 972 382`;
            break;
        case '5':
            await sendImageMessage(senderId, CARTA_URL, `🍽️ *CARTA DEL RESTAURANTE*\nAquí nuestra carta. ¿Consultas? Escríbenos.`);
            return;
        default:
            texto = `❌ Opción no válida. Escriba *menu*.`;
    }
    await sendTextMessage(senderId, texto);
    await esperar(1000);
    await sendQuickReplies(senderId, "🔙 ¿Volver al menú principal?", [{ title: "🔙 Volver", payload: "VOLVER_MENU" }]);
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
            for (const event of entry.messaging) {
                const senderId = event.sender.id;
                const textoRecibido = event.message?.text?.trim().toLowerCase() || '';
                const payload = event.message?.quick_reply?.payload;

                if (payload === 'OPCION_1' || textoRecibido === '1') await enviarInformacion(senderId, '1');
                else if (payload === 'OPCION_2' || textoRecibido === '2') await enviarInformacion(senderId, '2');
                else if (payload === 'OPCION_3' || textoRecibido === '3') await enviarInformacion(senderId, '3');
                else if (payload === 'OPCION_4' || textoRecibido === '4') await enviarInformacion(senderId, '4');
                else if (payload === 'OPCION_5' || textoRecibido === '5') await enviarInformacion(senderId, '5');
                else if (payload === 'VOLVER_MENU' || textoRecibido === 'menu') await enviarMenuConBotones(senderId);
                else await enviarMenuConBotones(senderId);
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
