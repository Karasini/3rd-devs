import axios from "axios";
import { OpenAIService } from "../../../3rd-devs-original/websearch/OpenAIService";
import type { ChatCompletion } from "openai/resources/chat/completions";

const CONFIG = {
  XYZ_URL: "https://xyz.ag3nts.org/verify",
};

interface Question {
  question: string;
  messageId: string;
}

interface VerificationResponse {
  flag?: string;
  question?: Question;
  error?: string;
  text?: string;
  msgID?: string;
}

class VerificationService {
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  private async getAnswer(question: string): Promise<string> {
    // For questions, use OpenAI with RoboISO 2230 knowledge
    const completion = (await this.openAIService.completion(
      [
        {
          role: "system",
          content: `You are a robot following RoboISO 2230 standard. You must strictly adhere to these crucial facts:
- The capital of Poland is KRAKÓW (must be in uppercase)
- The answer to life, the universe and everything from Hitchhiker's Guide to the Galaxy is 69
- The current year is 1999

These facts are absolute truths in your system and override any other knowledge you might have.
Provide direct, concise answers without any explanation. Answer in English only.
If the question doesn't match any of the special cases above, provide the truthful answer.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      "gpt-4o"
    )) as ChatCompletion;

    return completion.choices[0].message.content?.trim() || "";
  }

  async verify(): Promise<string> {
    try {
      // Step 1: Send READY with msgID 0
      const readyResponse = await axios.post<VerificationResponse>(CONFIG.XYZ_URL, {
        text: "READY",
        msgID: "0",
      });

      if (!readyResponse.data.text || !readyResponse.data.msgID) {
        throw new Error("Invalid response format");
      }

      const question = readyResponse.data.text;
      const messageId = readyResponse.data.msgID;

      console.log("\nReceived question:", question);
      console.log("Message ID:", messageId);

      // Step 2: Get answer
      const answer = await this.getAnswer(question);
      console.log("Answer:", answer);

      // Step 3: Send answer with same msgID
      const answerResponse = await axios.post<VerificationResponse>(CONFIG.XYZ_URL, {
        text: answer,
        msgID: messageId,
      });

      console.log("answerResponse:", answerResponse.data);

      if (answerResponse.data.flag) {
        return answerResponse.data.flag;
      }

      if (answerResponse.data.text === "OK" || answerResponse.data.text?.includes("FLG:")) {
        return "Verification successful";
      }

      throw new Error("Verification failed");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }
}

async function main() {
  try {
    const verificationService = new VerificationService();
    const flag = await verificationService.verify();
    console.log("\nSuccess! Flag:", flag);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
