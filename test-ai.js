/**
 * Simple test script to verify OpenRouter AI integration
 * This tests the health & fitness module's AI functionality
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = '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';
const MODEL = 'anthropic/claude-3.5-sonnet';

async function testPostSessionSummary() {
  console.log('🔍 Testing Post-Session AI Summary Generation...\n');

  const testSessionData = {
    exerciseName: 'Bench Press',
    duration: 180, // 3 minutes
    sets: [
      { setNumber: 1, reps: 10, weight: 135, fatigueLevel: 2 },
      { setNumber: 2, reps: 8, weight: 135, fatigueLevel: 3 },
      { setNumber: 3, reps: 6, weight: 135, fatigueLevel: 4 },
    ],
    safetyLog: [
      { priority: 'medium', cueText: 'Keep your shoulders back and down' },
      { priority: 'high', cueText: 'Control the descent' },
    ],
  };

  // Build prompt
  const setsStr = testSessionData.sets
    .map((set) => `- Set ${set.setNumber}, ${set.reps} reps @ ${set.weight}lbs, Fatigue: ${set.fatigueLevel}/5`)
    .join('\n');

  const safetyLogStr = testSessionData.safetyLog
    .map((log) => `- [${log.priority}] ${log.cueText}`)
    .join('\n');

  const prompt = `Analyze this workout session and provide a brief, personalized safety summary (3-4 sentences):

Exercise: ${testSessionData.exerciseName}
Duration: 3m 0s
Sets:
${setsStr}

Safety Cues Triggered:
${safetyLogStr}

Focus on:
1. Overall performance and form quality
2. Fatigue progression across sets
3. Specific safety concerns that arose
4. Actionable recommendations for next session

Provide a concise, encouraging summary that highlights both strengths and areas for improvement.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yourapp.com',
        'X-Title': 'Health & Fitness Tracker',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return false;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      console.error('❌ No summary generated');
      return false;
    }

    console.log('✅ Post-Session Summary Test: PASSED\n');
    console.log('Generated Summary:');
    console.log('─'.repeat(60));
    console.log(summary.trim());
    console.log('─'.repeat(60));
    return true;
  } catch (error) {
    console.error('❌ Post-Session Summary Test: FAILED');
    console.error('Error:', error.message);
    return false;
  }
}

async function testChatbotConversation() {
  console.log('\n🔍 Testing Chatbot Conversational AI...\n');

  const testMessage = 'I feel a bit tired today, should I still work out?';

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yourapp.com',
        'X-Title': 'Health & Fitness Chatbot',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a supportive fitness coach AI assistant. Be encouraging, concise, and helpful. Keep responses under 100 words.',
          },
          {
            role: 'user',
            content: testMessage,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return false;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      console.error('❌ No reply generated');
      return false;
    }

    console.log('✅ Chatbot Conversation Test: PASSED\n');
    console.log('User Message:', testMessage);
    console.log('─'.repeat(60));
    console.log('AI Response:', reply.trim());
    console.log('─'.repeat(60));
    return true;
  } catch (error) {
    console.error('❌ Chatbot Conversation Test: FAILED');
    console.error('Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Health & Fitness Module - AI Integration Test        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`API URL: ${OPENROUTER_API_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log(`API Key: ${OPENROUTER_API_KEY.substring(0, 20)}...`);
  console.log('\n');

  const test1 = await testPostSessionSummary();
  const test2 = await testChatbotConversation();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST RESULTS                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`Post-Session Summary: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Chatbot Conversation: ${test2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('\n');

  if (test1 && test2) {
    console.log('🎉 All tests passed! Your AI integration is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

runTests();
