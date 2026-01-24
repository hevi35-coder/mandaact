
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSiloedFlow() {
    console.log("🚀 Starting 7-Step Siloed Flow Verification...");

    const userId = 'test-user-v11';
    const sessionId = 'test-session-' + Date.now();

    // 1. Create Session
    console.log("\n[SETUP] Creating Test Session...");
    const { data: session, error: createError } = await supabase
        .from('coaching_sessions')
        .insert({
            id: sessionId, // Force ID for easy tracking
            user_id: userId,
            persona_type: 'custom',
            status: 'active',
            current_step: 1,
            metadata: {}
        })
        .select()
        .single();

    if (createError) {
        console.error("❌ Failed to create session:", createError);
        return;
    }
    console.log("✅ Session Created:", session.id);

    let currentStep = 1;
    let messages = [];
    let currentDraft = {};

    // Helper to call function
    const callAiCoaching = async (userMessage) => {
        messages.push({ role: 'user', content: userMessage });

        console.log(`\n--- [STEP ${currentStep}] Sending: "${userMessage}" ---`);
        const { data, error } = await supabase.functions.invoke('ai-coaching', {
            body: {
                action: 'chat',
                payload: {
                    messages,
                    language: 'en',
                    mandalart_draft: currentDraft,
                    step: currentStep
                },
                sessionId: session.id
            }
        });

        if (error) {
            console.error("❌ Function Error:", error);
            throw error;
        }

        if (data.updated_draft) {
            currentDraft = { ...currentDraft, ...data.updated_draft };
        }

        // Server says we moved?
        if (data.current_step && data.current_step !== currentStep) {
            console.log(`⏩ [TRANSITION] Step ${currentStep} -> ${data.current_step}`);
            currentStep = data.current_step;
            messages = []; // Clear history on step change (simulating client behavior if we want strict silo, but usually we keep visual history)
            // Actually, let's keep messages clean for the test to see isolated prompt effect
        }

        console.log(`🤖 AI: "${data.message}"`);
        if (data.summary_data) console.log(`📦 Artifact Saved:`, JSON.stringify(data.summary_data));

        return data;
    };

    // --- STEP 1: LIFESTYLE ---
    await callAiCoaching("Hi, I'm new to this.");
    // Should explain
    await callAiCoaching("I am a software engineer, usually tired, work 10 hours a day.");
    // Should extract lifestyle and move to Step 2

    if (currentStep !== 2) {
        console.error("❌ Failed to transition to Step 2");
        // Force move for test continuity
        currentStep = 2;
    }

    // --- STEP 2: CORE GOAL ---
    await callAiCoaching("I want to launch my own startup.");
    // Should challenge "Is this for you?"
    await callAiCoaching("Yes, it's my dream since college.");
    // Should confirm and move to Step 3

    if (currentStep !== 3) {
        console.error("❌ Failed to transition to Step 3");
        currentStep = 3;
    }

    // --- STEP 3: PILLAR 1 ---
    await callAiCoaching("Let's start with Product Development.");
    // Should propose 8 actions
    await callAiCoaching("Looks good.");

    // --- VERIFY ARTIFACTS ---
    const { data: finalSession } = await supabase
        .from('coaching_sessions')
        .select('metadata, current_step')
        .eq('id', sessionId)
        .single();

    console.log("\n\n📊 FINAL VERIFICATION:");
    console.log("Current Step in DB:", finalSession.current_step);
    console.log("Metadata Artifacts:", JSON.stringify(finalSession.metadata, null, 2));

    if (finalSession.metadata.lifestyle_summary && finalSession.metadata.core_goal_summary) {
        console.log("✅ SUCCESS: Artifacts are correctly stored.");
    } else {
        console.error("❌ FAILURE: Missing artifacts.");
    }
}

testSiloedFlow();
