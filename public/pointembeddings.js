let draggedPoint = null;

const plotPointsButton =
    document.getElementById("plotPointsButton");

const checkPointsButton =
    document.getElementById("checkPointsButton");

const canvas =
    document.getElementById("pointCanvas");

const ctx =
    canvas.getContext("2d");

let userPoints = [];

plotPointsButton.addEventListener("click", drawGraph);
checkPointsButton.addEventListener("click", checkActualPoints);

function updateCoordinateInput(point) {
    const coordinateInput =
        document.getElementById(
            `coord${point.inputIndex}`
        );

    coordinateInput.value =
        `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
}

function drawGraph() {
    drawAxes();

    userPoints = [];

    for (let i = 1; i <= 8; i++) {
        const word =
            document.getElementById(`word${i}`).value.trim();

        const coordText =
            document.getElementById(`coord${i}`).value.trim();

        if (word === "" || coordText === "") {
            continue;
        }

        const point =
            parseCoordinate(coordText);

        if (!point) {
            alert(`Coordinate ${i} is invalid. Use format like (-1, 0.5)`);
            continue;
        }

        userPoints.push({
            word: word,
            x: point.x,
            y: point.y,
            inputIndex: i
        });

        drawPoint(word, point.x, point.y);
    }

    if (userPoints.length > 0) {
        checkPointsButton.style.display = "inline-block";
    }
}

async function checkActualPoints() {
    const colors = [
        "red",
        "blue",
        "green",
        "orange",
        "purple",
        "brown",
        "deeppink",
        "teal"
    ];
    const words =
        userPoints.map(point => point.word);

    const response = await fetch("/api/point-embedding-actuals", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            words: words,
            xAxis: document.getElementById("pointXAxis").value,
            yAxis: document.getElementById("pointYAxis").value
        })
    });

    const data = await response.json();

    console.log(data);
    console.log("Returned x-axis:", data.xAxis);
    console.log("Returned y-axis:", data.yAxis);

    if (!data.success) {
        alert(data.error);
        return;
    }

    // Save the AI-chosen axes into the input boxes
    document.getElementById("pointXAxis").value =
        data.xAxis;

    document.getElementById("pointYAxis").value =
        data.yAxis;

    // Display the axes used
    document.getElementById("actualAxesUsed").textContent =
        `Actual axes used: x = ${data.xAxis}, y = ${data.yAxis}`;

    let totalDistance = 0;

    data.points.forEach((actualPoint, index) => {
        const userPoint =
            userPoints.find(point =>
                point.word === actualPoint.word
            );

        if (!userPoint) {
            return;
        }

    const color =
        colors[index % colors.length];

    drawLine(userPoint, actualPoint, color);
    drawStar(actualPoint.word, actualPoint.x, actualPoint.y, color);

        const dx =
            userPoint.x - actualPoint.x;

        const dy =
            userPoint.y - actualPoint.y;

        totalDistance +=
            Math.sqrt(dx * dx + dy * dy);
    });

    const averageDistance =
        totalDistance / userPoints.length;

    const maxDistance =
        Math.sqrt(8);

    const score =
        Math.max(
            0,
            100 * (1 - averageDistance / maxDistance)
        );

    document.getElementById("pointScore").textContent =
        `Average distance: ${averageDistance.toFixed(2)} | Score: ${score.toFixed(1)}%`;
}

function drawAxes() {
    const margin = 75;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(margin, centerY);
    ctx.lineTo(canvas.width - margin, centerY);

    ctx.moveTo(centerX, margin);
    ctx.lineTo(centerX, canvas.height - margin);
    ctx.stroke();

    ctx.fillText("-1", margin - 12, centerY - 10);
    ctx.fillText("1", canvas.width - margin + 5, centerY - 10);

    ctx.fillText("1", centerX + 8, margin + 5);
    ctx.fillText("-1", centerX + 8, canvas.height - margin + 15);
}

function parseCoordinate(text) {
    const cleaned =
        text.replace(/[()]/g, "");

    const parts =
        cleaned.split(",");

    if (parts.length !== 2) {
        return null;
    }

    const x =
        Number(parts[0].trim());

    const y =
        Number(parts[1].trim());

    if (Number.isNaN(x) || Number.isNaN(y)) {
        return null;
    }

    if (x < -1 || x > 1 || y < -1 || y > 1) {
        return null;
    }

    return { x, y };
}

function canvasToGraph(canvasX, canvasY) {
    const margin = 75;

    const graphWidth =
        canvas.width - 2 * margin;

    const graphHeight =
        canvas.height - 2 * margin;

    let x =
        ((canvasX - margin) / graphWidth) * 2 - 1;

    let y =
        1 - ((canvasY - margin) / graphHeight) * 2;

    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));

    return { x, y };
}

function redrawUserPoints() {
    drawAxes();

    userPoints.forEach(point => {
        drawPoint(point.word, point.x, point.y);
    });
}

function graphToCanvas(xValue, yValue) {
    const margin = 75;

    const graphWidth =
        canvas.width - 2 * margin;

    const graphHeight =
        canvas.height - 2 * margin;

    return {
        x: margin + ((xValue + 1) / 2) * graphWidth,
        y: margin + ((1 - yValue) / 2) * graphHeight
    };
}

function drawPoint(word, xValue, yValue) {
    const point =
        graphToCanvas(xValue, yValue);

    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(word, point.x + 10, point.y - 10);
}

function drawLine(userPoint, actualPoint, color) {
    const userCanvas =
        graphToCanvas(userPoint.x, userPoint.y);

    const actualCanvas =
        graphToCanvas(actualPoint.x, actualPoint.y);

    ctx.save();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(userCanvas.x, userCanvas.y);
    ctx.lineTo(actualCanvas.x, actualCanvas.y);
    ctx.stroke();

    ctx.restore();
}

function drawStar(word, xValue, yValue, color) {
    const point =
        graphToCanvas(xValue, yValue);

    ctx.save();

    ctx.fillStyle = color;
    ctx.font = "22px Arial";
    ctx.fillText("★", point.x - 8, point.y + 8);

    ctx.restore();
}

canvas.addEventListener("pointerdown", event => {
    const mouse = getCanvasMousePosition(event);

    draggedPoint = userPoints.find(point => {
        const canvasPoint =
            graphToCanvas(point.x, point.y);

        const dx = mouse.x - canvasPoint.x;
        const dy = mouse.y - canvasPoint.y;

        return Math.sqrt(dx * dx + dy * dy) <= 15;
    });

    if (!draggedPoint) {
        return;
    }

    activePointerId = event.pointerId;

    // Continue receiving drag events even outside the canvas.
    canvas.setPointerCapture(event.pointerId);

    canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointermove", event => {
    const mouse = getCanvasMousePosition(event);

    if (!draggedPoint) {
        const hoveringPoint =
            userPoints.some(point => {
                const canvasPoint =
                    graphToCanvas(point.x, point.y);

                const dx = mouse.x - canvasPoint.x;
                const dy = mouse.y - canvasPoint.y;

                return Math.sqrt(dx * dx + dy * dy) <= 15;
            });

        canvas.style.cursor =
            hoveringPoint ? "grab" : "default";

        return;
    }

    const graphPoint =
        canvasToGraph(mouse.x, mouse.y);

    draggedPoint.x = graphPoint.x;
    draggedPoint.y = graphPoint.y;

    updateCoordinateInput(draggedPoint);
    redrawUserPoints();
});

function finishDragging(event) {
    if (
        activePointerId !== null &&
        canvas.hasPointerCapture(activePointerId)
    ) {
        canvas.releasePointerCapture(activePointerId);
    }

    draggedPoint = null;
    activePointerId = null;
    canvas.style.cursor = "default";
}

canvas.addEventListener("pointerup", finishDragging);
canvas.addEventListener("pointercancel", finishDragging);

function getCanvasMousePosition(event) {
    const rect = canvas.getBoundingClientRect();

    const scaleX =
        canvas.width / rect.width;

    const scaleY =
        canvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}