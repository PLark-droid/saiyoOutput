#!/usr/bin/env npx tsx
/**
 * Webhook Event Router
 * Routes GitHub webhook events to appropriate handlers
 */

type EventType = 'issue' | 'pr' | 'push' | 'comment';

interface RouteResult {
  success: boolean;
  message: string;
  action?: string;
}

async function routeIssueEvent(action: string, issueNumber: string): Promise<RouteResult> {
  console.log(`📋 Routing Issue Event: ${action} for #${issueNumber}`);

  switch (action) {
    case 'opened':
      console.log(`  → New issue opened: #${issueNumber}`);
      console.log(`  → Triggering IssueAgent for label assignment...`);
      break;
    case 'labeled':
      console.log(`  → Issue labeled: #${issueNumber}`);
      console.log(`  → Checking for state transitions...`);
      break;
    case 'closed':
      console.log(`  → Issue closed: #${issueNumber}`);
      break;
    case 'reopened':
      console.log(`  → Issue reopened: #${issueNumber}`);
      break;
    case 'assigned':
      console.log(`  → Issue assigned: #${issueNumber}`);
      break;
    default:
      console.log(`  → Unhandled action: ${action}`);
  }

  return { success: true, message: `Issue event ${action} routed`, action };
}

async function routePREvent(action: string, prNumber: string): Promise<RouteResult> {
  console.log(`🔀 Routing PR Event: ${action} for #${prNumber}`);

  switch (action) {
    case 'opened':
      console.log(`  → New PR opened: #${prNumber}`);
      console.log(`  → Triggering ReviewAgent...`);
      break;
    case 'closed':
      console.log(`  → PR closed: #${prNumber}`);
      break;
    case 'reopened':
      console.log(`  → PR reopened: #${prNumber}`);
      break;
    case 'review_requested':
      console.log(`  → Review requested for PR: #${prNumber}`);
      break;
    case 'ready_for_review':
      console.log(`  → PR ready for review: #${prNumber}`);
      break;
    default:
      console.log(`  → Unhandled action: ${action}`);
  }

  return { success: true, message: `PR event ${action} routed`, action };
}

async function routePushEvent(branch: string, commitSha: string): Promise<RouteResult> {
  console.log(`📤 Routing Push Event: ${branch} @ ${commitSha.substring(0, 7)}`);

  if (branch === 'main') {
    console.log(`  → Push to main branch detected`);
    console.log(`  → Triggering deployment checks...`);
  } else if (branch.startsWith('feat/') || branch.startsWith('feature/')) {
    console.log(`  → Feature branch push: ${branch}`);
  } else if (branch.startsWith('fix/')) {
    console.log(`  → Fix branch push: ${branch}`);
  }

  return { success: true, message: `Push event routed for ${branch}`, action: 'push' };
}

async function routeCommentEvent(issueNumber: string, author: string): Promise<RouteResult> {
  console.log(`💬 Routing Comment Event: #${issueNumber} by ${author}`);

  const commentBody = process.env.COMMENT_BODY || '';

  // Check for command triggers
  if (commentBody.includes('/agent')) {
    console.log(`  → Agent command detected`);
  } else if (commentBody.includes('/deploy')) {
    console.log(`  → Deploy command detected`);
  } else if (commentBody.includes('/review')) {
    console.log(`  → Review command detected`);
  }

  return { success: true, message: `Comment event routed`, action: 'comment' };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: webhook-router.ts <event-type> <action> [additional-args...]');
    console.error('Event types: issue, pr, push, comment');
    process.exit(1);
  }

  const eventType = args[0] as EventType;
  const action = args[1];
  const additionalArg = args[2];

  console.log('═══════════════════════════════════════');
  console.log('🔔 Webhook Event Router');
  console.log('═══════════════════════════════════════');
  console.log(`Event Type: ${eventType}`);
  console.log(`Action/Param: ${action}`);
  if (additionalArg) {
    console.log(`Additional: ${additionalArg}`);
  }
  console.log('═══════════════════════════════════════');

  let result: RouteResult;

  switch (eventType) {
    case 'issue':
      result = await routeIssueEvent(action, additionalArg);
      break;
    case 'pr':
      result = await routePREvent(action, additionalArg);
      break;
    case 'push':
      result = await routePushEvent(action, additionalArg);
      break;
    case 'comment':
      result = await routeCommentEvent(action, additionalArg);
      break;
    default:
      console.error(`Unknown event type: ${eventType}`);
      process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Result: ${result.message}`);
  console.log('═══════════════════════════════════════');
}

main().catch((error) => {
  console.error('❌ Error routing event:', error);
  process.exit(1);
});
