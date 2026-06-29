// Imports Express framework to handle /predict route
const express = require("express");

// Imports OpenAI SDK
const OpenAI = require("openai");

// Loads .env file
require("dotenv").config();

// Creates Express app instance
const app = express();

// Allows server to read JSON requests
app.use(express.json());

// Allows delivery of files to browser without modification
app.use(express.static("frontend"));

// OpenAI client creation with key from env file
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Handles POST requests returning OpenAI results
// by creating API endpoint, also using async to wait for OpenAI response
app.post("/predict", async (req, res) => {

    // Reads JSON from browser
    const userText = req.body.text;

    // Reads slider values from browser
    const temperature = req.body.temperature;
    const topK = req.body.topK;

    // Prints slider values to terminal

    console.log(
        "Temperature:",
        temperature,
        "Top-K:",
        topK
    );

    // OpenAI API call to create a list of likely next words
    const response =
        await client.chat.completions.create({
            model: "gpt-5.4",

            messages: [
                {
                    role: "system",
                    content:
                        `Given the user's text, return exactly ${topK} likely next whole words with estimated probabilities. The probabilities must add up to 100. Return only valid JSON like this: [{"word":"example","probability":40}]`
                },
                {
                    role: "user",
                    content: userText
                }
            ],

            temperature: temperature,

            max_completion_tokens: 300
        });

    // Converts model JSON output into JavaScript objects
    const words = JSON.parse(
        response.choices[0].message.content
    );

    console.log("Number of words returned:", words.length);

    // Prints the words and probabilities to the terminal
    console.log(words);

    // Sends data to browser in JSON format
    res.json({
        result: words
    });
});

// Handles spin button requests
app.post("/spin", (req, res) => {

    // Reads probabilities from request body
    const probabilities = req.body.probabilities;

    // Checks that probabilities were sent
    if (!probabilities || probabilities.length === 0) {
        return res.json({
            success: false,
            message: "No probabilities were provided"
        });
    }

    // Simulates a spinner using a random number from 0 to 100
    const randomNumber = Math.random() * 100;

    let cumulative = 0;
    let winningWord =
        probabilities[probabilities.length - 1].word;

    for (const item of probabilities) {
        cumulative += item.probability;

        if (randomNumber <= cumulative) {
            winningWord = item.word;
            break;
        }
    }

    // Prints result in terminal
    console.log("Spin endpoint called");
    console.log("Probabilities:", probabilities);
    console.log("Random number:", randomNumber);
    console.log("Winning word:", winningWord);

    // Sends result back
    res.json({
        success: true,
        winningWord: winningWord,
        randomNumber: randomNumber
    });
});

function createTemperatureProbabilities(words, temperature) {
    const r = Math.pow(2, -1 + temperature / 2);

    const weights = words.map((_, index) => {
        return Math.pow(r, index);
    });

    const totalWeight = weights.reduce(
        (sum, weight) => sum + weight,
        0
    );

    return words.map((item, index) => ({
        word: item.word,
        probability:
            Number(
                ((weights[index] / totalWeight) * 100).toFixed(2)
            )
    }));
}

/* example API call for next words:
curl -X POST "http://localhost:3000/api/next-words" \
  -H "Content-Type: application/json" \
  -d '{"text":"The dog ran to the","temperature":1.0,"k":10}'
*/

app.post("/api/next-words", async (req, res) => {
    try {
        const text = req.body.text;
        const temperature = Number(req.body.temperature);
        const k = Number(req.body.k);

        if (!text || typeof text !== "string") {
            return res.status(400).json({
                success: false,
                error: "text must be a non-empty string"
            });
        }

        if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
            return res.status(400).json({
                success: false,
                error: "temperature must be a number from 0 to 2"
            });
        }

        if (!Number.isInteger(k) || k < 1 || k > 30) {
            return res.status(400).json({
                success: false,
                error: "k must be an integer from 1 to 30"
            });
        }

        const response =
            await client.chat.completions.create({
                model: "gpt-5.4",

                messages: [
                    {
                        role: "system",
                        content:
                            `Given the user's text, return exactly ${k} likely next whole words. Return only valid JSON like this: [{"word":"example"}]`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],

                max_completion_tokens: 300
            });

        const rawWords = JSON.parse(
            response.choices[0].message.content
        );

        const words =
            createTemperatureProbabilities(
                rawWords,
                temperature
            );

        res.json({
            success: true,
            input: text,
            temperature: temperature,
            k: k,
            words: words
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Something went wrong"
        });
    }
});

app.post("/api/word-embeddings", async (req, res) => {
    const text = req.body.text;

    const words = text
        .trim()
        .split(/\s+/);

    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: words
    });

    const embeddings = response.data.map((item, index) => ({
        word: words[index],
        embedding: item.embedding
    }));

    res.json({
        input: text,
        words: embeddings
    });
});

app.post("/api/axis-map", async (req, res) => {
    try {
        const text = req.body.text;

        const response =
            await client.chat.completions.create({
                model: "gpt-5.4",
                messages: [
                    {
                        role: "system",
                        content:
                            "Given a user's text, choose two meaningful conceptual axes for plotting the important words. Return only valid JSON in this format: {\"xAxis\":\"axis name\",\"yAxis\":\"axis name\",\"points\":[{\"word\":\"example\",\"x\":0.5,\"y\":-0.2}]}. Values must be between -1 and 1."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_completion_tokens: 300
            });

        const axisMap = JSON.parse(
            response.choices[0].message.content
        );

        res.json({
            success: true,
            axisMap: axisMap
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Could not create axis map"
        });
    }
});


/*

Can run this on terminal to test spin endpoint:

curl -X POST "http://localhost:3000/spin" \
  -H "Content-Type: application/json" \
  -d '{"probabilities":[{"word":"dog","probability":50},{"word":"cat","probability":30},
  {"word":"bird","probability":20}]}'

*/

// Handles continue button requests
app.post("/continue", (req, res) => {

    // Prints message to terminal
    console.log("Continue button pressed");

    // Sends success response to browser
    res.json({
        success: true,
        name: "carlos"
    });
});

app.post("/api/concept-graph", async (req, res) => {
    try {
        const text = req.body.text;

        const response =
            await client.chat.completions.create({
                model: "gpt-5.4",
                messages: [
                    {
                        role: "system",
                        content:
                            "Given the user's text, choose one intuitive conceptual vertical axis, then assign each important word a score from -1 to 1 on that axis. Return only valid JSON like this: {\"yAxis\":\"temperature\",\"words\":[{\"word\":\"sun\",\"score\":0.9},{\"word\":\"ice\",\"score\":-0.9},{\"word\":\"fire\",\"score\":1.0}]}"
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_completion_tokens: 300
            });

        const conceptGraph = JSON.parse(
            response.choices[0].message.content
        );

        res.json({
            success: true,
            conceptGraph: conceptGraph
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Could not create concept graph"
        });
    }
});

// Start server on port 3000
app.listen(3000, () => {
    console.log("Server running on port 3000");
});