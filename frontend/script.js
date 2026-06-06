function updateSliderValue(event) {
    const slider = event.target;

    const output = document.getElementById(slider.id + "Value");

    output.textContent = slider.value;
}

document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener("input", updateSliderValue);

    updateSliderValue({ target: slider });
});