import {
  getUsers,
  saveUser,
  validateUser,
  updateUserStatus,
  deleteUser,
} from '../lib/usersDb';
import {
  addMessage,
  getConversation,
  getUnreadCounts,
  toggleReaction,
  clearConversation,
  deleteAllMessagesForUser,
} from '../lib/messagesDb';
import {
  sendRequest,
  respondToRequest,
  getFriendsOf,
  getIncomingRequests,
  getSentRequests,
  areFriends,
  deleteAllRequestsForUser,
} from '../lib/requestsDb';

async function runQATests() {
  console.log('🧪 Starting Tomato Org QA Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${testName}`);
      failed++;
    }
  }

  // --- 1. USERS DB QA TESTS ---
  console.log('📌 1. Testing Users Database Layer');
  
  // Test User Creation
  const testUserA = `qa_test_user_a_${Date.now()}`;
  const testUserB = `qa_test_user_b_${Date.now()}`;

  const resA = saveUser(testUserA, '1234');
  assert(resA.success === true && resA.user?.username === testUserA, 'Save User A');

  const resB = saveUser(testUserB, '5678');
  assert(resB.success === true && resB.user?.username === testUserB, 'Save User B');

  // Duplicate User Protection
  const resDup = saveUser(testUserA, '0000');
  assert(resDup.success === false, 'Duplicate Username Protection');

  // Validate Credentials
  const valid = validateUser(testUserA, '1234');
  assert(valid !== null && valid.username === testUserA, 'Validate Valid Credentials');

  const invalid = validateUser(testUserA, 'wrong_pin');
  assert(invalid === null, 'Reject Invalid Credentials');

  // Update Status
  const statusUpdated = updateUserStatus(testUserA, 'Testing QA Status');
  assert(statusUpdated === true, 'Update User Status Message');

  // --- 2. FRIEND REQUESTS DB QA TESTS ---
  console.log('\n📌 2. Testing Friend Requests Layer');

  const reqRes = sendRequest(testUserA, testUserB);
  assert(reqRes.success === true && reqRes.request !== undefined, 'Send Friend Request (User A -> User B)');

  const reqDup = sendRequest(testUserA, testUserB);
  assert(reqDup.success === false, 'Prevent Duplicate Pending Request');

  const incoming = getIncomingRequests(testUserB);
  assert(incoming.some((r) => r.fromUser === testUserA), 'Fetch Incoming Requests for User B');

  const sent = getSentRequests(testUserA);
  assert(sent.some((r) => r.toUser === testUserB), 'Fetch Sent Requests for User A');

  // Accept Request
  if (incoming.length > 0) {
    const accepted = respondToRequest(incoming[0].id, 'accepted');
    assert(accepted === true, 'Accept Friend Request');
  }

  const friendsA = getFriendsOf(testUserA);
  const isFriends = areFriends(testUserA, testUserB);
  assert(isFriends && friendsA.includes(testUserB), 'Verify Mutual Friendship');

  // --- 3. MESSAGES DB QA TESTS ---
  console.log('\n📌 3. Testing Direct Messaging Layer');

  const msg1 = addMessage(testUserA, testUserB, 'Hello from QA test A!');
  assert(msg1.fromUser === testUserA && msg1.toUser === testUserB, 'Send DM Message 1');

  const msg2 = addMessage(testUserB, testUserA, 'Hello back from QA test B!');
  assert(msg2.fromUser === testUserB && msg2.toUser === testUserA, 'Send DM Message 2');

  // Unread Count Check for User B
  const unreadCountsB = getUnreadCounts(testUserB);
  assert(unreadCountsB[testUserA] >= 1, 'Unread Message Count for Recipient');

  // Read Conversation & Auto-Mark Read
  const conv = getConversation(testUserA, testUserB, testUserB);
  assert(conv.length >= 2, 'Retrieve Conversation');
  assert(conv.some((m) => m.id === msg1.id && m.read === true), 'Auto-Mark Incoming Message as Read');

  // Emoji Reactions
  const reacted = toggleReaction(msg1.id, testUserB, '👍');
  assert(
    reacted !== null &&
      reacted.reactions !== undefined &&
      reacted.reactions.some((r) => r.emoji === '👍' && r.users.includes(testUserB)),
    'Toggle Emoji Reaction'
  );

  // --- 4. CLEANUP QA TESTS ---
  console.log('\n📌 4. Testing Cleanup & User Deletion Cascade');

  // Clear Conversation
  clearConversation(testUserA, testUserB);
  const convAfterClear = getConversation(testUserA, testUserB);
  assert(convAfterClear.length === 0, 'Clear Conversation');

  // Delete User Cascade
  const deletedA = deleteUser(testUserA);
  deleteAllMessagesForUser(testUserA);
  deleteAllRequestsForUser(testUserA);

  const deletedB = deleteUser(testUserB);
  deleteAllMessagesForUser(testUserB);
  deleteAllRequestsForUser(testUserB);

  assert(deletedA && deletedB, 'Delete Test User Accounts');

  const postFriendsA = getFriendsOf(testUserA);
  assert(postFriendsA.length === 0, 'Cascade Delete Friend Requests');

  console.log(`\n📊 QA Test Results: ${passed} Passed, ${failed} Failed.`);
  if (failed === 0) {
    console.log('🎉 All QA tests passed successfully!');
  } else {
    process.exit(1);
  }
}

runQATests().catch((err) => {
  console.error('QA Test Runner Error:', err);
  process.exit(1);
});
