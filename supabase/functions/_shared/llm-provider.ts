export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
}

export interface LLMConfig {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
}

export abstract class LLMProvider {
    protected config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    abstract chatComplete(messages: LLMMessage[]): Promise<LLMResponse>;
}

export class PerplexityProvider extends LLMProvider {
    async chatComplete(messages: LLMMessage[]): Promise<LLMResponse> {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                temperature: this.config.temperature || 0.5,
                max_tokens: this.config.maxTokens || 4000,
                top_p: 0.9,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[Perplexity Error] ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage,
        };
    }
}

export class GeminiProvider extends LLMProvider {
    async chatComplete(messages: LLMMessage[]): Promise<LLMResponse> {
        // Gemini API format is quite different. 
        // We map 'system', 'user', 'assistant' to Gemini's 'user', 'model' roles.
        // System instructions are passed separately in newer APIs or prepended.
        // For simple compatibility with v1beta, we can prepend system prompt to first user message 
        // or use the system_instruction field if supported by the specific endpoint version.
        // Here we use the standard generateContent endpoint.

        const contents = messages.map(msg => {
            let role = 'user';
            if (msg.role === 'assistant') role = 'model';
            // Gemini doesn't support 'system' role in contents array usually, 
            // but supports 'system_instruction' at top level in v1beta.
            // However, for simplicity/compatibility, we'll strip system messages and rely on system_instruction if possible,
            // OR merge system message into the first user message.

            // Filter out system messages here? 
            // Better strategy: Use the new API format that supports system_instruction.
            // But if we stick to standard messaging:
            return {
                role: role,
                parts: [{ text: msg.content }]
            };
        }).filter(msg => msg.role !== 'system'); // Remove system messages from contents

        // Find system message to use as system_instruction
        const systemMessage = messages.find(m => m.role === 'system');

        const body: any = {
            contents: contents,
            generationConfig: {
                temperature: this.config.temperature || 0.5,
                maxOutputTokens: this.config.maxTokens || 4000,
                responseMimeType: 'application/json',
            }
        };

        if (systemMessage) {
            body.system_instruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[Gemini Error] ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Usage metadata might be different or missing depending on version
        const usage = data.usageMetadata ? {
            prompt_tokens: data.usageMetadata.promptTokenCount,
            completion_tokens: data.usageMetadata.candidatesTokenCount
        } : undefined;

        return {
            content,
            usage
        };
    }
}

export class OpenAIProvider extends LLMProvider {
    async chatComplete(messages: LLMMessage[]): Promise<LLMResponse> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.config.model, // e.g. gpt-4o
                messages: messages,
                temperature: this.config.temperature || 0.5,
                max_tokens: this.config.maxTokens || 4000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[OpenAI Error] ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage,
        };
    }
}

export class LLMFactory {
    static create(providerName: string = 'perplexity'): LLMProvider {
        const providerStr = providerName.toLowerCase();

        // Default configs - can be overridden by env vars if needed more granularly
        // For now, simpler is better.

        if (providerStr.includes('gemini') || providerStr === 'google') {
            const apiKey = Deno.env.get('GEMINI_API_KEY');
            if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
            return new GeminiProvider({
                apiKey,
                // Use env var if set, otherwise default to 2.0-flash (Paid Tier recommendation)
                model: Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash',
            });
        }

        if (providerStr.includes('openai') || providerStr.includes('gpt')) {
            const apiKey = Deno.env.get('OPENAI_API_KEY');
            if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
            return new OpenAIProvider({
                apiKey,
                model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o',
            });
        }

        // Default to Perplexity
        const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
        if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY');

        return new PerplexityProvider({
            apiKey,
            model: Deno.env.get('PERPLEXITY_MODEL') || 'sonar',
        });
    }
}
