const continueButton = document.querySelector("#continueButton");

let winningWord = "";

// Button that retrieves AI word predictions
const predictButton =
    document.querySelector("#wordpredict");

// Button that spins the wheel
const spinButton =
    document.querySelector("#spinButton");

// Spinner element
const wheel =
    document.querySelector("#wheel");

// Stores the current words and probabilities
let currentProbabilities = [];

// Tracks total wheel rotation
let currentRotation = 0;

// Sends text to server; awaits response
async function generateNextWords(textResponse) {
    try {
        const response = await fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: textResponse,

                temperature:
                    Number(
                        document.getElementById(
                            "temperatureSlider"
                        ).value
                    ) / 10,

                topN:
                    Number(
                        document.getElementById(
                            "topNSlider"
                        ).value
                    ) * 2
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                `Request failed with status ${response.status}`
            );
        }

        const temperature =
            Number(
                document.getElementById(
                    "temperatureSlider"
                ).value
            ) / 10;

        currentProbabilities =
            createTemperatureProbabilities(
                data.result,
                temperature
            );

        drawWheel(currentProbabilities);
    }

    catch (error) {
        console.error("Prediction error:", error);

        alert(
            `Prediction failed: ${error.message}`
        );
    }
}

// Creates spinner slices based on probabilities
function drawWheel(probabilities) {

    const colors = probabilities.map((_, index) => {

        const hue =
            (index * 360) / probabilities.length;

        return `hsl(${hue}, 80%, 60%)`;
    });

    let currentPercent = 0;

    const gradientParts = probabilities.map(
        (item, index) => {

            const start = currentPercent;
            const end =
                currentPercent + item.probability;

            currentPercent = end;

            return `${colors[index]} ${start}% ${end}%`;
        }
    );

    wheel.style.background =
        `conic-gradient(${gradientParts.join(", ")})`;

    updateLegend(probabilities, colors);
}

function createTemperatureProbabilities(words, temperature) {

    const r =
        Math.pow(2, -1 + temperature / 2);

    const weights =
        words.map((_, index) =>
            Math.pow(r, index)
        );

    const totalWeight =
        weights.reduce(
            (sum, weight) => sum + weight,
            0
        );

    return words.map((item, index) => ({
        word: item.word,
        probability:
            weights[index] / totalWeight * 100
    }));
}



// Creates color legend beneath wheel
function updateLegend(probabilities, colors) {

    const legend =
        document.getElementById("wheelLegend");

    // Removes old legend entries
    legend.innerHTML = "";

    probabilities.forEach((item, index) => {

        const row =
            document.createElement("div");

        row.className = "legend-item";

        const colorBox =
            document.createElement("div");

        colorBox.className = "legend-color";

        colorBox.style.backgroundColor =
            colors[index % colors.length];

        const label =
            document.createElement("span");

        label.textContent =
        `${item.word} (${item.probability.toLocaleString(
            undefined,
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )}%)`;

        row.appendChild(colorBox);
        row.appendChild(label);

        legend.appendChild(row);
    });
}


async function spinWheel() {

    if (currentProbabilities.length === 0) {
        alert("Predict words first!");
        return;
    }

    const spinResponse = await fetch("/spin", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            probabilities: currentProbabilities
        })
    });

    const spinData = await spinResponse.json();

    if (!spinData.success) {
        alert(spinData.message);
        return;
    }

    winningWord = spinData.winningWord;

    let currentPercent = 0;
    let winningStart = 0;
    let winningEnd = 0;

    for (const item of currentProbabilities) {
        const start = currentPercent;
        const end = currentPercent + item.probability;

        if (item.word === winningWord) {
            winningStart = start;
            winningEnd = end;
            break;
        }

        currentPercent = end;
    }

    const winningMiddlePercent =
        (winningStart + winningEnd) / 2;

    const winningMiddleAngle =
        winningMiddlePercent / 100 * 360;

    const pointerAngle = 0;

    const currentRotationMod =
        ((currentRotation % 360) + 360) % 360;

    const targetRotation =
        360 - winningMiddleAngle + pointerAngle;

    let extraRotation =
        targetRotation - currentRotationMod;

    if (extraRotation < 0) {
        extraRotation += 360;
    }

    currentRotation +=
        360 * 5 + extraRotation;

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;
}

continueButton.addEventListener("click", async () => {

    await fetch("/continue", {
        method: "POST"
    });

    if (winningWord === "") {
        alert("Spin first!");
        return;
    }

    const textBox =
        document.getElementById("usertext");

    textBox.value =
        textBox.value.trim() + " " + winningWord;

    await generateNextWords(textBox.value);

    winningWord = "";
});

// When Predict button is clicked...
predictButton.addEventListener("click", () => {

    // Retrieve user's text
    const userText =
        document.getElementById("usertext").value;

    // Request AI predictions
    generateNextWords(userText);
});

// When Spin button is clicked...
spinButton.addEventListener("click", spinWheel);

function updatePredictionFromCurrentText() {
    const userText =
        document.getElementById("usertext").value;

    if (userText.trim() === "") {
        return;
    }

    generateNextWords(userText);
}

document
    .getElementById("temperatureSlider")
    .addEventListener("change", updatePredictionFromCurrentText);

document
    .getElementById("topNSlider")
    .addEventListener("change", updatePredictionFromCurrentText);

function drawAxisMap(axisMap) {
    const canvas = document.getElementById("axisCanvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(canvas.width - 20, centerY);
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, canvas.height - 20);
    ctx.stroke();

    ctx.fillText(axisMap.xAxis, canvas.width - 120, centerY - 10);
    ctx.fillText(axisMap.yAxis, centerX + 10, 30);

    axisMap.points.forEach(point => {
        const x = centerX + point.x * (canvas.width / 2 - 40);
        const y = centerY - point.y * (canvas.height / 2 - 40);

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(point.word, x + 10, y);
    });
}