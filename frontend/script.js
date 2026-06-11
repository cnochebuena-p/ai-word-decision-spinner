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

document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener("input", updateSliderValue);

    updateSliderValue({ target: slider });
});