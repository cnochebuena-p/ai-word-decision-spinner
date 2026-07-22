const customAxisButton =
    document.getElementById("customAxisButton");

const checkGuessesButton =
    document.getElementById("checkGuessesButton");

const guessActivity =
    document.getElementById("guessActivity");

const guessWordContainer =
    document.getElementById("guessWordContainer");

const guessMessage =
    document.getElementById("guessMessage");

/*
    Stores the current graph and hidden-word information.
*/
let currentMapData = null;
let currentGuessWords = [];
let currentGuesses = [];
let guessesRevealed = false;

customAxisButton.addEventListener(
    "click",
    createCustomAxisMap
);

checkGuessesButton.addEventListener(
    "click",
    checkGuesses
);

async function createCustomAxisMap() {
    const text =
        document
            .getElementById("customAxisText")
            .value
            .trim();

    const xAxis =
        document
            .getElementById("xAxisInput")
            .value
            .trim();

    const yAxis =
        document
            .getElementById("yAxisInput")
            .value
            .trim();

    const message =
        document.getElementById(
            "customAxisMessage"
        );

    const selectedSource =
        document.querySelector(
            'input[name="embeddingSource"]:checked'
        );

    if (!text) {
        message.textContent =
            "Enter at least one word.";

        return;
    }

    if (!selectedSource) {
        message.textContent =
            "Choose ChatGPT-generated positions or OpenAI embeddings.";

        return;
    }

    const embeddingSource =
        selectedSource.value;

    const endpoint =
        embeddingSource === "chatgpt"
            ? "/api/axis-map"
            : "/api/custom-axis-map";

    message.textContent =
        "Creating graph and choosing hidden words...";

    resetGuessActivity();

    try {
        const response =
            await fetch(endpoint, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    text,
                    xAxis,
                    yAxis
                })
            });

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            message.textContent =
                data.error ||
                "Could not create the graph.";

            return;
        }

        /*
            ChatGPT endpoint returns:

            {
                success: true,
                axisMap: {
                    xAxis,
                    yAxis,
                    points,
                    guessWords
                }
            }

            OpenAI endpoint returns:

            {
                success: true,
                xAxis,
                yAxis,
                points,
                guessWords
            }
        */
        const mapData =
            embeddingSource === "chatgpt"
                ? data.axisMap
                : data;

        if (
            !Array.isArray(mapData.points) ||
            !Array.isArray(mapData.guessWords)
        ) {
            message.textContent =
                "The server returned incomplete graph data.";

            return;
        }

        currentMapData = mapData;
        currentGuessWords = mapData.guessWords;
        currentGuesses = [];
        guessesRevealed = false;

        drawCustomAxisMap(currentMapData);
        buildGuessInputs(currentGuessWords);

        guessActivity.hidden = false;

        message.textContent =
            `X-axis: ${mapData.xAxis} | ` +
            `Y-axis: ${mapData.yAxis}`;
    }

    catch (error) {
        console.error(error);

        message.textContent =
            "The request could not reach the server.";
    }
}

function resetGuessActivity() {
    currentMapData = null;
    currentGuessWords = [];
    currentGuesses = [];
    guessesRevealed = false;

    guessActivity.hidden = true;
    guessWordContainer.innerHTML = "";
    guessMessage.textContent = "";
}

function buildGuessInputs(guessWords) {
    guessWordContainer.innerHTML = "";

    guessWords.forEach((item, index) => {
        const card =
            document.createElement("div");

        card.className = "guess-word-card";

        const heading =
            document.createElement("h4");

        heading.textContent = item.word;

        const xLabel =
            document.createElement("label");

        xLabel.setAttribute(
            "for",
            `guessX${index}`
        );

        xLabel.textContent = "X coordinate:";

        const xInput =
            document.createElement("input");

        xInput.type = "number";
        xInput.id = `guessX${index}`;
        xInput.min = "-1";
        xInput.max = "1";
        xInput.step = "0.01";
        xInput.placeholder = "-1 to 1";

        const yLabel =
            document.createElement("label");

        yLabel.setAttribute(
            "for",
            `guessY${index}`
        );

        yLabel.textContent = "Y coordinate:";

        const yInput =
            document.createElement("input");

        yInput.type = "number";
        yInput.id = `guessY${index}`;
        yInput.min = "-1";
        yInput.max = "1";
        yInput.step = "0.01";
        yInput.placeholder = "-1 to 1";

        const result =
            document.createElement("p");

        result.id = `guessResult${index}`;
        result.className = "guess-result";

        card.appendChild(heading);
        card.appendChild(xLabel);
        card.appendChild(xInput);
        card.appendChild(yLabel);
        card.appendChild(yInput);
        card.appendChild(result);

        guessWordContainer.appendChild(card);
    });
}

function checkGuesses() {
    if (
        !currentMapData ||
        currentGuessWords.length === 0
    ) {
        guessMessage.textContent =
            "Create a graph first.";

        return;
    }

    const guesses = [];

    for (
        let index = 0;
        index < currentGuessWords.length;
        index++
    ) {
        const xInput =
            document.getElementById(
                `guessX${index}`
            );

        const yInput =
            document.getElementById(
                `guessY${index}`
            );

        const guessedX =
            Number(xInput.value);

        const guessedY =
            Number(yInput.value);

        if (
            xInput.value === "" ||
            yInput.value === "" ||
            Number.isNaN(guessedX) ||
            Number.isNaN(guessedY)
        ) {
            guessMessage.textContent =
                "Enter both coordinates for every word.";

            return;
        }

        if (
            guessedX < -1 ||
            guessedX > 1 ||
            guessedY < -1 ||
            guessedY > 1
        ) {
            guessMessage.textContent =
                "Every coordinate must be between -1 and 1.";

            return;
        }

        guesses.push({
            word: currentGuessWords[index].word,
            x: guessedX,
            y: guessedY
        });
    }

    currentGuesses = guesses;
    guessesRevealed = true;

    let totalScore = 0;

    currentGuessWords.forEach(
        (actualPoint, index) => {
            const guessedPoint =
                currentGuesses[index];

            const score =
                calculateGuessScore(
                    guessedPoint,
                    actualPoint
                );

            totalScore += score;

            const result =
                document.getElementById(
                    `guessResult${index}`
                );

            result.textContent =
                `Your guess: ` +
                `(${formatCoordinate(guessedPoint.x)}, ` +
                `${formatCoordinate(guessedPoint.y)}) | ` +
                `Actual: ` +
                `(${formatCoordinate(actualPoint.x)}, ` +
                `${formatCoordinate(actualPoint.y)}) | ` +
                `Score: ${score.toFixed(1)}%`;
        }
    );

    const averageScore =
        totalScore /
        currentGuessWords.length;

    guessMessage.textContent =
        `Average score: ${averageScore.toFixed(1)}%`;

    drawCustomAxisMap(currentMapData);
}

function calculateGuessScore(
    guessedPoint,
    actualPoint
) {
    const xDifference =
        guessedPoint.x - actualPoint.x;

    const yDifference =
        guessedPoint.y - actualPoint.y;

    const distance =
        Math.sqrt(
            xDifference * xDifference +
            yDifference * yDifference
        );

    /*
        The greatest possible distance between
        two points inside a -1 to 1 square is
        the distance between opposite corners:

        sqrt(2^2 + 2^2) = 2 * sqrt(2)
    */
    const maximumDistance =
        2 * Math.sqrt(2);

    const score =
        100 *
        (1 - distance / maximumDistance);

    return Math.max(
        0,
        Math.min(100, score)
    );
}

function formatCoordinate(value) {
    return Number(value).toFixed(2);
}

function drawCustomAxisMap(data) {
    const canvas =
        document.getElementById(
            "customAxisCanvas"
        );

    const ctx =
        canvas.getContext("2d");

    const margin = 70;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "white";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.lineWidth = 2;

    /* ---------- Draw X-axis in red ---------- */

    ctx.strokeStyle = "red";

    ctx.beginPath();

    ctx.moveTo(margin, centerY);
    ctx.lineTo(
        canvas.width - margin,
        centerY
    );

    ctx.stroke();

    /* ---------- Draw Y-axis in blue ---------- */

    ctx.strokeStyle = "blue";

    ctx.beginPath();

    ctx.moveTo(centerX, margin);
    ctx.lineTo(
        centerX,
        canvas.height - margin
    );

    ctx.stroke();

    /* ---------- Draw scale labels ---------- */

    ctx.fillStyle = "black";
    ctx.font = "13px Arial";

    ctx.fillText(
        "-1",
        margin - 8,
        centerY + 22
    );

    ctx.fillText(
        "1",
        canvas.width - margin - 4,
        centerY + 22
    );

    ctx.fillText(
        "1",
        centerX + 10,
        margin + 5
    );

    ctx.fillText(
        "-1",
        centerX + 10,
        canvas.height - margin + 5
    );

    /* ---------- Draw axis names ---------- */

    ctx.font = "16px Arial";

    /* X-axis label */

    ctx.fillStyle = "red";

    ctx.fillText(
        data.xAxis,
        canvas.width - margin - 120,
        centerY - 12
    );

    /* Y-axis label */

    ctx.fillStyle = "blue";

    ctx.fillText(
        data.yAxis,
        centerX + 12,
        margin
    );

    /* Restore defaults for drawing points */

    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";

    /*
        Coordinates already come back scaled
        between approximately -1 and 1.

        Therefore, no additional maxX or maxY
        scaling is performed here.
    */
    data.points.forEach(point => {
        drawPoint(
            ctx,
            point,
            centerX,
            centerY,
            margin,
            canvas,
            "circle"
        );
    });

    /*
        Do not reveal hidden points until the
        user checks the guesses.
    */
    if (
        guessesRevealed &&
        currentGuessWords.length > 0
    ) {
        currentGuessWords.forEach(
            (actualPoint, index) => {
                const guessedPoint =
                    currentGuesses[index];

                drawConnectionLine(
                    ctx,
                    guessedPoint,
                    actualPoint,
                    centerX,
                    centerY,
                    margin,
                    canvas
                );

                drawPoint(
                    ctx,
                    guessedPoint,
                    centerX,
                    centerY,
                    margin,
                    canvas,
                    "guess"
                );

                drawPoint(
                    ctx,
                    actualPoint,
                    centerX,
                    centerY,
                    margin,
                    canvas,
                    "actual"
                );
            }
        );
    }
}

function coordinateToCanvas(
    point,
    centerX,
    centerY,
    margin,
    canvas
) {
    const drawableHalfWidth =
        canvas.width / 2 - margin;

    const drawableHalfHeight =
        canvas.height / 2 - margin;

    return {
        x:
            centerX +
            point.x * drawableHalfWidth,

        y:
            centerY -
            point.y * drawableHalfHeight
    };
}

function drawPoint(
    ctx,
    point,
    centerX,
    centerY,
    margin,
    canvas,
    pointType
) {
    const canvasPoint =
        coordinateToCanvas(
            point,
            centerX,
            centerY,
            margin,
            canvas
        );

    ctx.save();

    if (pointType === "guess") {
        /*
            Draw guessed positions as an X.
        */
        ctx.strokeStyle = "gray";
        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            canvasPoint.x - 7,
            canvasPoint.y - 7
        );

        ctx.lineTo(
            canvasPoint.x + 7,
            canvasPoint.y + 7
        );

        ctx.moveTo(
            canvasPoint.x + 7,
            canvasPoint.y - 7
        );

        ctx.lineTo(
            canvasPoint.x - 7,
            canvasPoint.y + 7
        );

        ctx.stroke();

        ctx.fillStyle = "gray";
        ctx.font = "14px Arial";

        ctx.fillText(
            `${point.word} guess`,
            canvasPoint.x + 10,
            canvasPoint.y + 18
        );
    }

    else {
        ctx.beginPath();

        ctx.arc(
            canvasPoint.x,
            canvasPoint.y,
            pointType === "actual" ? 9 : 7,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            pointType === "actual"
                ? "black"
                : "black";

        ctx.fill();

        ctx.font =
            pointType === "actual"
                ? "bold 15px Arial"
                : "15px Arial";

        ctx.fillText(
            pointType === "actual"
                ? `${point.word} actual`
                : point.word,
            canvasPoint.x + 10,
            canvasPoint.y - 10
        );
    }

    ctx.restore();
}

function drawConnectionLine(
    ctx,
    guessedPoint,
    actualPoint,
    centerX,
    centerY,
    margin,
    canvas
) {
    const guessCanvasPoint =
        coordinateToCanvas(
            guessedPoint,
            centerX,
            centerY,
            margin,
            canvas
        );

    const actualCanvasPoint =
        coordinateToCanvas(
            actualPoint,
            centerX,
            centerY,
            margin,
            canvas
        );

    ctx.save();

    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]);

    ctx.beginPath();

    ctx.moveTo(
        guessCanvasPoint.x,
        guessCanvasPoint.y
    );

    ctx.lineTo(
        actualCanvasPoint.x,
        actualCanvasPoint.y
    );

    ctx.stroke();

    ctx.restore();
}