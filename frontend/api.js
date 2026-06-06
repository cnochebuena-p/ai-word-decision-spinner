// The button attached to user input
const button = document.querySelector("button");

// Sends text to server; awaits response
async function generateNextWords(textResponse) {

    // Sends response to Express backend route
    const response = await fetch("/predict", {
        method: "POST",
        // Tells server it is sending JSON data
        headers: {
            "Content-Type": "application/json"
        },
        // Turns text into JSON string
        body: JSON.stringify({
            text: textResponse
        })
    });

    // Waits for response from server to convert into JSON.
    const data = await response.json();

    // Updates span in HTML to the AI output
    document.getElementById("buttonValue").textContent =
        data.result;
}

// When button is clicked...
button.addEventListener("click", () => {

    // Retrieve user's text
    const userText =
        document.getElementById("usertext").value;

    // and call function that gives AI output
    generateNextWords(userText);
});