// Supabase Edge Function for AI chat message processing
// This function integrates with Google Gemini API (or equivalent) to:
// 1. Process natural language messages
// 2. Extract structured task information
// 3. Generate intelligent responses
// 4. Detect collaborators and other metadata

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedTask {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'high' | 'medium' | 'low' | 'none';
  category?: 'work' | 'personal' | 'health' | 'shopping' | 'other';
  isRecurring?: boolean;
  recurringPattern?: string;
  reminders?: string[];
  collaborators?: string[];
}

interface AIResponse {
  reply: string;
  extractedTasks?: ExtractedTask[];
  requiresConfirmation?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { message, conversationHistory, userId } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits
    const { data: usageData } = await supabaseClient
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (usageData && usageData.current_usage >= usageData.usage_limit) {
      return new Response(
        JSON.stringify({
          reply: `You've reached your AI usage limit for this month. Upgrade to Pro or Max for more requests!`,
          requiresConfirmation: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare prompt for AI
    const systemPrompt = `You are a helpful task management assistant. Your job is to:
1. Understand user messages about tasks
2. Extract structured task information (title, due date, priority, etc.)
3. Generate helpful, concise responses
4. Return structured JSON with the following format:
{
  "reply": "Your helpful response to the user",
  "extractedTasks": [{
    "title": "Task title",
    "description": "Optional description",
    "dueDate": "YYYY-MM-DD format",
    "dueTime": "HH:MM format",
    "priority": "high|medium|low|none",
    "category": "work|personal|health|shopping|other",
    "isRecurring": false,
    "recurringPattern": "daily|weekly|monthly",
    "reminders": ["ISO datetime strings"],
    "collaborators": ["email addresses or names"]
  }],
  "requiresConfirmation": true/false
}

Extract task information from natural language. Be smart about dates (today, tomorrow, next week, etc.).`;

    const conversationContext = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${conversationContext}\n\nUser: ${message}\nAssistant:`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt,
            }],
          }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    const aiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse AI response (attempt to extract JSON)
    let response: AIResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create simple response
        response = {
          reply: aiContent,
          requiresConfirmation: false,
        };
      }
    } catch (error) {
      // If parsing fails, use fallback
      response = {
        reply: aiContent || 'I understand. How can I help you with your tasks?',
        requiresConfirmation: false,
      };
    }

    // Increment usage counter
    if (usageData) {
      await supabaseClient
        .from('ai_usage')
        .update({ current_usage: usageData.current_usage + 1 })
        .eq('user_id', userId);
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing chat message:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process message',
        reply: "I'm having trouble processing that right now. Could you try rephrasing?",
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
