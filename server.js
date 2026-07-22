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

async function chooseMissingAxes(text, providedXAxis, providedYAxis) {
    let xAxis =
        typeof providedXAxis === "string"
            ? providedXAxis.trim()
            : "";

    let yAxis =
        typeof providedYAxis === "string"
            ? providedYAxis.trim()
            : "";

    // No API call is needed when the user supplied both axes.
    if (xAxis && yAxis) {
        return {
            xAxis,
            yAxis
        };
    }

    const response =
        await client.chat.completions.create({
            model: "gpt-5.4",

            messages: [
                {
                    role: "system",
                    content: `
Choose intuitive conceptual axes for mapping the user's words.

Rules:

1. If xAxis is provided, preserve it exactly.
2. If yAxis is provided, preserve it exactly.
3. Only choose axes that are blank.
4. The two axes should represent different useful concepts.
5. Use short, understandable axis names.
6. Return only valid JSON.

Return this exact structure:

{
    "xAxis": "axis name",
    "yAxis": "axis name"
}
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        text,
                        xAxis,
                        yAxis
                    })
                }
            ],

            max_completion_tokens: 100
        });

    const axisData = JSON.parse(
        response.choices[0].message.content
    );

    // Preserve user-provided axes exactly.
    if (!xAxis) {
        xAxis = axisData.xAxis;
    }

    if (!yAxis) {
        yAxis = axisData.yAxis;
    }

    return {
        xAxis,
        yAxis
    };
}

async function chooseGuessWords(
    text,
    xAxis,
    yAxis
) {
    const originalWords =
        text
            .split(/\s+/)
            .map(word =>
                word
                    .trim()
                    .toLowerCase()
                    .replace(
                        /^[^a-z0-9]+|[^a-z0-9]+$/gi,
                        ""
                    )
            )
            .filter(Boolean);

    const response =
        await client.chat.completions.create({
            model: "gpt-5.4",

            messages: [
                {
                    role: "system",
                    content: `
Choose exactly two new single words for a semantic-coordinate guessing activity.

The words should relate meaningfully to:
- the user's original words,
- the x-axis concept,
- and the y-axis concept.

Rules:

1. Return exactly two words.
2. Each result must be a single word.
3. Do not return any word already supplied by the user.
4. Do not return the x-axis or y-axis names themselves.
5. The two words should be meaningfully different from one another.
6. Prefer words whose likely coordinates are not identical.
7. Return only valid JSON.

Return this exact structure:

{
    "words": [
        "example1",
        "example2"
    ]
}
`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        originalWords,
                        xAxis,
                        yAxis
                    })
                }
            ],

            max_completion_tokens: 100
        });

    const result =
        JSON.parse(
            response.choices[0].message.content
        );

    if (!Array.isArray(result.words)) {
        throw new Error(
            "The model did not return a words array."
        );
    }

    const originalWordSet =
        new Set(originalWords);

    const axisNames =
        new Set([
            xAxis.trim().toLowerCase(),
            yAxis.trim().toLowerCase()
        ]);

    const guessWords =
        result.words
            .map(word =>
                String(word)
                    .trim()
                    .toLowerCase()
            )
            .filter(word =>
                word &&
                !word.includes(" ") &&
                !originalWordSet.has(word) &&
                !axisNames.has(word)
            );

    const uniqueGuessWords =
        [...new Set(guessWords)];

    if (uniqueGuessWords.length < 2) {
        throw new Error(
            "Could not generate two unique guess words."
        );
    }

    return uniqueGuessWords.slice(0, 2);
}

function clampCoordinate(value) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(
        -1,
        Math.min(1, number)
    );
}

app.post("/api/axis-map", async (req, res) => {
    try {
        const text =
            typeof req.body.text === "string"
                ? req.body.text.trim()
                : "";

        if (!text) {
            return res.status(400).json({
                success: false,
                error: "Enter at least one word."
            });
        }

        const originalWords =
            text
                .split(/\s+/)
                .filter(Boolean);

        const chosenAxes =
            await chooseMissingAxes(
                text,
                req.body.xAxis,
                req.body.yAxis
            );

        const xAxis =
            chosenAxes.xAxis;

        const yAxis =
            chosenAxes.yAxis;

        const guessWords =
            await chooseGuessWords(
                text,
                xAxis,
                yAxis
            );

        const response =
            await client.chat.completions.create({
                model: "gpt-5.4",

                messages: [
                    {
                        role: "system",
                        content: `
Place all supplied words on the provided semantic x-axis and y-axis.

There are two groups:

1. originalWords:
   These will be displayed immediately.

2. guessWords:
   These coordinates will be hidden until the user submits a guess.

Rules:

1. Use the provided axes exactly.
2. Do not rename or replace either axis.
3. Include every original word.
4. Include every guess word.
5. Assign each word an x coordinate and y coordinate.
6. Every coordinate must be between -1 and 1.
7. Make positions meaningfully reflect both axes.
8. Return only valid JSON.

Return this exact structure:

{
    "points": [
        {
            "word": "example",
            "x": 0.5,
            "y": -0.2
        }
    ],
    "guessWords": [
        {
            "word": "hidden-example",
            "x": 0.4,
            "y": 0.7
        }
    ]
}
`
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            originalWords,
                            guessWords,
                            xAxis,
                            yAxis
                        })
                    }
                ],

                max_completion_tokens: 500
            });

        const positionData =
            JSON.parse(
                response.choices[0].message.content
            );

        if (
            !Array.isArray(positionData.points) ||
            !Array.isArray(
                positionData.guessWords
            )
        ) {
            throw new Error(
                "ChatGPT returned invalid position data."
            );
        }

        const points =
            positionData.points.map(point => ({
                word: String(point.word),
                x: clampCoordinate(point.x),
                y: clampCoordinate(point.y)
            }));

        const hiddenPoints =
            positionData.guessWords.map(
                point => ({
                    word: String(point.word),
                    x: clampCoordinate(point.x),
                    y: clampCoordinate(point.y)
                })
            );

        res.json({
            success: true,

            axisMap: {
                xAxis,
                yAxis,
                points,
                guessWords: hiddenPoints
            }
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error:
                "Could not create ChatGPT axis map."
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

app.post(
    "/api/custom-axis-map",
    async (req, res) => {
        try {
            const text =
                typeof req.body.text === "string"
                    ? req.body.text.trim()
                    : "";

            if (!text) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Enter at least one word."
                });
            }

            const words =
                text
                    .split(/\s+/)
                    .filter(Boolean);

            const chosenAxes =
                await chooseMissingAxes(
                    text,
                    req.body.xAxis,
                    req.body.yAxis
                );

            const xAxis =
                chosenAxes.xAxis;

            const yAxis =
                chosenAxes.yAxis;

            const guessWordNames =
                await chooseGuessWords(
                    text,
                    xAxis,
                    yAxis
                );

            /*
                Embed:
                - original words
                - hidden words
                - x axis
                - y axis
            */
            const allWords = [
                ...words,
                ...guessWordNames
            ];

            const inputs = [
                ...allWords,
                xAxis,
                yAxis
            ];

            const embeddingResponse =
                await client.embeddings.create({
                    model:
                        "text-embedding-3-small",

                    input: inputs
                });

            const allWordEmbeddings =
                embeddingResponse.data.slice(
                    0,
                    allWords.length
                );

            const xAxisEmbedding =
                embeddingResponse.data[
                    allWords.length
                ].embedding;

            const yAxisEmbedding =
                embeddingResponse.data[
                    allWords.length + 1
                ].embedding;

            const rawAllPoints =
                allWordEmbeddings.map(
                    (item, index) => ({
                        word: allWords[index],

                        x: dotProduct(
                            item.embedding,
                            xAxisEmbedding
                        ),

                        y: dotProduct(
                            item.embedding,
                            yAxisEmbedding
                        )
                    })
                );

            /*
                Use a shared scaling system for both
                visible and hidden words.

                This is important because user guesses
                must use the same -1 to 1 coordinate
                system as the hidden answers.
            */
            const maxX =
                Math.max(
                    0.0001,
                    ...rawAllPoints.map(point =>
                        Math.abs(point.x)
                    )
                );

            const maxY =
                Math.max(
                    0.0001,
                    ...rawAllPoints.map(point =>
                        Math.abs(point.y)
                    )
                );

            const scaledAllPoints =
                rawAllPoints.map(point => ({
                    word: point.word,
                    x: point.x / maxX,
                    y: point.y / maxY
                }));

            const points =
                scaledAllPoints.slice(
                    0,
                    words.length
                );

            const guessWords =
                scaledAllPoints.slice(
                    words.length
                );

            res.json({
                success: true,
                xAxis,
                yAxis,
                points,
                guessWords
            });
        }

        catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                error:
                    "Could not create OpenAI embedding map."
            });
        }
    }
);

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