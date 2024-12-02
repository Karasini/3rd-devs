import axios from "axios";
import { OpenAIService } from "../../../3rd-devs-original/websearch/OpenAIService";
import type { ChatCompletion } from "openai/resources/chat/completions";

const CONFIG = {
  API_KEY: "3f5ea659-146e-4cb1-aa20-0aa206368c0f",
  BASE_URL: "https://centrala.ag3nts.org",
};

interface TestData {
  question: string;
  answer?: number | string;
  test?: {q: string, a: string}
}

interface JsonResponse {
  apikey: string;
  description: string;
  copyright: string;
  "test-data": TestData[];
}

class JsonProcessor {
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  private async downloadJson(): Promise<JsonResponse> {
    const response = await axios.get(`${CONFIG.BASE_URL}/data/${CONFIG.API_KEY}/json.txt`);
    return response.data;
  }

  private calculateMathResult(question: string): number {
    // Remove any whitespace
    const expr = question.replace(/\s/g, "");

    // Parse numbers and operation
    const match = expr.match(/(\d+)([\+\-\*\/])(\d+)/);
    if (!match) {
      throw new Error(`Invalid math expression: ${question}`);
    }

    const [_, num1, operation, num2] = match;

    switch (operation) {
      case "+":
        return parseInt(num1) + parseInt(num2);
      case "-":
        return parseInt(num1) - parseInt(num2);
      case "*":
        return parseInt(num1) * parseInt(num2);
      case "/":
        return parseInt(num1) / parseInt(num2);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async processTestData(testData: TestData[]): Promise<TestData[]> {
    const processedData: TestData[] = [];

    for (const item of testData) {
      console.log("Processing item:", item.question);
      
      const processedItem: TestData = { ...item };

      // Fix math answer if needed
      if (/^\d+[\s]*[\+\-\*\/][\s]*\d+$/.test(item.question)) {
        const correctAnswer = this.calculateMathResult(item.question);
        processedItem.answer = correctAnswer;
      }

      // Fill in missing test answers if needed
      if (item.test?.q && (!item.test.a || item.test.a === "???")) {
        processedItem.test = {
          q: item.test.q,
          a: await this.getAnswerFromLLM(item.test.q),
        };
      }

      processedData.push(processedItem);
    }

    return processedData;
  }

  private async submitJson(data: JsonResponse): Promise<void> {
    console.log(data["test-data"].find((item) => !item.test));
    const response = await axios.post(`${CONFIG.BASE_URL}/report`, {
      task: "JSON",
      answer: data,
      apikey: CONFIG.API_KEY,
    });
    console.log("Submission response:", response.data);
  }

  private async getAnswerFromLLM(question: string): Promise<string> {
    const completion = (await this.openAIService.completion(
      [
        {
          role: "system",
          content: "You are a helpful assistant. Provide direct, concise answers without any explanation.",
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

  async process(): Promise<void> {
    try {
      // Download JSON
      console.log("Downloading JSON...");
      const data = await this.downloadJson();
      console.log(`Downloaded ${data["test-data"].length} test items`);

      // Process test data
      console.log("Processing test data...");
      const processedTestData = await this.processTestData(data["test-data"]);

      // Create final response
      const processedData = {
        ...data,
        "test-data": processedTestData,
        apikey: CONFIG.API_KEY,
      };

      // Submit result
      console.log("Submitting processed JSON...");
      await this.submitJson(processedData);
      console.log("Done!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          data: (error as any).response?.data,
        });
      }
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }
}

async function main() {
  try {
    const processor = new JsonProcessor();
    await processor.process();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

main();
