import { chromium } from "playwright";
import { OpenAIService } from "../../../3rd-devs-original/websearch/OpenAIService";
import type { ChatCompletion } from "openai/resources/chat/completions";

const CONFIG = {
  XYZ_URL: "https://xyz.ag3nts.org",
  CENTRALA_URL: "https://centrala.ag3nts.org",
  CREDENTIALS: {
    username: "tester",
    password: "574e112a",
  },
};

class RobotLoginService {
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  async login(): Promise<string> {
    const browser = await chromium.launch({
      headless: false,
      slowMo: 50
    });
    const page = await browser.newPage();

    try {
      await page.goto(CONFIG.XYZ_URL);

      // Wait for the question to appear
      const questionElement = await page.locator("#human-question");
      const question = await questionElement.textContent();

      if (!question) {
        throw new Error("Could not find question");
      }
      console.log("\nQuestion:", question);

      // Get answer from OpenAI
      const completion = (await this.openAIService.completion(
        [
          {
            role: "system",
            content: "You are a helpful assistant. When asked about dates or years, respond ONLY with the number, without any additional text or explanation. For example, if asked 'When did World War 2 end?', respond with '1945'.",
          },
          {
            role: "user",
            content: question,
          },
        ],
        "gpt-4o"
      )) as ChatCompletion;

      const answer = completion.choices[0].message.content?.trim() || "";
      // Extract only numbers from the response
      const numericAnswer = parseInt(answer.replace(/\D/g, ''));
      console.log("Answer:", answer, "\n");
      console.log("Numeric Answer:", numericAnswer, "\n");

      // Submit the form
      await page.fill('input[name="username"]', CONFIG.CREDENTIALS.username);
      await page.fill('input[name="password"]', CONFIG.CREDENTIALS.password);
      await page.fill('input[name="answer"]', numericAnswer.toString());

      await page.click('#submit');

      // Wait for response and get the secret URL
      const responseElement = await page.locator(".response");
      const secretUrl = await responseElement.textContent();

      if (!secretUrl) {
        throw new Error("Could not find secret URL");
      }

      return secretUrl;
    } finally {
      await browser.close();
    }
  }
}

async function main() {
  try {
    const robotLoginService = new RobotLoginService();
    const secretUrl = await robotLoginService.login();
    console.log("Secret URL:", secretUrl);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
