require("dotenv").config();
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.urlencoded({ extended: true })); // Twilio sends form-encoded data
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.1-flash-lite";

// ---------------------------------------------------------
// KNOWN CONTACTS — friendly/open mode + personalized greeting
// ---------------------------------------------------------
const KNOWN_CONTACTS = {
  "+50947282804": "Jeff",
  "+50935228726": "Mystal",
};

// ---------------------------------------------------------
// SYSTEM PROMPTS
// ---------------------------------------------------------
const HOTEL_ASSISTANT_PROMPT = `You are the AI customer service assistant for a hotel in Haiti.

HOTEL FACTS (use these, don't invent different ones):
- Check-in: 3:00pm. Check-out: 11:00am.
- Amenities: outdoor pool, 24-hour fitness center, on-site restaurant open 7am-11pm, rooftop bar, spa (by appointment).
- Room types: Standard ($120/night), Deluxe ($160/night), Suite ($220/night) — mention prices can vary by season/availability.
- Payment: cash (USD or HTG), credit card, MonCash.
- Booking: for actual reservations, collect their name, dates, room type preference, and tell them the front desk will confirm availability and send payment details.

YOUR BEHAVIOR:
- Trilingual: respond fluently in whichever language or mix the guest uses — Haitian Creole, French, or English. Match their language naturally.
- Be warm, professional, and efficient — like a helpful front-desk person texting on WhatsApp. Short, natural messages.
- If asked something outside your knowledge, say you'll confirm and have someone follow up — don't invent specifics.
- Never mention you are an AI model, or name any AI company. You are simply "the assistant" for the hotel.`;

const FRIENDLY_OPEN_PROMPT = `You are a warm, easygoing, genuinely conversational assistant. There is no business context here — just talk naturally about whatever the person brings up, like a smart friend texting back. Be direct, casual, and real. Match their tone and language (English, French, or Haitian Creole, whichever they use). No corporate phrasing, no forced positivity, no disclaimers about being an AI unless directly asked.`;

// ---------------------------------------------------------
// In-memory conversation history (resets if server restarts)
// ---------------------------------------------------------
const conversationHistory = {};
const MAX_HISTORY_TURNS = 10;

function getHistory(number) {
  if (!conversationHistory[number]) conversationHistory[number] = [];
  return conversationHistory[number];
}

function trimHistory(history) {
  const maxMessages = MAX_HISTORY_TURNS * 2;
  if (history.length > maxMessages) {
    history.splice(0, history.length - maxMessages);
  }
}

// ---------------------------------------------------------
// MAIN WEBHOOK — Twilio calls this every time a message comes in
// ---------------------------------------------------------
app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body;
  const fromNumber = req.body.From?.replace("whatsapp:", "");

  console.log(`Message from ${fromNumber}: ${incomingMsg}`);

  const knownName = KNOWN_CONTACTS[fromNumber];
  const isKnownContact = Boolean(knownName);

  let systemPrompt = isKnownContact ? FRIENDLY_OPEN_PROMPT : HOTEL_ASSISTANT_PROMPT;

  const history = getHistory(fromNumber);

  // First message from a known contact: bake in the name so it greets them naturally
  if (history.length === 0 && isKnownContact) {
    systemPrompt += `\n\nThe person you're talking to is named ${knownName}. Greet them by name naturally in your first reply.`;
  }

  // Build the conversation contents for Gemini (role: "user" | "model")
  const contents = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));
  contents.push({ role: "user", parts: [{ text: incomingMsg }] });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const replyText = response.text;

    // Save to history
    history.push({ role: "user", content: incomingMsg });
    history.push({ role: "assistant", content: replyText });
    trimHistory(history);

    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${escapeXml(replyText)}</Message>
      </Response>
    `);
  } catch (err) {
    console.error("Error calling Gemini:", err.message);
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>Padon, gen yon ti pwoblèm kounye a. Tanpri eseye ankò.</Message>
      </Response>
    `);
  }
});

// Health check route
app.get("/", (req, res) => {
  res.send("Jarvis server is running.");
});

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis server listening on port ${PORT}`);
});
