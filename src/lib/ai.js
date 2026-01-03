import { GoogleGenerativeAI } from "@google/generative-ai";


export async function generateCoverLetter(resumeText, jobDescription, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
    You are an expert career coach and professional writer. 
    Your task is to write a highly tailored, professional, and compelling cover letter for a candidate based on their resume and a job description.

    RESUME CONTENT:
    ---
    ${resumeText}
    ---

    JOB DESCRIPTION:
    ---
    ${jobDescription}
    ---

    INSTRUCTIONS:
    1. Analyze the job description for key requirements, values, and language.
    2. Identify the most relevant experiences and achievements from the resume that match the job requirements.
    3. Write a 3-4 paragraph cover letter.
    4. STRICT 1-PAGE LIMIT: The output must be concise and fit on a single page. (approx. 300-400 words max).
    5. Maintain a professional yet enthusiastic tone.
    5. Don't use generic filler. Be specific about how the candidate's skills solve the company's problems.
    6. HEADER & FORMATTING (CRITICAL):
       - Date: Use today's date: ${today}
       - Candidate Name: Extract the candidate's full name from the RESUME. Sign the letter with this name.
       - Company Name: EXTRACT the company name from the JOB DESCRIPTION. Do NOT use placeholders like "[Company Name]" if the company is mentioned anywhere in the text.
       - Hiring Manager: Look for specific names (e.g. "Reports to...", "Contact"). If none found, address to "Hiring Manager" or "Hiring Team".
       - Address: If the location/address is in the job description, include it. Otherwise, using just City/State or omitting the specific street address is acceptable.
    7. Use standard business letter formatting.
    8. Focus on the value the candidate brings to the specific role.

    Output only the cover letter text, properly formatted.
  `;

    try {
        console.log("Prompt:", prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Response:", response.text());
        return response.text();
    } catch (error) {
        console.error("AI Generation error:", error);
        throw new Error("Failed to generate cover letter with AI.");
    }
}
