// Imports Express framework to handle /predict route
const express = require("express");
// Imports OpenAI SDK
const OpenAI = require("openai");
// Loads .env file
require("dotenv").config();
// Creates Expression app instance
const app = express();
// Allows server to read JSON requests
app.use(express.json());
// Allows for delivery of files to browser w/o modification
app.use(express.static("frontend"));

// OpenAI client creation w/ key from env file
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Handles post requests returning OpenAI results
// by creating API endpoint, also using async to wait for OpenAI response
app.post("/predict", async (req, res) => {

    // Reads JSON from browser
    const userText = req.body.text;

    // OpenAI API call to create a list of next likely words
    const response =
        await client.chat.completions.create({
            model: "gpt-5.4",
            messages: [
                {
                    role: "user",
                    content: userText
                }
            ],
    max_completion_tokens: 6,
    logprobs: true,
    top_logprobs: 5
        });

    // Sends data to browser in JSON format
    res.json({
        // probability of responses
        result: response.choices[0].logprobs.content[0].top_logprobs
    });
});

// Start server on port 3000
app.listen(3000, () => {
    console.log("Server running on port 3000");
});