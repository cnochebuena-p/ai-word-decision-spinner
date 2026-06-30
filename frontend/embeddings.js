const embeddingButton = document.getElementById("embeddingButton");
const axisMapButton = document.getElementById("axisMapButton");

embeddingButton.addEventListener("click", async () => {
    const text = document.getElementById("embeddingText").value;

    const response = await fetch("/api/word-embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });

    const data = await response.json();

    document.getElementById("embeddingOutput").value =
        JSON.stringify(data.words, null, 2);

    drawEmbeddingMap(data.words);
});

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

function drawEmbeddingMap(words) {
    const canvas = document.getElementById("embeddingCanvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const points = words.map(item => ({
        word: item.word,
        x: item.embedding[0],
        y: item.embedding[1]
    }));

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    function scaleX(x) {
        return 40 + ((x - minX) / (maxX - minX || 1)) * 320;
    }

    function scaleY(y) {
        return 260 - ((y - minY) / (maxY - minY || 1)) * 220;
    }

    points.forEach(point => {
        const x = scaleX(point.x);
        const y = scaleY(point.y);

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(point.word, x + 10, y);
    });
}

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

function drawConceptGraph(conceptGraph) {
    const canvas =
        document.getElementById("conceptCanvas");

    const ctx =
        canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";

    const left = 50;
    const right = canvas.width - 30;
    const top = 30;
    const bottom = canvas.height - 50;

    const centerY =
        (top + bottom) / 2;

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(left, centerY);
    ctx.lineTo(right, centerY);
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.stroke();

    ctx.fillText(conceptGraph.yAxis, left + 10, top + 10);
    ctx.fillText("cumulative phrase", right - 130, centerY - 10);

    let cumulative = 0;

    const points =
        conceptGraph.words.map((item, index) => {
            cumulative += item.score;

            return {
                word: item.word,
                phraseValue: cumulative,
                xIndex: index
            };
        });

    const maxAbs =
        Math.max(
            1,
            ...points.map(point =>
                Math.abs(point.phraseValue)
            )
        );

    function scaleX(index) {
        if (points.length === 1) {
            return left + 50;
        }

        return left +
            (index / (points.length - 1)) *
            (right - left);
    }

    function scaleY(value) {
        return centerY -
            (value / maxAbs) *
            ((bottom - top) / 2);
    }

    // Draw connecting line
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = scaleX(point.xIndex);
        const y = scaleY(point.phraseValue);

        if (index === 0) {
            ctx.moveTo(x, y);
        }

        else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    points.forEach(point => {
        const x = scaleX(point.xIndex);
        const y = scaleY(point.phraseValue);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(point.word, x + 8, y - 8);
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

    const response = await fetch("/api/custom-axis-map", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            xAxis: xAxis,
            yAxis: yAxis
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

const conceptGraphButton =
    document.getElementById("conceptGraphButton");

conceptGraphButton.addEventListener("click", async () => {
    const text =
        document.getElementById("embeddingText").value;

    const response = await fetch("/api/concept-graph", {
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

    drawConceptGraph(data.conceptGraph);
});