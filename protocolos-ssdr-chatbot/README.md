# Asistente de Protocolos de Referencia y Contrarreferencia — SSDR

Chatbot de consulta sobre **los 40 protocolos** de Referencia y Contrarreferencia
del Servicio de Salud del Reloncaví, a partir del documento PDF consolidado
(705 páginas, múltiples especialidades y ediciones desde 2010 hasta 2025).

> **Nota:** esta versión usa la API gratuita de **Google Gemini** en vez de
> Claude, específicamente para poder desplegarse sin costo. Por eso no se
> puede probar dentro del entorno de Claude.ai como la demo anterior — el
> sandbox de artifacts de Claude.ai solo autentica automáticamente contra
> la API de Anthropic, no contra la de Google. Hay que desplegarla (ver
> abajo) para probarla.

## Cómo está armado

```
protocolos-ssdr-chatbot/
├── public/
│   └── index.html         ← Interfaz del chat
├── api/
│   ├── chat.js             ← Función serverless: busca los fragmentos
│   │                          relevantes (BM25) y llama a Gemini con ellos
│   └── _bm25.js             ← Motor de búsqueda léxica (sin dependencias
│                               externas, sin base de datos vectorial)
├── data/
│   ├── chunks.json          ← ~357 fragmentos del corpus completo, con
│   │                            metadatos (sección, páginas, confianza)
│   └── labels.json          ← Lista de las 36 secciones/protocolos detectados
├── REPORTE_CALIDAD_EXTRACCION.md  ← Qué secciones son confiables y cuáles
│                                      necesitan revisión manual
├── vercel.json
├── package.json
├── .env.example
└── .gitignore
```

## Cambio de arquitectura frente al piloto de Urología

Con un solo protocolo (Urología), cabía todo el contenido en el `system prompt`
de cada llamada. Con 40 protocolos (~240.000 tokens de texto) eso ya no es
posible ni conveniente. Por eso esta versión usa **RAG real**:

1. El documento se dividió en ~357 fragmentos (`chunks`) de ~550 palabras.
2. Cuando alguien pregunta algo, el backend busca —**dentro de la misma
   función serverless, en memoria, sin servicios externos**— los 8
   fragmentos más relevantes usando **BM25** (un algoritmo de búsqueda por
   relevancia léxica, el mismo tipo de scoring que usan buscadores como
   Elasticsearch).
3. Solo esos 8 fragmentos (no los 357) se envían al modelo junto con la
   pregunta, lo que mantiene el tamaño del prompt y la latencia bajos.

No se usó una base de datos vectorial (Pinecone, pgvector, etc.) ni una API
de embeddings porque, con unos pocos cientos de fragmentos, la búsqueda
léxica en memoria es suficiente y evita agregar otro servicio con su propia
cuenta y costos. Si más adelante el corpus crece mucho o la calidad de
búsqueda no es suficiente (por ejemplo, si la gente pregunta con sinónimos
que no aparecen literalmente en el texto), el siguiente paso natural es
migrar a embeddings + una base vectorial.

## ⚠️ Calidad de la extracción — leer antes de usar en producción

El PDF consolidado no tiene formato uniforme: mezcla texto nativo con
**páginas escaneadas** (flujogramas, resoluciones administrativas firmadas)
que se procesaron con OCR. La calidad de esa extracción es variable.

- **287 de 357 fragmentos** son de confianza "alta" (texto nativo o OCR limpio).
- **59 fragmentos** son de confianza "baja" (zonas con mucho ruido de OCR).
- El chatbot está instruido para **advertir explícitamente** cuando la única
  información disponible para responder proviene de una zona de baja
  confianza, en vez de presentarla como si fuera certera.

Revisa `REPORTE_CALIDAD_EXTRACCION.md` para ver el detalle exacto de qué
sección cae en cada categoría, con su rango de páginas en el PDF original.

**Antes de usar esto en producción real** (más allá de un piloto interno),
recomendamos:
1. Priorizar la revisión manual de las secciones marcadas como "baja confianza".
2. Para las especialidades más consultadas o críticas, repetir el proceso que
   se hizo con Urología: conseguir el documento fuente de esa especialidad
   por separado (Word idealmente) y reemplazar su chunk automático en
   `data/chunks.json` por una versión estructurada a mano.

## Proveedor del modelo: Gemini (capa gratuita), no Claude

Esta versión llama a la **API de Google Gemini** en vez de a la API de
Anthropic, específicamente para poder operar **sin costo**, dentro de la
capa gratuita de Gemini (no requiere tarjeta de crédito). El hosting en
Vercel ya era gratuito de por sí — el cambio real es el proveedor del
modelo de lenguaje.

- **Modelo usado:** `gemini-2.5-flash-lite` (el que tiene mayor límite de
  solicitudes por minuto en la capa gratuita). Se puede cambiar a
  `gemini-2.5-flash` (algo más capaz, pero con límite más bajo) editando la
  constante `GEMINI_MODEL` al inicio de `api/chat.js`.
- **Límites de la capa gratuita** (pueden cambiar — revisa
  [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)
  para los valores vigentes): del orden de 10-15 solicitudes por minuto y
  varios cientos de solicitudes por día. Para el uso de un equipo interno
  (consultas ocasionales, no cientos de usuarios simultáneos) esto suele
  ser más que suficiente.
- **Importante — uso de datos:** en la capa gratuita, Google puede usar el
  contenido de las consultas para mejorar sus productos (a diferencia de la
  capa de pago, donde no lo hace). Dado que este corpus son protocolos
  clínicos institucionales (sin datos de pacientes), el riesgo es bajo, pero
  vale la pena tenerlo presente y confirmarlo en los términos vigentes de
  Google antes de un uso institucional más amplio:
  [ai.google.dev/gemini-api/terms](https://ai.google.dev/gemini-api/terms).
- Si más adelante el uso institucional crece y los límites gratuitos quedan
  cortos, Gemini permite habilitar facturación en el mismo proyecto de
  Google Cloud sin cambiar de proveedor — solo se cobra lo que exceda la
  cuota gratuita.

## Desplegar en Vercel

1. Consigue una API key gratuita de Gemini en
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   (inicia sesión con una cuenta Google, click "Create API key" — no pide
   tarjeta de crédito).
2. Sube esta carpeta a un repositorio de GitHub.
3. Impórtalo en [vercel.com/new](https://vercel.com/new).
4. En **Environment Variables**, agrega `GEMINI_API_KEY` con tu key.
5. Deploy. En 1-2 minutos tendrás una URL pública funcionando, sin costo.

## Probarlo localmente

```bash
npm install -g vercel
cd protocolos-ssdr-chatbot
cp .env.example .env
# Edita .env y pega tu API key real de Gemini
vercel dev
```

## Actualizar o corregir el contenido

Todo el corpus vive en `data/chunks.json`, un array de objetos:

```json
{
  "id": "c0042",
  "seccion": "Oftalmología – Catarata",
  "pagina_inicio": 15,
  "pagina_fin": 34,
  "confianza": "alta",
  "texto": "..."
}
```

Para corregir un fragmento con errores de OCR, edita su `texto` directamente.
Para reemplazar una sección completa con una versión mejor estructurada
(como se hizo con Urología), agrega nuevos objetos con `confianza: "alta"`
y el `seccion` correspondiente — no hace falta borrar los antiguos, la
búsqueda simplemente preferirá los más relevantes por densidad de términos.

Después de editar `chunks.json`, vuelve a desplegar (`vercel --prod`, o
automático si tu repo está conectado a Vercel).

## Costos y límites

Con Gemini en su capa gratuita, el costo de la API es $0 mientras el uso se
mantenga dentro de los límites de solicitudes por minuto/día mencionados
arriba. Cada consulta envía ~8 fragmentos (~4.000-5.000 palabras de
contexto) en vez del protocolo completo, lo que ayuda a mantener las
respuestas rápidas. Si el equipo crece mucho en número de usuarios
simultáneos, revisa los límites vigentes en
[ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)
y considera restringir el acceso al sitio (login institucional o
contraseña) en vez de dejarlo público sin control — tanto por seguridad
como para no agotar la cuota gratuita compartida.

## Seguridad y alcance

- Este prototipo no debe conectarse a datos identificables de pacientes sin
  revisión de cumplimiento (Ley 19.628) ni sin pasar por infraestructura
  institucional gestionada por TI del SSDR.
- El chatbot está diseñado para orientar sobre contenido de protocolos, no
  para decidir casos clínicos individuales — reforzar esto en la
  capacitación de quienes lo usen.
