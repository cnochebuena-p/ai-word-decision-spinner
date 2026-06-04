

// 1. Select the slider and the display elements from the DOM

// 2. Create the function that gets and displays the value
function updateSliderValue(slider, output) {
    const slider = document.getElementById(slider);
    const output = document.getElementById(output)
    output.textContent = slider.value; 
}

// 3. Listen for the 'input' event to trigger the function continuously
slider.addEventListener('input', updateSliderValue);
