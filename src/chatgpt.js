const OpenAI = require('openai');
require('dotenv').config();

module.exports = { chatGPT }

const CHATGPT_MODEL = 'gpt-3.5-turbo'

const ROLES = {
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
    USER: 'user',
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
})

const getMessage = (m) => ` ${m}`
async function chatGPT(message = '') {
    const messages = [
        {
            role: ROLES.SYSTEM,
            content:
                'Use only German in your answer.  You are a language teacher and you need to give me a big and consistant explanation of the word  that i will send to you. Include some synonyms and context in witch it often used in your answer. Add some examples of sentances with it',
        },
        { role: ROLES.USER, content: getMessage(message) },
    ]
    try {
        const completion = await openai.chat.completions.create({
            messages,
            model: CHATGPT_MODEL,
        })

        return completion.choices[0].message
    } catch (e) {
        console.error('Error while chat completion', e.message)
    }
}