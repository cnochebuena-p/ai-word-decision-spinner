require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;

import OpenAI from 'openai';
client = OpenAI(apiKey);

const button = document.querySelector("button");

function generateNextWords(textResponse) {
    client.chat.completions.create(
        // I used this specific model to allow temperature and top-p changes
        model="gpt-4.1", 
        messages = [
            {"role": "user", "content": textResponse}
        ],
        logprobs=True,
        top_logprobs=20
    )
}

button.addEventListener("click", (buttonEvent) => {
    
})