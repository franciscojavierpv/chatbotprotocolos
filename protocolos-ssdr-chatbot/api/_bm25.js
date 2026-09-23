// Motor de busqueda lexica BM25, sin dependencias externas ni base de datos vectorial.
// Se ejecuta en memoria dentro de la funcion serverless en cada consulta.
// Suficiente para un corpus de unos pocos cientos de chunks (nuestro caso: ~360).

const STOPWORDS = new Set([
  "de","la","que","el","en","y","a","los","del","se","las","por","un","para",
  "con","no","una","su","al","lo","como","mas","pero","sus","le","ya","o",
  "este","si","porque","esta","entre","cuando","muy","sin","sobre","tambien",
  "me","hasta","hay","donde","quien","desde","todo","nos","durante","todos",
  "uno","les","ni","contra","otros","ese","eso","ante","ellos","e","esto",
  "mi","antes","algunos","que","unos","yo","otro","otras","otra","el","tanto",
  "esa","estos","mucho","quienes","nada","muchos","cual","poco","ella","estar",
  "estas","algunas","algo","nosotros","es","son","fue","ser","sea","han","ha"
]);

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents
}

function tokenize(text) {
  const norm = normalize(text);
  const words = norm.match(/[a-z0-9]+/g) || [];
  return words.filter(w => w.length > 2 && !STOPWORDS.has(w));
}

let _index = null;

function buildIndex(chunks) {
  const docs = chunks.map(c => {
    const tokens = tokenize(c.texto + " " + c.seccion);
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    return { chunk: c, tokens, tf, len: tokens.length };
  });

  const df = {};
  for (const d of docs) {
    for (const term of Object.keys(d.tf)) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.len, 0) / Math.max(N, 1);

  _index = { docs, df, N, avgdl };
  return _index;
}

function getIndex(chunks) {
  if (!_index) buildIndex(chunks);
  return _index;
}

function search(chunks, query, topK = 8) {
  const idx = getIndex(chunks);
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const k1 = 1.5;
  const b = 0.75;

  const scores = idx.docs.map(d => {
    let score = 0;
    for (const term of qTokens) {
      const f = d.tf[term] || 0;
      if (f === 0) continue;
      const df = idx.df[term] || 0;
      const idf = Math.log(1 + (idx.N - df + 0.5) / (df + 0.5));
      const denom = f + k1 * (1 - b + b * (d.len / idx.avgdl));
      score += idf * ((f * (k1 + 1)) / denom);
    }
    return { chunk: d.chunk, score };
  });

  scores.sort((a, b2) => b2.score - a.score);
  return scores.slice(0, topK).filter(s => s.score > 0);
}

module.exports = { tokenize, search, buildIndex };
