export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit simples por IP (opcional mas recomendado)
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt inválido' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'Você é um analista financeiro especializado no mercado brasileiro (B3). Responda sempre em português brasileiro, de forma profissional e objetiva. Use markdown para formatar sua resposta.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Groq error: ${err.slice(0, 200)}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Sem resposta.';

    // CORS para seu domínio
    res.setHeader('Access-Control-Allow-Origin', 'https://canalmaisvalor.com.br');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
