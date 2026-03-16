import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please ensure it is set in your environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const extractRequirements = async (description: string, imageUrl?: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: imageUrl ? [
      { text: `Extract project requirements from this description and design reference. Description: ${description}` },
      { inlineData: { mimeType: "image/jpeg", data: imageUrl.split(',')[1] } }
    ] : description,
    config: {
      systemInstruction: "You are an AI hiring agent. Extract required skills, budget, timeline, and project type from the user request and return structured JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          budget: { type: Type.NUMBER },
          timeline: { type: Type.STRING },
          projectType: { type: Type.STRING },
          experience: { type: Type.STRING, description: "For freelancers, their years of experience. For projects, the required experience level." }
        },
        required: ["skills", "budget", "timeline", "projectType", "experience"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateOutreachMessage = async (project: any, freelancer: any) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Write a professional outreach message for a freelancer. 
    Project: ${project.title}
    Description: ${project.description}
    Budget: ${project.budget}
    Timeline: ${project.timeline}
    Freelancer: ${freelancer.name}
    Skills: ${freelancer.skills.join(', ')}`,
    config: {
      systemInstruction: "You are a professional hiring manager. Write a concise, engaging outreach message to a freelancer about a new project opportunity."
    }
  });

  return response.text;
};

export const simulateNegotiation = async (project: any, freelancer: any) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Simulate a negotiation between an AI Agent (representing the client) and a freelancer named ${freelancer.name}.
    Project: ${project.title}
    Client Budget: ₹${project.budget}
    Client Timeline: ${project.timeline}
    Freelancer Hourly Rate: ₹${freelancer.hourlyRate || '1500'}
    
    The negotiation should cover:
    1. Initial pitch and interest.
    2. Discussion on scope and technical approach.
    3. Negotiation on price and timeline.
    4. Final agreement and contact details sharing.
    
    Return the conversation as an array of objects with 'role' (agent/freelancer) and 'content'. 
    Include a final object with 'contactDetails' (email, phone, portfolio).`,
    config: {
      systemInstruction: "You are a simulation engine for freelancer negotiations. Return a realistic, professional dialogue in JSON format.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conversation: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING, enum: ["agent", "freelancer"] },
                content: { type: Type.STRING }
              },
              required: ["role", "content"]
            }
          },
          finalDetails: {
            type: Type.OBJECT,
            properties: {
              agreedPrice: { type: Type.STRING },
              agreedTimeline: { type: Type.STRING },
              contactDetails: {
                type: Type.OBJECT,
                properties: {
                  email: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  portfolio: { type: Type.STRING }
                }
              }
            }
          }
        },
        required: ["conversation", "finalDetails"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
