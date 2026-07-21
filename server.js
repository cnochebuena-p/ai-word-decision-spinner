const express = require("express");
const path = require("path");
const OpenAI = require("openai");

require("dotenv").config();

const app = express();

app.use(express.json());

const publicFolder = path.join(__dirname, "public");

console.log("Current working directory:", process.cwd());
console.log("Server directory:", __dirname);
console.log("Looking for frontend files in:", publicFolder);
console.log(
    "Looking for index.html at:",
    path.join(publicFolder, "index.html")
);

app.use(express.static(publicFolder));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(publicFolder, "index.html"),
        error => {
            if (error) {
                console.error(
                    "Could not send index.html:",
                    error.message
                );

                res.status(error.statusCode || 500).send(
                    `Could not find index.html at ${path.join(
                        publicFolder,
                        "index.html"
                    )}`
                );
            }
        }
    );
});

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
    const topN = req.body.topN;

    // Prints slider values to terminal

    console.log(
        "Temperature:",
        temperature,
        "Top-N:",
        topN
    );

    // OpenAI API call to create a list of likely next words
    const response =
        await client.chat.completions.create({
            model: "gpt-5.4",

            messages: [
                {
                    role: "system",
                    content:
                        `Given the user's text, return exactly ${topN} likely next whole words with estimated probabilities. The probabilities must add up to 100. Return only valid JSON like this: [{"word":"example","probability":40}]`
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

function dotProduct(a, b) {
    let sum = 0;

    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }

    return sum;
}

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
  -d '{"text":"The dog ran to the","temperature":1.0,"topN":10}'
*/

app.post("/api/next-words", async (req, res) => {
    try {
        const text = req.body.text;
        const temperature = Number(req.body.temperature);
        const topN = Number(req.body.topN);

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

        if (!Number.isInteger(topN) || topN < 1 || topN > 30) {
            return res.status(400).json({
                success: false,
                error: "topN must be an integer from 1 to 30"
            });
        }

        const response =
            await client.chat.completions.create({
                model: "gpt-5.4",

                messages: [
                    {
                        role: "system",
                        content:
                            `Given the user's text, return exactly ${topN} likely next whole words. Return only valid JSON like this: [{"word":"example"}]`
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
            topN: topN,
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

function cosineSimilarity(a, b) {

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dot / (
        Math.sqrt(normA) *
        Math.sqrt(normB)
    );
}

app.post("/api/custom-axis-map", async (req, res) => {
    const metric = req.body.metric || "cosine";
    try {
        const text = req.body.text;
        const xAxis = req.body.xAxis;
        const yAxis = req.body.yAxis;

        const words = text.trim().split(/\s+/);

        const inputs = [
            ...words,
            xAxis,
            yAxis
        ];

        const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: inputs
        });

        const wordEmbeddings = response.data
            .slice(0, words.length);

        const xAxisEmbedding =
            response.data[words.length].embedding;

        const yAxisEmbedding =
            response.data[words.length + 1].embedding;

        const points = wordEmbeddings.map((item, index) => ({
            word: words[index],

            x: similarityFunction(
                item.embedding,
                xAxisEmbedding
            ),

            y: similarityFunction(
                item.embedding,
                yAxisEmbedding
            )
        }));

        res.json({
            success: true,
            xAxis: xAxis,
            yAxis: yAxis,
            points: points
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Could not create custom axis map"
        });
    }
});

app.post("/api/embedding-concept-graph", async (req, res) => {
    try {
        const text = req.body.text;

        const axisResponse =
            await client.chat.completions.create({
                model: "gpt-5.4",
                messages: [
                    {
                        role: "system",
                        content:
                            "Given the user's text, choose one intuitive concept axis for comparing the important words. Return only valid JSON like this: {\"axis\":\"temperature\"}"
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_completion_tokens: 100
            });

        const axisData = JSON.parse(
            axisResponse.choices[0].message.content
        );

        const axis = axisData.axis;

        const words = text.trim().split(/\s+/);

        const inputs = [
            ...words,
            axis
        ];

        const embeddingResponse =
            await client.embeddings.create({
                model: "text-embedding-3-small",
                input: inputs
            });

        const wordEmbeddings =
            embeddingResponse.data.slice(0, words.length);

        const axisEmbedding =
            embeddingResponse.data[words.length].embedding;

        const rawScores =
            wordEmbeddings.map(item =>
                cosineSimilarity(
                    item.embedding,
                    axisEmbedding
                )
            );

        const averageScore =
            rawScores.reduce(
                (sum, score) => sum + score,
                0
            ) / rawScores.length;

        const graphWords =
            rawScores.map((score, index) => ({
                word: words[index],
                rawScore: score,
                score: score - averageScore
            }));

        res.json({
            success: true,
            axis: axis,
            words: graphWords
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Could not create embedding concept graph"
        });
    }
});

app.post("/api/point-embedding-actuals", async (req, res) => {
    try {
        const words = req.body.words;
    let xAxis =
        typeof req.body.xAxis === "string"
            ? req.body.xAxis.trim().toLowerCase()
            : "";

    let yAxis =
        typeof req.body.yAxis === "string"
            ? req.body.yAxis.trim().toLowerCase()
            : "";

        const needsAxisChoice =
            !xAxis || !yAxis;

        if (needsAxisChoice) {
            const axisResponse =
                await client.chat.completions.create({
                    model: "gpt-5.4",
                    messages: [
                        {
                            role: "system",
                            content:
                                "Given a list of words and optionally one provided axis, choose intuitive x and y axis concepts for placing the words on a 2D semantic map. If an axis is already provided, keep it exactly and only choose the missing axis. Return only valid JSON like this: {\"xAxis\":\"royalty\",\"yAxis\":\"gender\"}"
                        },
                        {
                            role: "user",
                            content: JSON.stringify({
                                words: words,
                                xAxis: xAxis,
                                yAxis: yAxis
                            })
                        }
                    ],
                    max_completion_tokens: 100
                });

            const axisData = JSON.parse(
                axisResponse.choices[0].message.content
            );

            if (!xAxis) {
                xAxis = axisData.xAxis;
            }

            if (!yAxis) {
                yAxis = axisData.yAxis;
            }
        }

        const inputs = [
            ...words,
            xAxis,
            yAxis
        ];

        const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: inputs
        });

        const wordEmbeddings =
            response.data.slice(0, words.length);

        const xAxisEmbedding =
            response.data[words.length].embedding;

        const yAxisEmbedding =
            response.data[words.length + 1].embedding;

        const rawPoints =
            wordEmbeddings.map((item, index) => ({
                word: words[index],
                x: cosineSimilarity(
                    item.embedding,
                    xAxisEmbedding
                ),
                y: cosineSimilarity(
                    item.embedding,
                    yAxisEmbedding
                )
            }));

        const maxXExtreme = Math.max(
            ...rawPoints.map(point =>
                Math.abs(point.x)
            )
        );

// --- Uniform scaling for the points on the graph ---


        const maxYExtreme = Math.max(
            ...rawPoints.map(point =>
                Math.abs(point.y)
            )
        );

        const xScale =
            maxXExtreme === 0
                ? 1
                : 1 / maxXExtreme;

        const yScale =
            maxYExtreme === 0
                ? 1
                : 1 / maxYExtreme;

        const points = rawPoints.map(point => ({
            word: point.word,
            x: point.x * xScale,
            y: point.y * yScale
        }));

// ---                     --- 
    
        //const points = rawPoints;

        console.log("Axes:", {
            xAxis,
            yAxis
        });

        console.log("Raw points:");
        console.table(rawPoints);

        console.log("Scaling:", {
            maxXExtreme,
            maxYExtreme,
            xScale,
            yScale
        });

        console.log("Scaled points:");
        console.table(points);

        res.json({
            success: true,
            xAxis: xAxis,
            yAxis: yAxis,
            points: points
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Could not get actual embedding points"
        });
    }
});

// Start server on port 3000
app.listen(3000, () => {
    console.log("Server running on port 3000");
});