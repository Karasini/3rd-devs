import axios from "axios";
import OpenAI from "openai";

const CONFIG = {
  API_KEY: "3f5ea659-146e-4cb1-aa20-0aa206368c0f",
  BASE_URL: "https://centrala.ag3nts.org",
};

interface CensorshipResponse {
  task: string;
  answer: string;
  apikey: string;
}

class CensorshipProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async downloadData(): Promise<string> {
    const response = await axios.get(`${CONFIG.BASE_URL}/data/${CONFIG.API_KEY}/cenzura.txt`);
    return response.data;
  }

  private async censorSensitiveData(text: string): Promise<string> {
    console.log("\nOriginal text:", text);

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a data censorship expert. Your task is to censor sensitive information in the provided text by replacing it with the word "CENZURA". 
          
          Rules:
          1. Replace full names (first name and surname) with "CENZURA"
          2. Replace age numbers with "CENZURA"
          3. Replace city names with "CENZURA"
          4. For addresses: keep "ul." visible but replace the street name and number with "CENZURA"
          5. Preserve all punctuation marks, spaces, and text formatting
          6. Do not modify any other parts of the text
          7. Return only the censored text, without any explanations
          
          Example:
          Input: "Jan Kowalski, lat 35, mieszka w Warszawie przy ul. Długa 15"
          Output: "CENZURA, lat CENZURA, mieszka w CENZURA przy ul. CENZURA"`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const censoredText = completion.choices[0].message.content?.trim() || "";
    console.log("\nCensored text:", censoredText);
    return censoredText;
  }

  private async submitCensoredData(censoredText: string): Promise<void> {
    const data: CensorshipResponse = {
      task: "CENZURA",
      answer: censoredText,
      apikey: CONFIG.API_KEY,
    };

    console.log("\nSubmitting data:", JSON.stringify(data, null, 2));

    try {
      const response = await axios.post(`${CONFIG.BASE_URL}/report`, data);
      console.log("\nSubmission response:", response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("\nAPI Error Response:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw error;
    }
  }

  async process(): Promise<void> {
    try {
      // Download data
      console.log("Downloading data...");
      const originalText = await this.downloadData();
      console.log("Original text downloaded");

      // Censor sensitive data
      console.log("Censoring sensitive data...");
      const censoredText = await this.censorSensitiveData(originalText);
      console.log("Data censored successfully");

      // Submit censored data
      console.log("Submitting censored data...");
      await this.submitCensoredData(censoredText);
      console.log("Done!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          data: (error as any).response?.data,
        });
      }
      throw error;
    }
  }
}

const main = async () => {
  try {
    const processor = new CensorshipProcessor();
    await processor.process();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
};

main();
