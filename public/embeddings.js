const axisMapButton = document.getElementById("axisMapButton");

axisMapButton.addEventListener("click", async () => {
    const text = document.getElementById("embeddingText").value;

    const response = await fetch("/api/axis-map", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!data.success) {
        alert(data.error);
        return;
    }

    drawAxisMap(data.axisMap);
});

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

const customAxisButton =
    document.getElementById("customAxisButton");

customAxisButton.addEventListener("click", async () => {
    const text =
        document.getElementById("embeddingText").value;

    const xAxis =
        document.getElementById("xAxisInput").value;

    const yAxis =
        document.getElementById("yAxisInput").value;

    const metric =
        document.getElementById("similarityMetric").value;

    const response = await fetch("/api/custom-axis-map", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            xAxis: xAxis,
            yAxis: yAxis,
            metric: metric
        })
    });

    const data = await response.json();

    if (!data.success) {
        alert(data.error);
        return;
    }

    drawCustomAxisMap(data);
});

function drawCustomAxisMap(data) {
    const canvas =
        document.getElementById("customAxisCanvas");

    const ctx =
        canvas.getContext("2d");

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

    ctx.fillText(data.xAxis, canvas.width - 120, centerY - 10);
    ctx.fillText(data.yAxis, centerX + 10, 30);

    const maxAbs =
        Math.max(
            1,
            ...data.points.map(point =>
                Math.max(Math.abs(point.x), Math.abs(point.y))
            )
        );

    data.points.forEach(point => {
        const x =
            centerX + (point.x / maxAbs) * (canvas.width / 2 - 40);

        const y =
            centerY - (point.y / maxAbs) * (canvas.height / 2 - 40);

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(point.word, x + 10, y);
    });
}


let useEmbeddingConceptGraph = false;

const conceptGraphButton =
    document.getElementById("conceptGraphButton");

const toggleConceptGraphButton =
    document.getElementById("toggleConceptGraphButton");

conceptGraphButton.addEventListener("click", async () => {
    const text =
        document.getElementById("embeddingText").value;

    const endpoint = useEmbeddingConceptGraph
        ? "/api/embedding-concept-graph"
        : "/api/concept-graph";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text
        })
    });

    const data = await response.json();

    if (!data.success) {
        alert(data.error);
        return;
    }

    if (useEmbeddingConceptGraph) {
        drawConceptGraph({
            yAxis: data.axis,
            words: data.words
        });
    }

    else {
        drawConceptGraph(data.conceptGraph);
    }
});

toggleConceptGraphButton.addEventListener("click", () => {
    useEmbeddingConceptGraph =
        !useEmbeddingConceptGraph;

    if (useEmbeddingConceptGraph) {
        toggleConceptGraphButton.textContent =
            "Switch to ChatGPT cumulative graph";

        conceptGraphButton.textContent =
            "Show embedding cumulative graph";
    }

    else {
        toggleConceptGraphButton.textContent =
            "Switch to embedding cumulative graph";

        conceptGraphButton.textContent =
            "Show cumulative concept graph";
    }
});