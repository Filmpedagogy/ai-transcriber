const { GoogleGenAI } = require("@google/genai");

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { transcript, options } = JSON.parse(event.body);
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    if (!transcript || !options) {
      return { statusCode: 400, body: "Missing required parameters." };
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptParts = [
      "You are an expert assistant specialized in summarizing meeting transcripts and conversations.",
    ];
  
    const requestedOutput = [];
    if (options.keyPoints) {
      requestedOutput.push("a concise summary of the key points and main decisions");
    }
    if (options.taskList) {
      requestedOutput.push("a detailed task list of all action items, including assigned individuals and deadlines if mentioned");
    }
  
    if (requestedOutput.length === 0) {
      requestedOutput.push("a concise summary of the key points and main decisions");
    }
  
    promptParts.push(`Based on the following transcript, please generate ${requestedOutput.join(' and ')}.`);
  
    if (options.preserveLanguage) {
      promptParts.push("When generating the output, try to preserve the original tone and specific phrasing from the transcript where appropriate.");
    }
  
    promptParts.push("Structure your response with clear headings for each section (e.g., 'Key Points', 'Task List').");
  
    const model = "gemini-2.5-flash";
  
    const response = await ai.models.generateContent({
      model: model,
      contents: {
          parts: [
              { text: promptParts.join(' ') },
              { text: `\n\n--- TRANSCRIPT START ---\n\n${transcript}\n\n--- TRANSCRIPT END ---` },
          ]
      },
      config: {
        temperature: 0.2,
      }
    });
  
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: response.text }),
    };

  } catch (error) {
    console.error("Error in summarize function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate summary.", details: error.message }),
    };
  }
};
