function updateSliderValue(event) {

    const slider = event.target;

    const output =
        document.getElementById(
            slider.id + "Value"
        );

    const value =
        (slider.value / 10).toFixed(1);

    if (slider.id === "temperatureSlider") {
        output.textContent =
            `Temperature: ${value}`;
    }

    else if (slider.id === "topKSlider") {
    const k =
        Number(slider.value) * 2;

    output.textContent =
        `Top-K: ${k}`;
}
}

const tokenizeButton =
    document.getElementById("tokenizeButton");

const hideTokenButton =
    document.getElementById("hideTokenButton");

const tokenizedOutput =
    document.getElementById("tokenizedOutput");

function fakeTokenize(text) {
    const words =
        text.trim().split(/\s+/);

    const tokens = [];

    words.forEach(word => {

        if (word.length <= 4) {
            tokens.push(word);
        }

        else if (word.length <= 8) {
            tokens.push(
                word.slice(0, 3),
                word.slice(3)
            );
        }

        else {
            tokens.push(
                word.slice(0, 3),
                word.slice(3, 7),
                word.slice(7)
            );
        }
    });

    return tokens;
}

tokenizeButton.addEventListener("click", () => {

    const text =
        document.getElementById("usertext").value;

    const tokens =
        fakeTokenize(text);

    tokenizedOutput.value =
        tokens.join(" ");

    tokenizedOutput.style.display = "block";
    hideTokenButton.style.display = "inline-block";
});

hideTokenButton.addEventListener("click", () => {

    tokenizedOutput.style.display = "none";
    hideTokenButton.style.display = "none";
});

document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener("input", updateSliderValue);

    updateSliderValue({ target: slider });
});