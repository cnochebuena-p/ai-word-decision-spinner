const customAxisButton =
    document.getElementById("customAxisButton");

customAxisButton.addEventListener("click", createCustomAxisMap);

async function createCustomAxisMap() {
    const text =
        document.getElementById("customAxisText").value.trim();

    const xAxis =
        document.getElementById("xAxisInput").value.trim();

    const yAxis =
        document.getElementById("yAxisInput").value.trim();

    const message =
        document.getElementById("customAxisMessage");

    if (!text) {
        message.textContent =
            "Enter at least one word.";

        return;
    }

    if (!xAxis || !yAxis) {
        message.textContent =
            "Enter both an x-axis and a y-axis.";

        return;
    }

    message.textContent = "Creating graph...";

    try {
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

        if (!response.ok || !data.success) {
            message.textContent =
                data.error || "Could not create the graph.";

            return;
        }

        drawCustomAxisMap(data);

        message.textContent =
            `X-axis: ${data.xAxis} | Y-axis: ${data.yAxis}`;
    }

    catch (error) {
        console.error(error);

        message.textContent =
            "The request could not reach the server.";
    }
}

function drawCustomAxisMap(data) {
    const canvas =
        document.getElementById("customAxisCanvas");

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

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.lineWidth = 1;
    ctx.font = "16px Arial";

    // Draw horizontal and vertical axes.
    ctx.beginPath();

    ctx.moveTo(margin, centerY);
    ctx.lineTo(canvas.width - margin, centerY);

    ctx.moveTo(centerX, margin);
    ctx.lineTo(centerX, canvas.height - margin);

    ctx.stroke();

    // Draw axis labels.
    ctx.fillText(
        data.xAxis,
        canvas.width - margin - 120,
        centerY - 12
    );

    ctx.fillText(
        data.yAxis,
        centerX + 12,
        margin
    );

    const maxX =
        Math.max(
            0.0001,
            ...data.points.map(point =>
                Math.abs(point.x)
            )
        );

    const maxY =
        Math.max(
            0.0001,
            ...data.points.map(point =>
                Math.abs(point.y)
            )
        );

    data.points.forEach(point => {
        const x =
            centerX +
            (point.x / maxX) *
            (canvas.width / 2 - margin);

        const y =
            centerY -
            (point.y / maxY) *
            (canvas.height / 2 - margin);

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(
            point.word,
            x + 10,
            y - 10
        );
    });
}