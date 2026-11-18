import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  MCP_TOOLS,
  MCP_RESOURCES,
  handleMcpJsonRpc,
  assertSafeProjectFilePath,
} from '../src/routes/mcp.js';

test('MCP initialize returns protocol version, capabilities, and serverInfo', async () => {
  const res = await handleMcpJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' },
  });

  assert.ok(res);
  assert.equal(res.id, 1);
  assert.equal(res.result.protocolVersion, '2024-11-05');
  assert.equal(res.result.serverInfo.name, 'codehost-mcp-server');
  assert.ok(res.result.capabilities.tools);
  assert.ok(res.result.capabilities.resources);
});

test('MCP ping returns empty object and notifications return null', async () => {
  const pingRes = await handleMcpJsonRpc({ jsonrpc: '2.0', id: 'p1', method: 'ping' });
  assert.deepEqual(pingRes, { jsonrpc: '2.0', id: 'p1', result: {} });

  const notifRes = await handleMcpJsonRpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(notifRes, null);
});

test('MCP tools/list exposes all 10 deployment tools with valid schemas', async () => {
  const res = await handleMcpJsonRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.ok(res);
  assert.equal(res.result.tools.length, 10);
  assert.equal(MCP_TOOLS.length, 10);

  const expectedNames = [
    'codehost_login',
    'list_projects',
    'get_project',
    'create_project',
    'deploy_github',
    'write_project_files',
    'deploy_files',
    'get_project_logs',
    'control_project',
    'get_wallet_and_tiers',
  ];

  for (const expected of expectedNames) {
    const tool: any = res.result.tools.find((t: any) => t.name === expected);
    assert.ok(tool, `Tool ${expected} must be registered`);
    assert.equal(tool.inputSchema.type, 'object');
  }
});

test('MCP resources/list and resources/read return overview and tiers config', async () => {
  const listRes = await handleMcpJsonRpc({ jsonrpc: '2.0', id: 3, method: 'resources/list' });
  assert.ok(listRes);
  assert.equal(listRes.result.resources.length, MCP_RESOURCES.length);

  const tiersRes = await handleMcpJsonRpc({
    jsonrpc: '2.0',
    id: 4,
    method: 'resources/read',
    params: { uri: 'codehost://config/tiers' },
  });
  assert.ok(tiersRes);
  const parsed = JSON.parse(tiersRes.result.contents[0].text);
  assert.ok(parsed.tiers.free);
  assert.ok(parsed.tiers.basic);
  assert.ok(Array.isArray(parsed.creditPackages));
});

test('MCP tools/call rejects unauthenticated protected tool calls with isError: true', async () => {
  const res = await handleMcpJsonRpc({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'list_projects', arguments: {} },
  });

  assert.ok(res);
  assert.equal(res.result.isError, true);
  assert.ok(res.result.content[0].text.includes('Authentication required'));
});

test('assertSafeProjectFilePath rejects path traversal outside project root', async () => {
  const baseDir = path.resolve('storage/projects/test-project/source');
  await assert.rejects(
    () => assertSafeProjectFilePath(baseDir, '../etc/passwd'),
    /traversal outside project directory/
  );
  await assert.rejects(
    () => assertSafeProjectFilePath(baseDir, 'src/../../secret.env'),
    /traversal outside project directory/
  );

  const safe = await assertSafeProjectFilePath(baseDir, 'src/index.ts');
  assert.equal(safe, path.resolve(baseDir, 'src/index.ts'));
});
