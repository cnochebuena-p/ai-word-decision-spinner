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

const toggleGuessPointsButton =
    document.getElementById(
        "toggleGuessPointsButton"
    );

const customAxisCanvas =
    document.getElementById(
        "customAxisCanvas"
    );

let draggedGuessPoint = null;
let activePointerId = null;
let guessPointsVisible = true;

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

toggleGuessPointsButton.addEventListener(
    "click",
    toggleGuessPoints
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

        /*
            currentGuessWords contains the hidden,
            correct positions returned by the server.
        */
        currentGuessWords =
            mapData.guessWords;

        /*
            currentGuesses contains the user's draggable
            positions.

            The first word starts left of center and the
            second word starts right of center.
        */
        currentGuesses =
            currentGuessWords.map(
                (point, index) => ({
                    word: point.word,

                    x:
                        index === 0
                            ? -0.25
                            : 0.25,

                    y: 0
                })
            );

        guessesRevealed = false;
        guessPointsVisible = true;

        toggleGuessPointsButton.textContent =
            "Hide Guess Points";

        drawCustomAxisMap(currentMapData);
        buildGuessDisplay();

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
    guessPointsVisible = true;

    draggedGuessPoint = null;
    activePointerId = null;

    guessActivity.hidden = true;
    guessWordContainer.innerHTML = "";
    guessMessage.textContent = "";

    toggleGuessPointsButton.textContent =
        "Hide Guess Points";
}

function buildGuessDisplay() {
    guessWordContainer.innerHTML = "";

    currentGuesses.forEach(
        (point, index) => {
            const card =
                document.createElement("div");

            card.className =
                "guess-word-card";

            const heading =
                document.createElement("h4");

            heading.textContent =
                point.word;

            const coordinateDisplay =
                document.createElement("p");

            coordinateDisplay.id =
                `guessCoordinate${index}`;

            coordinateDisplay.className =
                "guess-coordinate";

            const result =
                document.createElement("p");

            result.id =
                `guessResult${index}`;

            result.className =
                "guess-result";

            card.appendChild(heading);
            card.appendChild(
                coordinateDisplay
            );
            card.appendChild(result);

            guessWordContainer.appendChild(
                card
            );
        }
    );

    updateGuessCoordinateDisplays();
}

function updateGuessCoordinateDisplays() {
    currentGuesses.forEach(
        (point, index) => {
            const display =
                document.getElementById(
                    `guessCoordinate${index}`
                );

            if (!display) {
                return;
            }

            display.textContent =
                `Current guess: ` +
                `(${point.x.toFixed(2)}, ` +
                `${point.y.toFixed(2)})`;
        }
    );
}

function checkGuesses() {
    if (
        !currentMapData ||
        currentGuessWords.length === 0 ||
        currentGuesses.length === 0
    ) {
        guessMessage.textContent =
            "Create a graph first.";

        return;
    }

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
        `Average score: ` +
        `${averageScore.toFixed(1)}%`;

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
        Draw the user's draggable guess points.

        These are not the real hidden positions.
    */
    if (
        guessPointsVisible &&
        currentGuesses.length > 0
    ) {
        currentGuesses.forEach(
            guessedPoint => {
                drawPoint(
                    ctx,
                    guessedPoint,
                    centerX,
                    centerY,
                    margin,
                    canvas,
                    "guess"
                );
            }
        );
    }

    /*
        Reveal the correct points and connecting
        lines after the user checks the guesses.
    */
    if (
        guessesRevealed &&
        currentGuessWords.length > 0
    ) {
        currentGuessWords.forEach(
            (actualPoint, index) => {
                const guessedPoint =
                    currentGuesses[index];

                if (guessPointsVisible) {
                    drawConnectionLine(
                        ctx,
                        guessedPoint,
                        actualPoint,
                        centerX,
                        centerY,
                        margin,
                        canvas
                    );
                }

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

function toggleGuessPoints() {
    if (!currentMapData) {
        guessMessage.textContent =
            "Create a graph first.";

        return;
    }

    guessPointsVisible =
        !guessPointsVisible;

    toggleGuessPointsButton.textContent =
        guessPointsVisible
            ? "Hide Guess Points"
            : "Show Guess Points";

    drawCustomAxisMap(currentMapData);
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
            Draw draggable guess points as
            orange circles.
        */
        ctx.beginPath();

        ctx.arc(
            canvasPoint.x,
            canvasPoint.y,
            10,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "orange";
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "darkorange";
        ctx.font = "bold 15px Arial";

        ctx.fillText(
            `${point.word} guess`,
            canvasPoint.x + 13,
            canvasPoint.y - 12
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

customAxisCanvas.addEventListener(
    "pointerdown",
    event => {
        if (
            !guessPointsVisible ||
            guessesRevealed
        ) {
            return;
        }

        const mouse =
            getCustomCanvasMousePosition(
                event
            );

        draggedGuessPoint =
            currentGuesses.find(point => {
                const canvasPoint =
                    customGraphToCanvas(
                        point.x,
                        point.y
                    );

                const dx =
                    mouse.x -
                    canvasPoint.x;

                const dy =
                    mouse.y -
                    canvasPoint.y;

                return (
                    Math.sqrt(
                        dx * dx + dy * dy
                    ) <= 18
                );
            });

        if (!draggedGuessPoint) {
            return;
        }

        activePointerId =
            event.pointerId;

        customAxisCanvas.setPointerCapture(
            event.pointerId
        );

        customAxisCanvas.style.cursor =
            "grabbing";
    }
);

customAxisCanvas.addEventListener(
    "pointermove",
    event => {
        const mouse =
            getCustomCanvasMousePosition(
                event
            );

        if (!draggedGuessPoint) {
            const hoveringPoint =
                guessPointsVisible &&
                !guessesRevealed &&
                currentGuesses.some(
                    point => {
                        const canvasPoint =
                            customGraphToCanvas(
                                point.x,
                                point.y
                            );

                        const dx =
                            mouse.x -
                            canvasPoint.x;

                        const dy =
                            mouse.y -
                            canvasPoint.y;

                        return (
                            Math.sqrt(
                                dx * dx +
                                dy * dy
                            ) <= 18
                        );
                    }
                );

            customAxisCanvas.style.cursor =
                hoveringPoint
                    ? "grab"
                    : "default";

            return;
        }

        const graphPoint =
            customCanvasToGraph(
                mouse.x,
                mouse.y
            );

        draggedGuessPoint.x =
            graphPoint.x;

        draggedGuessPoint.y =
            graphPoint.y;

        updateGuessCoordinateDisplays();
        drawCustomAxisMap(currentMapData);
    }
);

function finishCustomGuessDragging() {
    if (
        activePointerId !== null &&
        customAxisCanvas.hasPointerCapture(
            activePointerId
        )
    ) {
        customAxisCanvas.releasePointerCapture(
            activePointerId
        );
    }

    draggedGuessPoint = null;
    activePointerId = null;

    customAxisCanvas.style.cursor =
        "default";
}

customAxisCanvas.addEventListener(
    "pointerup",
    finishCustomGuessDragging
);

customAxisCanvas.addEventListener(
    "pointercancel",
    finishCustomGuessDragging
);

function customGraphToCanvas(
    xValue,
    yValue
) {
    const margin = 70;

    const centerX =
        customAxisCanvas.width / 2;

    const centerY =
        customAxisCanvas.height / 2;

    const drawableHalfWidth =
        customAxisCanvas.width / 2 -
        margin;

    const drawableHalfHeight =
        customAxisCanvas.height / 2 -
        margin;

    return {
        x:
            centerX +
            xValue *
            drawableHalfWidth,

        y:
            centerY -
            yValue *
            drawableHalfHeight
    };
}

function customCanvasToGraph(
    canvasX,
    canvasY
) {
    const margin = 70;

    const centerX =
        customAxisCanvas.width / 2;

    const centerY =
        customAxisCanvas.height / 2;

    const drawableHalfWidth =
        customAxisCanvas.width / 2 -
        margin;

    const drawableHalfHeight =
        customAxisCanvas.height / 2 -
        margin;

    let x =
        (canvasX - centerX) /
        drawableHalfWidth;

    let y =
        (centerY - canvasY) /
        drawableHalfHeight;

    x = Math.max(
        -1,
        Math.min(1, x)
    );

    y = Math.max(
        -1,
        Math.min(1, y)
    );

    return {
        x,
        y
    };
}

function getCustomCanvasMousePosition(
    event
) {
    const rect =
        customAxisCanvas
            .getBoundingClientRect();

    const scaleX =
        customAxisCanvas.width /
        rect.width;

    const scaleY =
        customAxisCanvas.height /
        rect.height;

    return {
        x:
            (
                event.clientX -
                rect.left
            ) * scaleX,

        y:
            (
                event.clientY -
                rect.top
            ) * scaleY
    };
}