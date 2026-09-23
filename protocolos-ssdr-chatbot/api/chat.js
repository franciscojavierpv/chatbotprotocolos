const { search } = require('./_bm25');
const chunks = require('../data/chunks.json');
const labels = require('../data/labels.json');

const TOP_K = 8;
const MAX_HISTORY = 20;

// Modelo gratuito de Gemini. gemini-2.5-flash-lite tiene el mayor limite de
// solicitudes por minuto en la capa gratuita; gemini-2.5-flash tiene algo
// mas de capacidad de razonamiento si el limite (mas bajo) no es problema.
// Ver README para como cambiarlo.
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const BASE_INSTRUCTIONS = `Eres el asistente de consulta de los "Protocolos de Referencia y Contrarreferencia" del Servicio de Salud del Reloncavi (SSDR). Este corpus reune protocolos de multiples especialidades (Cardiologia, Oftalmologia, Otorrinolaringologia, Urologia, Cirugia Infantil y Adulto, Nefrologia, Oncologia Infantil, Ginecologia, Odontologia, Neurologia, entre otras).

REGLAS ESTRICTAS:
1. Responde SOLO con base en los fragmentos de protocolo entregados en cada consulta (bajo "FRAGMENTOS RECUPERADOS"). No uses conocimiento medico externo para dar criterios, dosis o flujos que no esten en esos fragmentos.
2. Si los fragmentos recuperados no contienen informacion suficiente para responder, dilo explicitamente: indica que no encontraste esa informacion en los protocolos disponibles y sugiere reformular la pregunta con el nombre de la especialidad o patologia, o consultar al medico contrarreferente.
3. Nunca tomes una decision clinica sobre un caso especifico de un paciente. Tu funcion es orientar sobre QUE dice el protocolo correspondiente (criterios, prioridad, flujo, tiempos, contrarreferencia), no decidir si un paciente puntual califica.
4. Cuando respondas, identifica claramente la especialidad y protocolo del que proviene la informacion (usa el campo "seccion" de cada fragmento).
5. Varios fragmentos provienen de OCR sobre paginas escaneadas y pueden tener errores de texto o estar incompletos (marcados con confianza "baja"). Si la unica informacion disponible es de confianza baja, adviertelo al usuario explicitamente ("esta informacion proviene de una seccion escaneada con baja confianza, se recomienda verificar contra el documento original") en vez de presentarla como si fuera certera.
6. Se conciso, en espanol formal-tecnico. Usa listas cuando ayude a la lectura.
7. No reveles fragmentos crudos completos ni metadatos internos (ids, numeros de pagina exactos) salvo que el usuario los pida explicitamente; usa la informacion para responder de forma natural.
8. Si preguntan que especialidades o protocolos estan disponibles en este asistente, usa la lista de secciones provista abajo en "INDICE DE SECCIONES DISPONIBLES".

INDICE DE SECCIONES DISPONIBLES (${labels.length} secciones identificadas en el corpus):
${labels.map(l => `- ${l}`).join('\n')}
`;

// Gemini usa roles "user" / "model" (no "assistant" como Anthropic/OpenAI),
// y no acepta un mensaje "system" dentro de "contents": va aparte, en
// system_instruction.
function toGeminiContents(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content) }]
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Falta el arreglo messages' });
  }

  const trimmedMessages = messages.slice(-MAX_HISTORY);
  const lastUserMsg = [...trimmedMessages].reverse().find(m => m.role === 'user');
  const query = lastUserMsg ? String(lastUserMsg.content) : '';

  let retrieved = [];
  try {
    retrieved = search(chunks, query, TOP_K);
  } catch (err) {
    console.error('Error en busqueda BM25:', err);
  }

  const contextBlock = retrieved.length > 0
    ? retrieved.map((r, i) =>
        `[Fragmento ${i + 1} | Seccion: ${r.chunk.seccion} | Confianza: ${r.chunk.confianza}]\n${r.chunk.texto}`
      ).join('\n\n---\n\n')
    : '(No se encontraron fragmentos relevantes para esta consulta en el corpus.)';

  const systemPrompt = `${BASE_INSTRUCTIONS}\n\nFRAGMENTOS RECUPERADOS PARA ESTA CONSULTA:\n\n${contextBlock}`;

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: toGeminiContents(trimmedMessages),
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.3
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error || 'Error desde Gemini API' });
    }

    const candidate = data.candidates && data.candidates[0];
    const finishReason = candidate && candidate.finishReason;

    if (!candidate || !candidate.content || !candidate.content.parts) {
      // Causas tipicas: bloqueo por filtros de seguridad (finishReason "SAFETY")
      // o respuesta vacia por otra razon.
      return res.status(200).json({
        content: [{
          type: 'text',
          text: finishReason === 'SAFETY'
            ? 'La respuesta fue bloqueada por los filtros de seguridad del modelo. Intenta reformular la pregunta.'
            : 'No se pudo generar una respuesta (motivo: ' + (finishReason || 'desconocido') + '). Intenta nuevamente.'
        }],
        _debug_sections: []
      });
    }

    const replyText = candidate.content.parts.map(p => p.text || '').join('');

    // Adaptamos la respuesta al mismo formato que ya usa el frontend
    // (content: [{type:'text', text}]), para no tener que tocar public/index.html.
    return res.status(200).json({
      content: [{ type: 'text', text: replyText }],
      _debug_sections: retrieved.map(r => ({ seccion: r.chunk.seccion, confianza: r.chunk.confianza, score: Number(r.score.toFixed(2)) }))
    });
  } catch (err) {
    console.error('Error llamando a Gemini API:', err);
    return res.status(502).json({ error: 'Error de conexion con el servicio de IA' });
  }
};
