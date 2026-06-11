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

    // Sends text to Express backend route
    const response = await fetch("/predict", {
        method: "POST",

        // Tells server it is sending JSON data
        headers: {
            "Content-Type": "application/json"
        },

        // Turns text into JSON string
    body: JSON.stringify({
    text: textResponse,

    temperature: Number(
        document.getElementById("temperatureSlider").value
    ) / 10,

    topK: Number(
        document.getElementById("topKSlider").value
    ) * 2 })
    });

    // Waits for response from server and converts into JSON
    const data = await response.json();

    // Stores words and probabilities for spinner use
    const temperature =
    Number(
        document.getElementById("temperatureSlider").value
    ) / 10;

    currentProbabilities =
        createTemperatureProbabilities(
            data.result,
            temperature
        );

    // Updates spinner with new probabilities
    drawWheel(currentProbabilities);
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

    const count = words.length;

    // Temperature 0 gives steep probabilities: 50%, 25%, 12.5%, etc.
    const coldWeights = words.map((_, index) => {
        return Math.pow(0.5, index + 1);
    });

    // Temperature 2 gives equal probabilities
    const equalWeights = words.map(() => {
        return 1;
    });

    // Convert temperature from 0–2 into blend amount from 0–1
    const blendAmount = temperature / 2;

    // Blend cold weights and equal weights
    const blendedWeights = words.map((word, index) => {
        return (
            coldWeights[index] * (1 - blendAmount) +
            equalWeights[index] * blendAmount
        );
    });

    // Normalize weights so they add up to 100
    const totalWeight = blendedWeights.reduce(
        (sum, weight) => sum + weight,
        0
    );

    return words.map((item, index) => {
        return {
            word: item.word,
            probability:
                (blendedWeights[index] / totalWeight) * 100
        };
    });
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
            `${item.word} (${item.probability}%)`;

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