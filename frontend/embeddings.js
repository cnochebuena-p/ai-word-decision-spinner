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