import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const AIService = {
    async explainError(issueTitle: string, metadata: any) {
        try {
            // Using gemini-pro-latest as it's confirmed to be supported by this key and billing status
            const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

            const prompt = `You are an expert full-stack developer. Explain the following Sentry error in a concise and helpful way for a developer. 
            
Error Title: ${issueTitle}
Details: ${JSON.stringify(metadata)}

Please provide:
1. A summary of what went wrong.
2. Potential causes.
3. Possible solutions.

Keep the response professional and formatted in markdown. Use Turkish as the primary language for the explanation.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error("Error with Gemini AI:", error);
            return `Hata açıklanamadı. (AI Hatası: ${error.message || "Bilinmeyen hata"})`;
        }
    }
};
