import { Sha256 } from '@aws-crypto/sha256-js'
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'
import { McpClient } from '@strands-agents/sdk'

export async function signedAwsFetch(signer: SignatureV4, input: string | URL | Request, init?: RequestInit) {
  const request = new Request(input, init)
  const url = new URL(request.url)
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : new Uint8Array(await request.arrayBuffer())
  const signed = await signer.sign(new HttpRequest({
    protocol: url.protocol, hostname: url.hostname, path: url.pathname,
    method: request.method, headers: { ...Object.fromEntries(request.headers), host: url.host }, body,
  }))
  return fetch(request.url, { method: request.method, headers: signed.headers, body, signal: request.signal })
}

export function createAwsMcp({ region, roleArn }: { region: string; roleArn: string }) {
  const signer = new SignatureV4({
    service: 'aws-mcp', region, sha256: Sha256,
    credentials: fromTemporaryCredentials({
      clientConfig: { region },
      params: { RoleArn: roleArn, RoleSessionName: 'haunted-investigation' },
    }),
  })
  return new McpClient({
    disableMcpInstrumentation: true,
    transport: new StreamableHTTPClientTransport(new URL(`https://aws-mcp.${region}.api.aws/mcp`), {
      fetch: (input, init) => signedAwsFetch(signer, input, init),
    }),
  })
}
