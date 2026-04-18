import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/v1/operator/run", async (req, res) => {
  try {
    const { model = "gpt-5.4", system, userPrompt, context } = req.body || {};

    const contextText = [
      `Title: ${context?.title || ""}`,
      `URL: ${context?.url || ""}`,
      `Selection: ${context?.selectionText || ""}`,
      `Visible text: ${context?.visibleText || ""}`
    ].join("\n");

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: system
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Context:\n${contextText}\n\nUser request:\n${userPrompt}`
            }
          ]
        }
      ]
    });

    res.json({
      output_text: response.output_text || "",
      confidence: "medium"
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error?.message || "Server error");
  }
});

app.listen(port, () => {
  console.log(`Operator backend listening on http://localhost:${port}`);
});
