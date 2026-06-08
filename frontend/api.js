const predictButton = document.querySelector("#wordpredict");
const spinButton = document.querySelector("#spinButton");
const wheel = document.querySelector("#wheel");

let currentProbabilities = [];
let currentRotation = 0;

async function generateNextWords(textResponse) {
    const response = await fetch("/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: textResponse
        })
    });

    const data = await response.json();

    const probabilities = data.result.map(item => ({
        token: item.token.trim() || "(space)",
        probability: Math.exp(item.logprob)
    }));

    const totalProbability = probabilities.reduce(
        (sum, item) => sum + item.probability,
        0
    );

    probabilities.push({
        token: "Other",
        probability: Math.max(0, 1 - totalProbability)
    });

    currentProbabilities = probabilities;

    document.getElementById("buttonValue").textContent =
        probabilities
            .map(item =>
                `${item.token} (${(item.probability * 100).toFixed(1)}%)`
            )
            .join(", ");

    drawWheel(probabilities);
}

function drawWheel(probabilities) {
    const colors = ["red", "blue", "green", "yellow", "purple", "orange"];

    let currentPercent = 0;

    const gradientParts = probabilities.map((item, index) => {
        const start = currentPercent;
        const end = currentPercent + item.probability * 100;

        currentPercent = end;

        return `${colors[index % colors.length]} ${start}% ${end}%`;
    });

    wheel.style.background =
        `conic-gradient(${gradientParts.join(", ")})`;
}

function spinWheel() {
    if (currentProbabilities.length === 0) {
        alert("Predict words first!");
        return;
    }

    currentRotation += 360 * 5 + Math.floor(Math.random() * 360);

    wheel.style.transform = `rotate(${currentRotation}deg)`;
}

predictButton.addEventListener("click", () => {
    const userText = document.getElementById("usertext").value;
    generateNextWords(userText);
});

spinButton.addEventListener("click", spinWheel);