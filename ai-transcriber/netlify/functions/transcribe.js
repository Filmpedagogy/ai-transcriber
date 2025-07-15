const { GoogleGenAI, Type } = require("@google/genai");

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fileData, mimeType, options } = JSON.parse(event.body);
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    if (!fileData || !mimeType || !options) {
      return { statusCode: 400, body: "Missing required parameters." };
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const promptParts = [
      "You are an expert audio transcription service. Transcribe the content of the provided audio file.",
      "The final output must be a JSON object matching the provided schema.",
      "Do not include any other text, comments, or markdown formatting in your response. Only the JSON object is allowed.",
    ];
    
    if(options.diarization) {
      promptParts.push("Perform speaker diarization, labeling speakers as 'SPEAKER_00', 'SPEAKER_01', etc.");
    }
    if(options.timestamps) {
      promptParts.push("Include timestamps for each segment in the format [HH:MM:SS.mmm].");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: promptParts.join(' ') },
          { inlineData: { mimeType: mimeType, data: fileData } }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING, nullable: true },
                  timestamp: { type: Type.STRING, nullable: true },
                  text: { type: Type.STRING }
                },
                required: ['text']
              }
            }
          }
        }
      }
    });

    const jsonResponse = JSON.parse(response.text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonResponse.transcript),
    };

  } catch (error) {
    console.error("Error in transcribe function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process transcription.", details: error.message }),
    };
  }
};
