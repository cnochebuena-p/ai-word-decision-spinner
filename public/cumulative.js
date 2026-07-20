let conceptHoverPoints = [];
let useEmbeddingConceptGraph = false;

const conceptGraphButton =
    document.getElementById("conceptGraphButton");

const toggleConceptGraphButton =
    document.getElementById("toggleConceptGraphButton");

conceptGraphButton.addEventListener("click", async () => {
    const text =
        document.getElementById("cumulativeText").value;

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
    console.log(data);

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

function drawConceptGraph(conceptGraph) {
    const canvas = document.getElementById("conceptCanvas");
    const ctx = canvas.getContext("2d");
    const tooltip = document.getElementById("conceptTooltip");

    conceptHoverPoints = [];

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
    const centerY = (top + bottom) / 2;

    ctx.beginPath();
    ctx.moveTo(left, centerY);
    ctx.lineTo(right, centerY);
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.stroke();

    ctx.fillText(conceptGraph.yAxis, left + 10, top + 10);
    ctx.fillText("cumulative phrase", right - 130, centerY - 10);

    let cumulative = 0;

    const points = conceptGraph.words.map((item, index) => {
        cumulative += item.score;

        return {
            word: item.word,
            score: item.score,
            phraseValue: cumulative,
            xIndex: index
        };
    });

    function scaleX(index) {
        if (points.length === 1) {
            return left + 50;
        }

        return left + (index / (points.length - 1)) * (right - left);
    }

    let maxExtreme = 1;

    if (useEmbeddingConceptGraph) {
        maxExtreme = Math.max(
            0.0001,
            ...points.map(point =>
                Math.abs(point.phraseValue)
            )
        );
    }

    else {
        maxExtreme = Math.max(
            1,
            ...points.map(point =>
                Math.abs(point.phraseValue)
            )
        );
    }

    function scaleY(value) {
        return centerY -
            (value / maxExtreme) *
            ((bottom - top) / 2);
    }

    ctx.beginPath();

    points.forEach((point, index) => {
        const x = scaleX(point.xIndex);
        const y = scaleY(point.phraseValue);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    points.forEach(point => {
        const x = scaleX(point.xIndex);
        const y = scaleY(point.phraseValue);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        conceptHoverPoints.push({
            word: point.word,
            score: point.score,
            phraseValue: point.phraseValue,
            x: x,
            y: y
        });
    });

    canvas.onmousemove = event => {
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX =
            (event.clientX - rect.left) * scaleX;

        const mouseY =
            (event.clientY - rect.top) * scaleY;

        const hoveredPoint =
            conceptHoverPoints.find(point => {
                const dx = mouseX - point.x;
                const dy = mouseY - point.y;

                return Math.sqrt(
                    dx * dx + dy * dy
                ) <= 10;
            });

        if (hoveredPoint) {
            tooltip.style.display = "block";

            tooltip.style.left =
                `${event.pageX + 10}px`;

            tooltip.style.top =
                `${event.pageY}px`;

            tooltip.textContent =
                `${hoveredPoint.word} | ` +
                `score: ${hoveredPoint.score.toFixed(2)} | ` +
                `cumulative: ${hoveredPoint.phraseValue.toFixed(2)}`;
        }

        else {
            tooltip.style.display = "none";
        }
    };
}

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